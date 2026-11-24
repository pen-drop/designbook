#!/usr/bin/env bash
# Test double for a `prepare` command: echoes a fixed JSON Schema on stdout,
# ignoring its args. Stands in for a real `drush ... config-schema` call.
cat <<'JSON'
{ "type": "object", "required": ["config_name", "data"],
  "properties": {
    "config_name": { "type": "string" },
    "data": { "type": "object", "required": ["langcode"],
              "properties": { "langcode": { "type": "string" } } } },
  "additionalProperties": true }
JSON
