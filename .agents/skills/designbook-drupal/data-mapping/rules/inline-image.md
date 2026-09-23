---
trigger:
  domain: data-mapping
filter:
  backend: drupal
---

# Inline Image Policy for Pulled-Up Media References

Some paragraph/content bundles render an image field **inline** in the source
design (the image is visually part of the parent's own layout, not a
self-contained rendered child entity). For that case, render the referenced
media's image **inline on the parent via an image-style ImageNode** — not as a
self-rendering `media.image` child EntityNode, and not as a hardcoded `<img src>`
in the markup.

This relaxes the project's `image-fields` invariant #3 (a `type: reference` media
field normally emits an EntityNode that self-renders). For the inline case the
referenced media's image is pulled up and emitted as an **ImageNode in a slot of
the parent**, exactly as invariant #2 (`type: image` → ImageNode via image style)
already prescribes. The image still renders through the configured image style
(correct derivative, aspect ratio, responsive breakpoints) via the image-style
builder — never a raw original-file `<img>`.

## The rule

1. **Define an image-style bundle** for the image under `config.image_style` in
   `data-model.yml` (see the `image-style-config` rule). Derive its aspect ratio
   (and optional breakpoints) from the actual rendered size of the image in the
   design reference, not a guess.

2. **Emit an ImageNode in a slot** of the parent component (images are always
   slots, never props):

   ```jsonata
   "slots": {
     "image": [
       {
         "image": "<style_name>",           /* config.image_style bundle */
         "src":   <resolved image url>,      /* real content image */
         "alt":   <field>.alt
       }
     ]
   }
   ```

   Resolve `src` from the referenced media's actual image field. `src` carries
   the real image; `image: <style_name>` applies the configured style/aspect
   ratio at render time. Omit `src` only for a genuine placeholder.

3. **The parent's Twig renders the slot** (e.g. `{{ image }}`) — the image-style
   builder places the rendered image markup there. Do not hardcode an `<img>` tag
   with a field URL in the Twig.

4. **Keep the self-rendering EntityNode pattern for true stock media** — when the
   media is a genuinely independent, reusable rendered entity (its own view mode,
   shared across contexts rather than visually fused into one parent's layout),
   keep the standard EntityNode-in-slot pattern instead of pulling the image up.

## Checks

| ID | Severity | What to verify | Where |
|---|---|---|---|
| INLINE-IMG-01 | warning | An inline-in-layout image is emitted as an ImageNode (`{ image: <style>, src, alt }`) in a parent slot — not a `media.image` child EntityNode, not a raw `<img>` in Twig | entity-mapping jsonata + component twig |
| INLINE-IMG-02 | error | `image` names an image-style bundle defined under `config.image_style` in data-model.yml — no image without an image style | data-model.yml + jsonata |
| INLINE-IMG-03 | warning | `src` resolves from the referenced media's actual image field; `aspect_ratio` matches the image's actual rendered size in the design reference | jsonata + data-model.yml |
