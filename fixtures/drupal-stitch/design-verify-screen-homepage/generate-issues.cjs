#!/usr/bin/env node
/**
 * Diff extraction JSONs and generate draft issues for critical/major differences.
 * Usage: node generate-issues.cjs <breakpoint>
 */

const fs = require('fs');
const path = require('path');

const STORY_DIR = 'designbook/stories/designbook-homepage-scenes--landing';
const EXTRACTIONS_DIR = path.join(STORY_DIR, 'extractions');
const ISSUES_DIR = path.join(STORY_DIR, 'issues', 'draft');

/**
 * Parse a CSS numeric value to a number for comparison.
 * Returns null if not parseable.
 */
function parseNumericValue(val) {
  if (!val) return null;
  const match = val.match(/^(-?[\d.]+)(px|rem|em|%|vw|vh)?$/);
  if (match) return parseFloat(match[1]);
  return null;
}

/**
 * Normalize color to comparable form.
 * Handles rgb, rgba, oklab, hex differences.
 */
function normalizeColor(val) {
  if (!val) return null;
  // Return as-is for comparison — we compare the raw computed strings
  return val.trim();
}

/**
 * Determine if two values differ enough to be an issue.
 * Returns { severity, description } or null if no issue.
 */
function evaluateDiff(property, refVal, sbVal, label) {
  if (refVal === sbVal) return null;
  if (!refVal || !sbVal) {
    // One is null/empty — if ref exists but sb doesn't, that's critical
    if (refVal && !sbVal) {
      return { severity: 'critical', description: `${label}: ${property} missing in Storybook (expected: ${refVal})` };
    }
    return null;
  }

  // Color comparison — different color spaces (rgb vs oklab) are expected
  // We flag only if RGB values differ significantly
  if (property.toLowerCase().includes('color') || property === 'backgroundColor') {
    const refRgb = parseRgb(refVal);
    const sbRgb = parseRgb(sbVal);
    if (refRgb && sbRgb) {
      const maxDiff = Math.max(
        Math.abs(refRgb.r - sbRgb.r),
        Math.abs(refRgb.g - sbRgb.g),
        Math.abs(refRgb.b - sbRgb.b)
      );
      const alphaDiff = Math.abs((refRgb.a ?? 1) - (sbRgb.a ?? 1));
      if (maxDiff <= 5 && alphaDiff < 0.05) return null; // Minor rounding
      if (maxDiff > 30 || alphaDiff > 0.2) {
        return { severity: 'major', description: `${label}: ${property} — reference: ${refVal}, storybook: ${sbVal}` };
      }
      // Medium diff — still report as major
      if (maxDiff > 10) {
        return { severity: 'major', description: `${label}: ${property} — reference: ${refVal}, storybook: ${sbVal}` };
      }
      return null; // Minor
    }
    // Different color spaces — check if both are "transparent" or same-ish
    if (refVal.includes('0, 0, 0, 0') && sbVal.includes('0, 0, 0, 0')) return null;
    // Can't compare oklab vs rgb easily, flag if they look very different
    if (refVal.startsWith('rgb') && sbVal.startsWith('oklab')) {
      // This is a color space representation difference — flag as major if values look very different
      return { severity: 'major', description: `${label}: ${property} — different color spaces: reference: ${refVal}, storybook: ${sbVal}` };
    }
    if (refVal !== sbVal) {
      return { severity: 'major', description: `${label}: ${property} — reference: ${refVal}, storybook: ${sbVal}` };
    }
    return null;
  }

  // Numeric comparison (fontSize, padding, etc.)
  const refNum = parseNumericValue(refVal);
  const sbNum = parseNumericValue(sbVal);
  if (refNum !== null && sbNum !== null) {
    const diff = Math.abs(refNum - sbNum);
    const pctDiff = refNum !== 0 ? (diff / Math.abs(refNum)) * 100 : diff * 100;
    if (diff <= 1) return null; // Minor rounding (1px)
    if (diff <= 2) return null; // Minor (2px tolerance)
    if (pctDiff > 20 || diff > 8) {
      return { severity: 'critical', description: `${label}: ${property} — expected ${refVal}, got ${sbVal} (${diff > 0 ? '+' : ''}${(sbNum - refNum).toFixed(1)}px)` };
    }
    if (pctDiff > 10 || diff > 4) {
      return { severity: 'major', description: `${label}: ${property} — expected ${refVal}, got ${sbVal}` };
    }
    return null; // Minor diff
  }

  // String comparison (display, position, fontFamily, etc.)
  if (refVal !== sbVal) {
    // FontFamily: normalize
    const refFF = refVal.replace(/"/g, '').replace(/,\s*/g, ', ').trim();
    const sbFF = sbVal.replace(/"/g, '').replace(/,\s*/g, ', ').trim();
    if (refFF === sbFF) return null;

    // gridTemplateColumns: sub-pixel diffs are ok
    if (property === 'gridTemplateColumns') {
      const refCols = refVal.match(/[\d.]+/g);
      const sbCols = sbVal.match(/[\d.]+/g);
      if (refCols && sbCols && refCols.length === sbCols.length) {
        const maxColDiff = Math.max(...refCols.map((r, i) => Math.abs(parseFloat(r) - parseFloat(sbCols[i]))));
        if (maxColDiff < 5) return null;
      }
      // Different column count
      if (refCols && sbCols && refCols.length !== sbCols.length) {
        return { severity: 'critical', description: `${label}: ${property} — column count differs: ${refCols.length} vs ${sbCols.length}` };
      }
    }

    // position: fixed vs sticky is a significant diff
    if (property === 'position') {
      return { severity: 'major', description: `${label}: ${property} — expected ${refVal}, got ${sbVal}` };
    }

    // display change is critical
    if (property === 'display') {
      return { severity: 'critical', description: `${label}: ${property} — expected ${refVal}, got ${sbVal}` };
    }

    // fontWeight: 900 vs 700 is significant
    if (property === 'fontWeight') {
      const diff = Math.abs(parseInt(refVal) - parseInt(sbVal));
      if (diff >= 200) {
        return { severity: 'major', description: `${label}: ${property} — expected ${refVal}, got ${sbVal}` };
      }
      if (diff >= 100) {
        return { severity: 'major', description: `${label}: ${property} — expected ${refVal}, got ${sbVal}` };
      }
      return null;
    }

    return { severity: 'major', description: `${label}: ${property} — expected ${refVal}, got ${sbVal}` };
  }

  return null;
}

/**
 * Parse rgb/rgba string into components.
 */
function parseRgb(val) {
  const match = val.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match) {
    return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]), a: match[4] ? parseFloat(match[4]) : 1 };
  }
  return null;
}

