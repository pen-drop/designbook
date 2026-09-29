/**
 * Pure Visual Compare model shared by the manager menu and the preview decorator.
 * Both sides select one exact published capture tuple (subject/view/state).
 */

export interface VisualCompareStory {
  reference?: string | null;
  referenceDir?: string | null;
  elements?: Array<{ id: string; selector: string }>;
  referenceElements?: Array<{ id: string; views: Array<{ id: string; width: number; height: number }> }>;
  referenceCaptures?: Array<{ subject: string; view: string; state: string; path: string }>;
}

export interface MenuView {
  id: string;
  width: number;
  height: number;
  states: Array<{ name: string; subjects: string[] }>;
}

export type MenuModel =
  | { kind: 'hidden' }
  | { kind: 'message'; text: string }
  | { kind: 'error'; text: string }
  | { kind: 'ok'; views: MenuView[] };

/** Map a `/__designbook/story/{id}` response (status 0 = network failure) to what the menu shows. */
export function menuModel(status: number, body: unknown): MenuModel {
  const data = (body ?? {}) as VisualCompareStory & { error?: string; meta?: boolean };
  if (status === 409) return { kind: 'error', text: `Bound reference ${data.reference} is not a published revision` };
  if (status === 500) return { kind: 'error', text: `Reference could not be loaded: ${data.error ?? 'unknown error'}` };
  if (status === 0) return { kind: 'error', text: 'Story metadata request failed (network error)' };
  if (status !== 200) return { kind: 'error', text: `Story metadata request failed (HTTP ${status})` };
  if (data.meta === false) return { kind: 'hidden' };
  if (!data.reference) return { kind: 'message', text: 'No reference bound' };

  const sizes = new Map<string, { width: number; height: number }>();
  for (const element of data.referenceElements ?? [])
    for (const view of element.views) if (!sizes.has(view.id)) sizes.set(view.id, view);

  const views = new Map<string, MenuView>();
  for (const capture of data.referenceCaptures ?? []) {
    const size = sizes.get(capture.view) ?? { width: 0, height: 0 };
    if (!views.has(capture.view))
      views.set(capture.view, { id: capture.view, width: size.width, height: size.height, states: [] });
    const view = views.get(capture.view)!;
    let state = view.states.find((s) => s.name === capture.state);
    if (!state) view.states.push((state = { name: capture.state, subjects: [] }));
    if (!state.subjects.includes(capture.subject)) state.subjects.push(capture.subject);
  }
  if (views.size === 0) return { kind: 'message', text: 'No captures in this reference' };
  return { kind: 'ok', views: [...views.values()].sort((a, b) => a.width - b.width) };
}

export interface CaptureOverlay {
  name: string;
  selector: string;
  path: string;
}

/** The captures of exactly one view/state; no state means no overlay (never a silent default). */
export function capturesFor(story: VisualCompareStory, view: string, state: string | null): CaptureOverlay[] {
  if (!state) return [];
  const selectors = new Map((story.elements ?? []).map((el) => [el.id, el.selector]));
  return (story.referenceCaptures ?? [])
    .filter((capture) => capture.view === view && capture.state === state)
    .map((capture) => ({ name: capture.subject, selector: selectors.get(capture.subject) ?? '', path: capture.path }));
}
