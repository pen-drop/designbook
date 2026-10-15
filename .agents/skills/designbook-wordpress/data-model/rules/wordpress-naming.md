---
trigger:
  domain: data-model
filter:
  backend: wordpress
---

# Rule: WordPress Data Model Names

WordPress stores bundle keys and field names in fixed-width columns and reserves query-var
names; a model that ignores this registers nothing or breaks routing.

| ID | Constraint |
|---|---|
| WP-NAME-01 | A `post` bundle key matches `^[a-z0-9_-]{1,20}$`. |
| WP-NAME-02 | A `term` bundle key matches `^[a-z0-9_]{1,32}$`. |
| WP-NAME-03 | Custom bundle keys avoid the reserved terms `post, page, attachment, revision, nav_menu_item, action, author, order, theme, type, category, tag, term, taxonomy`; the built-in bundles `post.post`, `post.page` and `attachment.image` keep their names. |
| WP-NAME-04 | Field names are snake_case `^[a-z][a-z0-9_]{0,31}$`, without a `field_` prefix. |
| WP-NAME-05 | A field with more than one value uses `repeater`, `gallery`, a multi-value `relationship` or a multi-select `taxonomy`; every repeater declares its `sub_fields`. |
