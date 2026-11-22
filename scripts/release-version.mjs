#!/usr/bin/env node
// `release-version.mjs <ref> [--notes <file>|-]`: the next version and its release notes from the
// Conventional Commits between the last v<semver> tag reachable from <ref> and <ref>. Prints the
// version, or nothing (exit 0) when <ref> is already in a v<semver> tag or the range holds no feat,
// fix or breaking commit. `--notes -` prints the notes after the version on stdout. The `release`
// CI job tags <ref> with it; the deploy-and-release recipe runs it as the plan's dry run. Writes
// nothing to the repository.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const [ref, flag, notesFile] = process.argv.slice(2);
if (!ref || (flag && (flag !== '--notes' || !notesFile))) {
  console.error('usage: release-version.mjs <ref> [--notes <file>|-]');
  process.exit(2);
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

const semverTag = (t) => /^v\d+\.\d+\.\d+$/.test(t);
// A ref already released, even below a newer tag, releases nothing.
if (git('tag', '--contains', ref, '--list', 'v*').split('\n').some(semverTag))
  process.exit(0);

const tag = git('tag', '--merged', ref, '--sort=-v:refname', '--list', 'v*')
  .split('\n')
  .find(semverTag);
// All commits, not first-parent: squash commits are the second parents of develop's merges.
const log = git(
  'log',
  '--format=%H%x1f%s%x1f%b%x1e',
  tag ? `${tag}..${ref}` : ref,
);

const sections = { breaking: [], feat: [], fix: [] };
for (const entry of log.split('\x1e')) {
  const [sha, subject, body] = entry.trim().split('\x1f');
  // Non-conventional subjects (GitLab's `Merge branch …`) do not match.
  const m = subject?.match(/^(\w+)(?:\(([^)]+)\))?(!)?: (.+)$/);
  if (!m) continue;
  const [, type, scope, bang, text] = m;
  const breaking = bang || /^BREAKING[ -]CHANGE:/m.test(body ?? '');
  const key = breaking ? 'breaking' : type;
  if (sections[key]) sections[key].push({ sha, scope, text });
}

let [major, minor, patch] = (tag?.slice(1) ?? '0.0.0').split('.').map(Number);
if (sections.breaking.length && major > 0)
  [major, minor, patch] = [major + 1, 0, 0];
// Below 1.0 a breaking change bumps minor, like a feature.
else if (sections.breaking.length || sections.feat.length)
  [minor, patch] = [minor + 1, 0];
else if (sections.fix.length) patch += 1;
else process.exit(0);
const version = `${major}.${minor}.${patch}`;

let notes;
if (notesFile) {
  const url = projectUrl();
  const commitPath = 'commit';
  const heading = tag
    ? `[${version}](${url}/compare/${tag}...v${version})`
    : version;
  const lines = [`## ${heading} (${new Date().toISOString().slice(0, 10)})`];
  for (const [key, title] of [
    ['breaking', '⚠ Breaking Changes'],
    ['feat', 'Features'],
    ['fix', 'Bug Fixes'],
  ]) {
    if (!sections[key].length) continue;
    lines.push('', `### ${title}`, '');
    for (const { sha, scope, text } of sections[key])
      lines.push(
        `* ${scope ? `**${scope}:** ` : ''}${text} ([${sha.slice(0, 7)}](${url}/${commitPath}/${sha}))`,
      );
  }
  notes = `${lines.join('\n')}\n`;
}
console.log(version);
// One stream for `-`: reopening /dev/stdout truncates a redirected file.
if (notesFile === '-') process.stdout.write(notes);
else if (notesFile) writeFileSync(notesFile, notes);

function projectUrl() {
  if (process.env.GITHUB_REPOSITORY)
    return `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${process.env.GITHUB_REPOSITORY}`;
  const remote = git('remote', 'get-url', 'origin');
  return remote
    .replace(/^git@([^:]+):/, 'https://$1/')
    .replace(/^https:\/\/[^@/]+@/, 'https://')
    .replace(/\.git$/, '');
}
