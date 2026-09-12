import type { DataModel } from './types';

export function titleCaseBundle(bundle: string): string {
  return bundle
    .split(/[_-]/)
    .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : p))
    .join(' ');
}

export function namespaceFor(dataModel: DataModel, entityType: string, bundle: string): 'content' | 'config' | null {
  if (dataModel.content?.[entityType]?.[bundle]) return 'content';
  if (dataModel.config?.[entityType]?.[bundle]) return 'config';
  return null;
}

export function entityStoryGroup(
  dataModel: DataModel,
  entity_type: string,
  bundle: string,
): { title: string; isConfig: boolean } {
  const isConfig = namespaceFor(dataModel, entity_type, bundle) === 'config';
  const top = isConfig ? 'Config' : 'Entities';
  const leaf = isConfig ? bundle : titleCaseBundle(bundle);
  return { title: `${top}/${entity_type}/${leaf}`, isConfig };
}

/** Story NAME of a form-mode story — matches preset.ts indexForm. */
export function formStoryName(form_mode: string): string {
  return `${form_mode} (form)`;
}
