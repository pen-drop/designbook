/** Revision-side approval.yml gate beside a published capture. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { dump as dumpYaml, load as parseYaml } from 'js-yaml';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

/** Scope dimensions a need may require and an approval may cover. */
export interface ApprovalScope {
  subjects: string[];
  states: string[];
  views?: string[];
  breakpoints?: string[];
}

export type NeedScope = ApprovalScope;

export interface ReferenceApproval {
  status: ApprovalStatus;
  /** sha256 hex of canonical JSON.stringify of publication.json `files` (sorted keys). */
  fingerprint: string;
  scope: ApprovalScope;
  decided_at?: string;
  note?: string;
}

export interface ApprovalCheckResult {
  ok: boolean;
  reason?: string;
}

export interface WriteApprovalInput {
  status: ApprovalStatus;
  scope: ApprovalScope;
  note?: string;
}

const APPROVAL_FILE = 'approval.yml';
const PUBLICATION_FILE = 'publication.json';

function sortedFilesMap(files: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)));
}

/** Revision content seal: hash of the sorted publication `files` map only. */
export function publicationFilesFingerprint(files: Record<string, string>): string {
  return createHash('sha256')
    .update(JSON.stringify(sortedFilesMap(files)))
    .digest('hex');
}

function readPublicationFiles(revisionDir: string): Record<string, string> {
  const publicationPath = join(revisionDir, PUBLICATION_FILE);
  if (!existsSync(publicationPath)) throw new Error(`Missing ${PUBLICATION_FILE} in ${revisionDir}`);
  const publication = JSON.parse(readFileSync(publicationPath, 'utf8')) as { files?: unknown };
  if (!publication.files || typeof publication.files !== 'object' || Array.isArray(publication.files))
    throw new Error(`${PUBLICATION_FILE}: expected a files map`);
  return publication.files as Record<string, string>;
}

function assertScope(scope: ApprovalScope, label: string): void {
  if (!Array.isArray(scope.subjects) || !scope.subjects.length)
    throw new Error(`${label}: subjects must be a nonempty array`);
  if (!Array.isArray(scope.states) || !scope.states.length)
    throw new Error(`${label}: states must be a nonempty array`);
  if (scope.views !== undefined && (!Array.isArray(scope.views) || !scope.views.length))
    throw new Error(`${label}: views must be a nonempty array when present`);
  if (scope.breakpoints !== undefined && (!Array.isArray(scope.breakpoints) || !scope.breakpoints.length))
    throw new Error(`${label}: breakpoints must be a nonempty array when present`);
}

function covers(need: string[], approved: string[] | undefined, dimension: string): string | undefined {
  if (!approved) return `scope: approval missing ${dimension} required by need`;
  const set = new Set(approved);
  const missing = need.filter((entry) => !set.has(entry));
  if (missing.length) return `scope: approval ${dimension} does not cover ${missing.join(', ')}`;
  return undefined;
}

function scopeCoverReason(needScope: NeedScope, approvalScope: ApprovalScope): string | undefined {
  return (
    covers(needScope.subjects, approvalScope.subjects, 'subjects') ??
    covers(needScope.states, approvalScope.states, 'states') ??
    (needScope.views ? covers(needScope.views, approvalScope.views, 'views') : undefined) ??
    (needScope.breakpoints ? covers(needScope.breakpoints, approvalScope.breakpoints, 'breakpoints') : undefined)
  );
}

export function readApproval(revisionDir: string): ReferenceApproval | null {
  const path = join(revisionDir, APPROVAL_FILE);
  if (!existsSync(path)) return null;
  const raw = parseYaml(readFileSync(path, 'utf8'));
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`${APPROVAL_FILE}: expected a mapping`);
  return raw as ReferenceApproval;
}

export function writeApproval(revisionDir: string, input: WriteApprovalInput): ReferenceApproval {
  assertScope(input.scope, 'approval.scope');
  if (input.status !== 'pending' && input.status !== 'approved' && input.status !== 'rejected')
    throw new Error(`approval.status: expected pending|approved|rejected`);
  const fingerprint = publicationFilesFingerprint(readPublicationFiles(revisionDir));
  const record: ReferenceApproval = {
    status: input.status,
    fingerprint,
    scope: {
      subjects: [...input.scope.subjects],
      states: [...input.scope.states],
      ...(input.scope.views ? { views: [...input.scope.views] } : {}),
      ...(input.scope.breakpoints ? { breakpoints: [...input.scope.breakpoints] } : {}),
    },
  };
  if (input.status === 'approved' || input.status === 'rejected') record.decided_at = new Date().toISOString();
  if (input.note !== undefined) record.note = input.note;
  writeFileSync(join(revisionDir, APPROVAL_FILE), dumpYaml(record, { lineWidth: -1, sortKeys: true }));
  return record;
}

export function checkApproval(revisionDir: string, needScope: NeedScope): ApprovalCheckResult {
  assertScope(needScope, 'need.scope');
  const approval = readApproval(revisionDir);
  if (!approval) return { ok: false, reason: 'approval.yml missing' };
  if (approval.status !== 'approved') return { ok: false, reason: `status: ${approval.status}` };
  let expected: string;
  try {
    expected = publicationFilesFingerprint(readPublicationFiles(revisionDir));
  } catch (error) {
    return { ok: false, reason: (error as Error).message };
  }
  if (approval.fingerprint !== expected)
    return { ok: false, reason: 'fingerprint: approval does not match publication files seal' };
  if (!approval.scope || typeof approval.scope !== 'object')
    return { ok: false, reason: 'scope: approval missing scope' };
  const cover = scopeCoverReason(needScope, approval.scope);
  if (cover) return { ok: false, reason: cover };
  return { ok: true };
}
