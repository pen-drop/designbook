---
trigger:
  steps: [detect-backend]
---

# Detect Drupal

Detection criteria and root resolution for a Drupal codebase. This rule has no
`filter:` — it runs during detection itself, before any backend is known.

## Match

A directory is a Drupal codebase when it contains a `composer.json` whose `require` or
`require-dev` lists a package whose name starts with `drupal/core`.

On a match, contribute:

- `backend` → `drupal`
- integration skill → `designbook-drupal`
- `root` → the docroot determined below

## Docroot

Determine the docroot inside the matched project root:

1. Read `composer.json`. If `extra.drupal-scaffold.locations.web-root` is set, strip a
   trailing slash and use it as the docroot.
2. Otherwise take the first of `web`, `docroot` that contains a `themes/` or `core/`
   directory.
3. As a last resort accept `.` (the project root) only when it contains a `core/`
   directory, or both `index.php` and `sites/`.
4. None of the above → abort: "Could not determine the Drupal docroot — expected
   `web/`, `docroot/`, or a scaffold `web-root` entry in composer.json."

The resolved docroot is contributed as `root` for the following stages.
