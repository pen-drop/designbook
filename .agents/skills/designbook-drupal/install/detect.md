---
name: detect
description: Confirm the project is a Drupal codebase and determine the docroot.
---

# Detect — Drupal layout

The core detection table already matched a `drupal/core*` package in
`composer.json`. This step determines the docroot.

1. Read `composer.json`. If `extra.drupal-scaffold.locations.web-root` is set,
   strip a trailing slash and use it as `DOCROOT`.
2. Otherwise take the first of `web`, `docroot`, `.` that contains a `themes/`
   or `core/` directory.
3. Neither found → abort: "Could not determine the Drupal docroot — expected
   `web/`, `docroot/`, or a scaffold `web-root` entry in composer.json."
4. Record `DOCROOT` for the following steps.
