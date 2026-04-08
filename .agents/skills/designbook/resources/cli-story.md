# CLI: story

Manages story entities — load, create, list stories, and generate workflow-ready checks.

## `story` (load by scene)

Load a story entity by scene reference.

```bash
 story --scene <group>:<name>
```

**Response:**
```json
{
  "storyId": "designbook-design-system-scenes--shell",
  "scene": "design-system:shell",
  "storyDir": "/abs/path/to/story/dir",
  "url": "http://localhost:6006/iframe.html?id=designbook-design-system-scenes--shell&viewMode=story",
  "filePath": "/abs/path/to/story/dir"
}
```

## `story --create` (create by scene)

Create story directory + `meta.yml` if missing, then load.

```bash
 story --scene <group>:<name> --create [--json '<meta-seed>']
```

| Option | Description |
|---|---|
| `--create` | Create dir + meta.yml if missing |
| `--json <data>` | JSON data to merge into meta.yml (e.g. reference source) |

**Response:** Same as load, but creates the story first if it doesn't exist.

## `story --section` (list by section)

List all stories in a section.

```bash
 story --section <name> [--checks-open]
```

| Option | Description |
|---|---|
| `--section <name>` | Section name |
| `--checks-open` | Filter checks to only open (result != pass) |

**Response:** JSON array of story objects.

## `story check` (update check result)

Write a single check result to `reference.checks` in `meta.yml`. Automatically recomputes `reference.summary`.

```bash
 story check --scene <group>:<name> --json '{"breakpoint":"sm","region":"header","status":"pass","diff":1.2}'
 story check --scene <group>:<name> --json '{"breakpoint":"sm","region":"markup","status":"fail","issues":["missing logo","wrong font"]}'
```

| Field | Type | Description |
|---|---|---|
| `breakpoint` | string | Breakpoint name (e.g. `sm`, `xl`) |
| `region` | string | Region name (e.g. `header`, `full`, `markup`) |
| `status` | `"pass"` \| `"fail"` | Check verdict |
| `diff` | number | Diff percentage (optional, typically for screenshot checks) |
| `issues` | string[] | List of issues found (optional, typically for markup checks) |

The check key in `meta.yml` is `breakpoint--region` (e.g. `sm--header`, `xl--markup`).

**Response:** `{ "ok": true, "breakpoint": "sm", "region": "header", "status": "pass", "diff": 1.2 }`

**Errors (exit 1):**
- `--scene` not provided
- `--json` not provided or missing required fields (`breakpoint`, `region`, `status`)
- Scene not found or no story exists

## `story checks` (workflow-ready checks)

Generate a workflow-ready checks array for a scene. Validates that a reference exists.

```bash
 story --scene <group>:<name> checks
 story --scene <group>:<name> --create --json '<meta-seed>' checks
 story --scene <group>:<name> --checks-open checks
```

| Option | Description |
|---|---|
| `--checks-open` | Filter to only open checks (result != pass) |
| `--create` | Create story first if missing |
| `--json <data>` | JSON meta seed for `--create` |

**Response:**
```json
[
  { "storyId": "designbook-design-system-scenes--shell", "breakpoint": "sm", "region": "header", "threshold": 3 },
  { "storyId": "designbook-design-system-scenes--shell", "breakpoint": "xl", "region": "footer", "threshold": 3 }
]
```

**Errors (exit 1):**
- `--scene` not provided
- Scene not found or story could not be created
- No reference configured (provide via `--create --json`)
- No checks generated (check breakpoints/regions in meta.yml)
