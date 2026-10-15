---
trigger:
  steps: [detect-backend]
---

# Detect WordPress

Detection criteria and root resolution for a WordPress codebase. This rule has no
`filter:` — it runs during detection itself, before any backend is known.

## Match

A directory is a WordPress codebase when it contains `wp-config.php` or
`wp-includes/version.php`, or a `composer.json` whose `require` lists `roots/wordpress` or
`johnpbloch/wordpress`.

On a match, contribute:

- `backend` → `wordpress`
- integration skill → `designbook-wordpress`
- `root` → the docroot: the directory containing `wp-includes/` (for a Composer install
  without `wp-includes/` yet, the `extra.wordpress-install-dir` value, else the project
  root)
