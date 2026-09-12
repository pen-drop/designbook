---
name: website-capture-observations
trigger:
  steps: [observe-website]
---

# Observe the selected website source

One dump records one state observed in one session. Write each declared state
with `_debo reference save --reference <revision-dir> --url <url> --state <name>
--session <name> [--steps <json>] [--prelude <file>] [--breakpoints sm,xl]`;
stdout is the catalogue JSON (landmarks, interactive, forms, images, fonts,
font_faces) and the command writes `extract--<state>.json`.

Capture each selected subject/view/state with `_debo reference capture-image
--reference <revision-dir> --path <view>--<subject>--<state>.png --url <url>
--selector <css-locator> --width <px> --session <name> [--state <name>] [--view
<id>] [--steps <json>] [--prelude <file>]`. Empty selector is the full page.
`--steps` reaches a non-rest state. Confirm the intended subject in the image
via `_debo reference image --reference <revision-dir> --path <png>` plus visual
inspection.

Native CSS locators stay on observed nodes. Font identities are `@font-face`
family names, or the first unquoted CSS family token; the catalogue's
`font_faces` carries their binary URLs. Each family the observed document
declares as `@font-face` owes a local binary; a family that appears only inside
a computed `font-family` stack is an operating-system fallback the source never
ships, and owes none. Download every owed binary and every picture the selected
subtrees reference into `assets/` with `_debo reference capture-file
--reference <revision-dir> --path assets/<basename> --url <absolute-http-url>
--session <name>`, each under the basename of its recorded source — that is
the path publication reads it from. Screenshots use `capture-image`. Preserve
each downloaded file's format and extension. Record unavailable required observations
explicitly; a nonzero selector count alone does not establish subject identity.

## Read the extract, not the page

The saved dump and the catalogue answer the structural questions of intake.
`_debo reference inspect --reference <revision-dir> --state <name> --locator
<css>` resolves one locator against an unpublished dump and reports its subtree,
contained images and font families; without `--locator` it reports the dump's
totals.

A selected locator is the one the dump recorded, character for character. The
walk stores one exact locator per node (`body > app-root > app-site-header`) and
the projection matches it by equality, so a shorter selector that reaches the
same element in a browser is a different string and resolves to nothing. On a
miss, `subject.miss.suffix_matches` lists candidate full locators;
`resolved_prefix` and `children`, when present, help locate a different tail.
Inspect candidate locators and compare the returned subject and subtree with
the intended subject. Accept a locator only when `subject.found` is true and
the subject identity is established; multiple suffix matches require that
comparison, not selection by list position. If identity remains ambiguous,
report the unresolved subject and stop finalizing the definition.

Confirm every selected locator in each selected state before freezing the
capture block. Follow the [intake resolution sequence](../../skills/extract-reference/resources/intake.md)
when a correction changes the revision directory. A locator that resolves to
no node yields an empty projection at publication.

`playwright-cli` covers exactly three purposes, and each use is named with its
purpose in the intake:

| Purpose | Why the extract cannot serve it |
| --- | --- |
| Authoring a prelude | The selectors a prelude clicks are found by looking at the live page; no dump of it exists yet. |
| Minting a session | A storage state is produced by signing in once (`playwright-cli state-save`), not read from an observation. |
| Diagnosing a failed capture | When a declared locator or state produced nothing, the live page shows why. |

Structure, locators, images, fonts and state geometry come from the catalogue,
the dump and `reference inspect`.

## Prepare the prelude and its sessions before the revision exists

A prelude is one module, `export default async (page, ctx) => {}`, that makes
the page observable on every pass — the dump and each screenshot alike. It
receives `ctx` (`session`, `state`, `view`, `url`) and branches on it, so one
module serves every pass instead of a matrix of scripts. It lives in the project
repository, because it describes a source rather than one revision of it.

The revision digest covers the prelude, so the module and its digest are fixed
before the revision directory is resolved: author the module, take its
`{ path, digest }` from `_debo reference prelude --path <file>`, put that pair in
the capture block's `prelude`, and resolve the directory with `_debo workflow
capture-location --capture <capture.json> --workflow-id <id>` afterwards.

Each state names the session it is observed as. A session name resolves through
`sessions:` in the project configuration to a stored session; `anonymous` is the
reserved name for an observation taken without one. Selecting a name that the
configuration does not define ends the work — an observation published under an
undefined observer states something that was never true.

## Prepare bounded observations before publication

The CLI projects observations from the per-state dumps, `meta.yml` and PNG
files. Author `meta.yml` with the selected subjects, locators, views and states,
each state carrying its session. Check projected package sizes with `reference
query` after publication against the [bounded observation
contract](../resources/reference-packages.md). If a selected sample is too
large, refine the observed projection while preserving the fixed selected scope.
If that scope must be split, create a new extraction definition rather than
changing a running one.

## Capture the selected subject and state

Frame each screenshot around the selected subject and the visible elements that
belong to its current state. For a menu, search panel or dialog rendered outside
the subject's DOM subtree, identify the associated overlay explicitly and include
its visible bounds with the subject. Preserve the real layout, clipping and
occlusion in the source; unrelated page sections are not additional capture scope.

`reference capture-image` isolates the selector at the view width. Choose the
selector so the subject and any associated overlay are in that capture. A full
page (empty selector) is appropriate only when the selected subject or its
actual state overlay occupies that area. Opening a header menu alone does not
justify including unrelated main content beneath it. Inspect the resulting
image: the selected subject, requested state and relevant overlay must be
visible. A missing subject or state is a capture failure, not a full-page
fallback.
