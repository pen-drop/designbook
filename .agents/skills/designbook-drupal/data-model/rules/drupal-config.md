---
trigger:
  domain: data-model
filter:
  backend: drupal
---

# Rule: Drupal Config Name Format

## config_name format

Every `config_name` value MUST match the pattern `^[a-z0-9_]+(\.[a-z0-9_]+)+$`
(dot-separated lowercase/digit/underscore segments). This mirrors the Drupal
config/sync filename convention (the `.yml` extension is excluded).
