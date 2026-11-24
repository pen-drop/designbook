# Write the docs

Author pages for this handbook. English only. One topic home per page.

**You need:** the `website` package, and a page path under one of the four areas.

1. Add a **handbook** page under `docs/<area>/`. Put it in that area's `SIDEBAR` in `website/.vitepress/manual.mjs` and append its route to `website/routes.json`. Add a **distro landing** with only a `LANDINGS` entry (`id`, `label`, `link`, `status`, `integration`) and `docs/<id>/index.md` with `layout: home`. Do not put `/<id>/` in `routes.json` or `SIDEBAR`. Only `ready` is advertised in the top nav and the home “Start here” list; `experimental` and `planned` still need a real file.

**AI prompt**

```text
Add a handbook page under docs/extend/ following write-the-docs rules:
250-word indexes, 600-word standard pages, 1500-word Advanced leaves,
task shape if it is a task, absolute site routes, no /designbook prefix,
no .md in links. Update SIDEBAR and routes.json. Distro landings use
LANDINGS plus docs/<id>/index.md only — never routes.json.
```

2. Follow the three tiers. `check-pages.mjs` counts prose words (frontmatter, fenced code, HTML comments, link destinations, and tags excluded; inline code included; a token needs a letter). Limits:

- Every handbook `index.md` — 250, including under `docs/advanced/`
- Other pages under get-started, extend, integrations — 600
- Advanced leaf pages (non-index) — 1500
- `docs/landing.md` and registered `LANDINGS` homes have no word limit and still fail on `draft: true`

Index membership uses the area sidebar, not the `/manual` listing. Unknown areas fail. A page in no sidebar, the wrong sidebar, or twice fails. `draft: true` always fails, including on the landing.

3. Task pages use a goal sentence, **You need:**, numbered steps, and **Done when:**. The first fenced command or clearly labelled AI prompt is within 150 prose words. Label AI prompts as prompts, never as shell. Concepts and references start with a summary. At most one short Ask-your-AI tip.

4. Internal Markdown links are absolute site routes without `.md` and without `/designbook` (`/get-started/install`). Repository-only files use GitHub `next` URLs. `routes.json` is a **current-route inventory** of handbook routes, not a legacy redirect map. Distro landing routes come from `LANDINGS`; listing one in both inventories fails. There are no compatibility redirects.

5. Build order is exactly:

```bash
node scripts/check-pages.mjs && vitepress build && node scripts/check-site.mjs
```

`check-site` scans built HTML for `a href`, `link href`, `img src`, and `script src`, strips the `/designbook` base, and rejects host-root escapes, doubled base, missing pages, missing assets, and routes missing from or extra versus `routes.json` union `LANDINGS` links (generated 404 excluded). Query strings are stripped. Malformed fragments fail.

Publication: GitHub Pages from `next` only (this repository's default branch). `workflow_dispatch` must also be on `next` (`if: github.ref == 'refs/heads/next'` on build and deploy). Pull requests never receive Pages credentials.

Do not edit `docs/specs`, `docs/spikes`, `docs/experiments`, `docs/gaia`, or `docs/superpowers` for this site. Do not add Daily work or a per-workflow task catalog.

**Done when:** `pnpm --filter website build` exits 0 and `git diff --name-only` has no changes under those five excluded roots.
