# Specification: Ref Resolution Rewrite

## 1. Summary
This specification outlines the architectural change to move data resolution (`__REF:path__`) from runtime client-side decorators to build-time/server-side story generation. This eliminates complex React Hook dependencies, improves reliability, and simplifies the browser runtime.

## 2. Motivation
*   **Current State**: References are resolved in the browser using a React Decorator (`withDesignbookData`). This has led to race conditions, React Hook errors (`Invalid hook call`), and complexity with asynchronous updates.
*   **Goal**: Ensure that Storybook receives fully resolved data structures as `args`, treating them as "static" content for the purpose of rendering.
*   **Benefits**:
    *   Zero runtime overhead for resolution.
    *   No improved React Hook complexity.
    *   Guaranteed data availability before component mount.
    *   Standard Storybook debugging (args show real values, not placeholders).

## 3. Architecture

### 3.1. Data Loading (Server-Side)
*   The `designbook-data-model` (storage) logic will run in the Node.js/Vite environment.
*   It loads all `data.json` files from the configured paths into a Global Data Object.

### 3.2. Dynamic Story Generation
*   **Input**: Entity Story definitions (e.g., `*.story.yml`) containing mapping nodes:
    ```yaml
    props:
      content:
        type: ref
        path: node.article.title
    ```
*   **Transformation**:
    *   A transformer intercepts the story loading process (likely within the Vite plugin or a custom loader).
    *   It traverses the story arguments.
    *   When it encounters a node with `type: ref` and a valid `path`, it consults the Global Data Object.
    *   It **replaces** the node in-place with the actual value (string, object, array, boolean).
*   **Output**: A standard Storybook story where `args` contain the final data:
    ```javascript
    args: {
      content: "My Resolved Article Title"
    }
    ```

### 3.3. Browser Runtime
*   **Decorator**: The `withDesignbookData` decorator is simplified or removed. It no longer resolves data.
*   **SDC / Twig**: The component receives standard data and renders immediately. No hydration or mutation phases are needed for data binding.

## 4. Implementation Plan

### Phase 1: Server-Side Resolution Logic
1.  Create a `RefResolver` utility in the addon's node context.
2.  Implement `resolveRef(path, context)` which returns the value from the loaded data model.

### Phase 2: Vite Plugin / Loader Integration
1.  Identify where `.story.yml` files are processed.
2.  Inject the resolution step *before* the story is converted to CSF (Component Story Format).
3.  Ensure that `storybook-addon-sdc` receives the *resolved* JSON structure.

### Phase 3: Cleanup
1.  Disable/Remove the client-side `__REF:` regex logic in `withDesignbookData.ts`.
2.  Remove `useArgs` dependency from the decorator.
3.  Ensure `refRenderer.js` (if strictly client-side) is no longer needed or is updated to handle only edge cases.

## 5. Mapping Example

**Source (`entity.story.yml`):**
```yaml
name: "Article Detail"
args:
  image:
    type: ref
    path: node.article.field_media
```

**Global Data (`data.json`):**
```json
{
  "node": {
    "article": {
      "field_media": {
        "src": "/img/cat.jpg",
        "alt": "A cat"
      }
    }
  }
}
```

**Transformed Story (`compiled.stories.js`):**
```javascript
export const ArticleDetail = {
  args: {
    image: {
      src: "/img/cat.jpg",
      alt: "A cat"
    }
  }
}
```

## 6. Constraints & Considerations
*   **Hot Module Replacement (HMR)**: Changes to `data.json` should trigger a rebuild/reload of the story. The Vite plugin needs to watch data files.
*   **Circular Dependencies**: Ensure paths do not create infinite resolution loops.
*   **Missing Data**: Define behavior for missing paths (e.g., return `null`, empty string, or `[missing: path]`).