function main() {
  const bp = process.argv[2];
  if (!bp) {
    console.error('Usage: node generate-issues.cjs <breakpoint>');
    process.exit(1);
  }

  const refPath = path.join(EXTRACTIONS_DIR, `${bp}--reference.json`);
  const sbPath = path.join(EXTRACTIONS_DIR, `${bp}--storybook.json`);

  const refData = JSON.parse(fs.readFileSync(refPath, 'utf8'));
  const sbData = JSON.parse(fs.readFileSync(sbPath, 'utf8'));

  const issues = [];

  for (const [key, refEntry] of Object.entries(refData)) {
    const sbEntry = sbData[key];
    if (!sbEntry) continue;

    // If either styles is null, check if both are null
    if (!refEntry.styles && !sbEntry.styles) continue;
    if (refEntry.styles && !sbEntry.styles) {
      // Storybook selector didn't match — critical for each property
      for (const prop of Object.keys(refEntry.styles)) {
        issues.push({
          source: 'extraction',
          severity: 'critical',
          check: `${bp}--markup`,
          label: refEntry.label,
          category: refEntry.category,
          property: prop,
          expected: refEntry.styles[prop],
          actual: null,
          description: `${refEntry.label}: selector not found in Storybook — cannot compare ${prop} (expected: ${refEntry.styles[prop]})`,
          file_hint: refEntry.file_hint,
        });
      }
      continue;
    }
    if (!refEntry.styles && sbEntry.styles) continue; // Reference missing is not actionable

    // Compare each property
    for (const [prop, refVal] of Object.entries(refEntry.styles)) {
      const sbVal = sbEntry.styles[prop];
      const result = evaluateDiff(prop, refVal, sbVal, refEntry.label);
      if (result && (result.severity === 'critical' || result.severity === 'major')) {
        issues.push({
          source: 'extraction',
          severity: result.severity,
          check: `${bp}--markup`,
          label: refEntry.label,
          category: refEntry.category,
          property: prop,
          expected: refVal,
          actual: sbVal || null,
          description: result.description,
          file_hint: refEntry.file_hint,
        });
      }
    }
  }

  // Write issues
  fs.mkdirSync(ISSUES_DIR, { recursive: true });
  const issuesPath = path.join(ISSUES_DIR, `${bp}--diff.json`);
  fs.writeFileSync(issuesPath, JSON.stringify(issues, null, 2));

  console.log(`${bp}: ${issues.length} issues found`);
  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const majorCount = issues.filter(i => i.severity === 'major').length;
  console.log(`  Critical: ${criticalCount}, Major: ${majorCount}`);

  // Summary by label
  const byLabel = {};
  for (const issue of issues) {
    if (!byLabel[issue.label]) byLabel[issue.label] = [];
    byLabel[issue.label].push(`${issue.property} (${issue.severity})`);
  }
  for (const [label, props] of Object.entries(byLabel)) {
    console.log(`  ${label}: ${props.join(', ')}`);
  }
}

main();
