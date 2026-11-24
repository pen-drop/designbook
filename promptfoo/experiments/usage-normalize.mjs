/**
 * Map provider-native usage into phase metrics.
 * Missing / incomplete usage → { status: 'unknown' }, never coerce to 0.
 * cache_read and reasoning are subsets — not extra addends on a total that
 * already includes input+output.
 */

function isNonNegInt(n) {
  return Number.isSafeInteger(n) && n >= 0;
}

/**
 * @param {object|null|undefined} raw
 * @param {{ source: string, scope: string }} meta
 */
export function normalizeUsage(raw, { source, scope } = {}) {
  if (!raw || typeof raw !== "object") {
    return {
      status: "unknown",
      reason: "missing usage payload",
      usage_source: source ?? null,
      usage_scope: scope ?? null,
    };
  }

  const input = raw.input_tokens ?? raw.input;
  const cacheRead = raw.cached_input_tokens ?? raw.cache_read;
  const cacheWrite = raw.cache_write_input_tokens ?? raw.cache_write;
  const output = raw.output_tokens ?? raw.output;
  const reasoning = raw.reasoning_output_tokens ?? raw.reasoning_tokens;

  if (!isNonNegInt(input) || !isNonNegInt(output)) {
    return {
      status: "unknown",
      reason: "incomplete native counters",
      usage_source: source ?? null,
      usage_scope: scope ?? null,
    };
  }

  if (cacheRead !== undefined && !isNonNegInt(cacheRead)) {
    return {
      status: "unknown",
      reason: "invalid cache_read counter",
      usage_source: source ?? null,
      usage_scope: scope ?? null,
    };
  }
  if (isNonNegInt(cacheRead) && cacheRead > input) {
    return {
      status: "unknown",
      reason: "cache_read exceeds input",
      usage_source: source ?? null,
      usage_scope: scope ?? null,
    };
  }

  // Total = input + output. cache_read is a subset of input; reasoning is a
  // subset of output when present — never add them again on top.
  const total = input + output;

  return {
    status: "measured",
    input_tokens: input,
    cache_read: isNonNegInt(cacheRead) ? cacheRead : undefined,
    cache_write: isNonNegInt(cacheWrite) ? cacheWrite : undefined,
    output_tokens: output,
    reasoning_tokens: isNonNegInt(reasoning) ? reasoning : undefined,
    total_tokens: total,
    usage_source: source ?? null,
    usage_scope: scope ?? null,
  };
}

/**
 * Sum phase metrics. Parallel elapsed and summed active stay distinct.
 * @param {Array<{ metrics: object, durations?: { active_ms?: number, wall_ms?: number } }>} phases
 * @param {{ parallelElapsedMs?: number }} opts
 */
export function sumPhaseMetrics(phases, { parallelElapsedMs } = {}) {
  let summedActive = 0;
  let input = 0;
  let output = 0;
  let cacheRead = 0;
  let hasCache = false;
  let unknown = false;
  let unknownReason = null;

  for (const phase of phases || []) {
    const m = phase.metrics;
    if (!m || m.status !== "measured") {
      unknown = true;
      unknownReason = m?.reason || "phase usage unknown";
      continue;
    }
    input += m.input_tokens;
    output += m.output_tokens;
    if (isNonNegInt(m.cache_read)) {
      cacheRead += m.cache_read;
      hasCache = true;
    }
    const active = phase.durations?.active_ms;
    if (isNonNegInt(active)) summedActive += active;
  }

  const tokens = unknown
    ? {
        status: "unknown",
        reason: unknownReason,
      }
    : {
        status: "measured",
        input_tokens: input,
        output_tokens: output,
        cache_read: hasCache ? cacheRead : undefined,
        total_tokens: input + output,
      };

  return {
    tokens,
    summed_active_ms: summedActive,
    parallel_elapsed_ms: isNonNegInt(parallelElapsedMs)
      ? parallelElapsedMs
      : null,
  };
}

/**
 * Savings verdict helper. Early abort / skipped verify / unknown → not improved.
 * @returns {'improved'|'held'|'regressed'|'unclear'|'not_evaluable'}
 */
export function savingsVerdict(baseline, candidate, _dimension = "tokens") {
  if (!baseline || !candidate) return "not_evaluable";
  if (baseline.status !== "measured" || candidate.status !== "measured") {
    return "not_evaluable";
  }
  if (candidate.aborted || candidate.verify_skipped) {
    return "not_evaluable";
  }
  if (baseline.aborted || baseline.verify_skipped) {
    return "unclear";
  }

  const b = baseline.total_tokens;
  const c = candidate.total_tokens;
  if (!isNonNegInt(b) || !isNonNegInt(c)) return "not_evaluable";
  if (c < b) return "improved";
  if (c === b) return "held";
  return "regressed";
}
