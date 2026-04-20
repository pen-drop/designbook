# Extract-Reference: URL-basierter Cache

## Goal

Move extract-reference output from workflow-scoped storage (`$CHANGES_DIR` / data results) to a persistent, URL-based cache directory. Each unique URL gets its own directory under `$DESIGNBOOK_DATA/references/`, identified by a hash. This enables reuse across workflows and provides a clean separation of reference data from story data.

## Current State

- Screenshots go to `$CHANGES_DIR` (workflow-temporary)
- `DesignReference` is returned as a data result in workflow scope
- Downstream tasks read `design_reference` from scope
- No persistence between workflows — same URL gets re-extracted every time

## Design

### Storage Structure

```
$DESIGNBOOK_DATA/references/
  <hash>/                          # SHA-256 of normalized URL, first 12 chars
    extract.json                   # Full DesignReference JSON
    reference-full.png             # Full-page screenshot (1440x1600)
    reference-header.png           # Header region (optional)
    reference-footer.png           # Footer region (optional)
```

### URL Normalization

Before hashing:
1. Lowercase
2. Remove trailing slash
3. Keep query strings (different params = different pages)

### Hash Calculation

```bash
echo -n "<normalized-url>" | sha256sum | cut -c1-12
```

The `source` field in `extract.json` contains the original URL, so the hash can always be resolved back.

### extract-reference Task Flow

1. **Resolve URL** — from `vision.md` or user input (unchanged)
2. **Compute hash** — normalize URL, SHA-256, first 12 chars
3. **Reuse check** — if `$DESIGNBOOK_DATA/references/<hash>/extract.json` exists:
   - Ask user: "Extraktion von `<url>` existiert bereits (extrahiert am `<date>`). Wiederverwenden oder neu extrahieren?"
   - Reuse: read existing `extract.json`, build results, done
   - Re-extract: proceed to step 4
4. **Extract** — screenshots + Playwright + Vision as before, but output to `$DESIGNBOOK_DATA/references/<hash>/` instead of `$CHANGES_DIR`
5. **Return results:**
   - `reference_dir` (string) — path to hash directory
   - `reference[]` (array) — URL, type, threshold, title (unchanged)
   - `screenshot` (string) — path to `reference-full.png` in hash directory

### extract-reference Result Schema

```yaml
result:
  reference_dir:
    type: string
  reference:
    type: array
    items:
      $ref: ../schemas.yml#/Reference
  screenshot:
    type: string
```

The `design_reference` data result is removed entirely. Downstream reads `extract.json` from the file system.

### extract.json Content

Identical to the existing `DesignReference` schema. No schema changes — only the transport changes (data result to file).

## Downstream Changes

Tasks that currently read `design_reference` from workflow scope must switch to file-based reads via `$reference_dir`:

| Task | Current | New |
|------|---------|-----|
| `intake--design-component.md` | reads `design_reference` from scope | `reads:` on `$reference_dir/extract.json` |
| `intake--design-shell.md` | reads `design_reference` from scope | `reads:` on `$reference_dir/extract.json` |
| `intake--design-screen.md` | reads `design_reference` from scope | `reads:` on `$reference_dir/extract.json` |
| `create-tokens.md` | reads `design_reference` from scope | `reads:` on `$reference_dir/extract.json` |
| `create-scene.md` | reads `screenshot` from scope | `screenshot` result now points to `$reference_dir/reference-full.png` — no logic change, just different path |

### Not Affected

- `create-component.md` — reads `design_hint` from intake, not from extract-reference directly
- Compare/capture/triage/polish tasks — work with screenshots, not DesignReference
- Workflow definitions — stages and step names remain unchanged
- `DesignReference` and `DesignHint` schemas — unchanged
