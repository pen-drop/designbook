# Spec: Scene Handler Registry

## Purpose

Declarative registry mapping file patterns to scene handler configurations. Lives in a dedicated file for extensibility.

## Interface

```typescript
export interface SceneHandler {
  /** Glob-like suffix to match (e.g., '.scenes.yml') */
  pattern: string;
  /** Scene type: 'canvas' renders stories, 'docs' renders docs page */
  type: 'canvas';
  /** If filename starts with this prefix, also generate a docs page */
  docsWhenPrefix?: string;
  /** Component name for docs page rendering */
  docsComponent?: string;
}
```

## Default Registry

```typescript
export const defaultHandlers: SceneHandler[] = [
  {
    pattern: '.scenes.yml',
    type: 'canvas',
    docsWhenPrefix: 'spec.',
    docsComponent: 'DeboSection',
  },
];
```

## Matching Logic

```typescript
export function matchHandler(filename: string, handlers: SceneHandler[]): {
  handler: SceneHandler;
  hasDocs: boolean;
} | null;
```

- Match by `filename.endsWith(handler.pattern)`
- Set `hasDocs = true` if `basename(filename).startsWith(handler.docsWhenPrefix)`
- Return first match or null

## File

`src/renderer/scene-handlers.ts`
