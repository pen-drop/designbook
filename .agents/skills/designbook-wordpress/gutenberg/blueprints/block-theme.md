---
type: data-mapping
name: gutenberg-block-theme
trigger:
  domain: data-mapping
  config_name: 'theme.*.html.*'
filter:
  backend: wordpress
---

# Blueprint: Block Theme Templates

Gutenberg mappings use file-based block templates, not PHP/Twig singles.

`themes/<ns>/templates/index.html`, `page.html`, and `single.html` (plus
`single-<bundle>.html` for a Gutenberg post bundle):

```html
<!-- wp:template-part {"slug":"header"} /-->
<!-- wp:post-content /-->
<!-- wp:template-part {"slug":"footer"} /-->
```

`themes/<ns>/parts/header.html` and `footer.html` hold the shell. `core/post-content`
appears once between the parts. Custom `wp_template` rows in the database stay in place.
