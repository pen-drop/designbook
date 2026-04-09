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
| `--checks-open` | Filter checks to only open (status != done) |

**Response:** JSON array of story objects.

## `story check` (create/update check)

Write a check entry to `reference.checks` in `meta.yml`. Automatically recomputes `reference.summary`. Preserves existing issues on the check.

```bash
 story check --scene <group>:<name> --json '{"breakpoint":"sm","region":"header","status":"open"}'
 story check --scene <group>:<name> --json '{"breakpoint":"sm","region":"header","status":"done","result":"pass"}'
```

| Field | Type | Description |
|---|---|---|
| `breakpoint` | string | Breakpoint name (e.g. `sm`, `xl`) |
| `region` | string | Region name (e.g. `header`, `full`, `markup`) |
| `status` | `"open"` \| `"done"` | Check lifecycle status |
| `result` | `"pass"` \| `"fail"` | Check verdict (set by verify, omit while open) |
| `diff` | number | Diff percentage (optional, typically for screenshot checks) |

The check key in `meta.yml` is `breakpoint--region` (e.g. `sm--header`, `xl--markup`).

**Response:** `{ "ok": true, "breakpoint": "sm", "region": "header", "status": "open" }`

**Errors (exit 1):**
- `--scene` not provided
- `--json` not provided or missing required fields (`breakpoint`, `region`, `status`)
- Scene not found or no story exists

## `story issues` (manage issues on checks)

Add, read, and update structured issues on checks. Issues are individual problems found during comparison.

### Add issues

```bash
 story issues --scene <group>:<name> --check <check-key> --add --json '[{"source":"screenshots","severity":"major","description":"Header diff 4.2%"},{"source":"extraction","severity":"major","label":"Hero Heading","property":"fontSize","expected":"3rem","actual":"2.5rem"}]'
```

Issues are automatically created with `status: "open"` and `result: null`.

| Field | Type | Required | Description |
|---|---|---|---|
| `source` | `"screenshots"` \| `"extraction"` | yes | Where the issue was found |
| `severity` | `"critical"` \| `"major"` | yes | Issue severity |
| `description` | string | yes | Human-readable summary |
| `label` | string | no | Element label (extraction issues) |
| `category` | string | no | `typography`, `layout`, `media`, `interactive`, `decoration` |
| `property` | string \| null | no | CSS property name |
| `expected` | string | no | Expected value |
| `actual` | string | no | Actual value |

**Response:** `{ "ok": true, "check": "xl--header", "added": 2 }`

### Read issues

```bash
 story issues --scene <group>:<name>                              # all issues
 story issues --scene <group>:<name> --check <check-key>          # for one check
 story issues --scene <group>:<name> --checks-open                # only open issues
```

**Response:** JSON array of `{ "checkKey": "xl--header", "index": 0, "issue": {...} }` objects.

### Update issue

```bash
 story issues --scene <group>:<name> --check <check-key> --update <index> --json '{"status":"done","result":"pass"}'
```

**Response:** `{ "ok": true, "check": "xl--header", "index": 0 }`

**Errors (exit 1):**
- `--scene` not provided
- `--check` required for `--add` and `--update`
- `--json` required for `--add` and `--update`
- Issue not found at given index

## `story checks` (workflow-ready checks)

Generate a workflow-ready checks array for a scene. Validates that a reference exists.

```bash
 story --scene <group>:<name> checks
 story --scene <group>:<name> --create --json '<meta-seed>' checks
 story --scene <group>:<name> --checks-open checks
```

| Option | Description |
|---|---|
| `--checks-open` | Filter to only open checks (status != done) |
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
