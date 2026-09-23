---
trigger:
  steps: [write-component, create-sample-data]
  domain: [components, sample-data]
---

# Component Stories Need Their Own ImageNode Renderer

A designbook ImageNode (`{ image: <style>, src, alt }`) is turned into rendered
image markup by the entity-mapping pipeline's image builder. That builder runs
only for the **entity/record-driven stories** generated from a mapping plus
sample data — not for a component's own **standalone/docs story** (a plain
`*.story.yml` slot value written by hand or by the component-authoring stage).

A bare ImageNode placed directly in a component story's slot therefore falls
through every built-in story-node renderer (component reference, element,
markup, plain image-by-URL) and gets serialized as an opaque object — the
component story shows the raw object literal where the image should be, instead
of an `<img>`.

## The fix — register a custom story-node renderer once

Register one additional story-node renderer, globally, in the Storybook
configuration used by the SDC/component-story addon. Match any value shaped like
a designbook ImageNode (has an `image` key, is not itself a component/element
node) and render a plain `<img>` from its `src`/`alt`, falling back to the
project's shared placeholder image when `src` is absent. This also needs to fire
for an ImageNode nested inside another component's slot (e.g. a wrapper
component that composes an image with surrounding chrome).

Notes:

- The renderer's output must be a string the addon can embed directly into the
  generated story markup (e.g. return a JSON-stringified HTML string, mirroring
  how the addon's other built-in node renderers return their markup).
- This is a one-time addon-configuration change — it covers every component's
  image slots. Do not work around the broken rendering by editing each story
  file individually.
- The entity/record-driven story remains the authoritative visual surface (it
  runs the real image-rendering pipeline); the component story's `<img>` is a
  lightweight preview stand-in.

## Checks

| ID | Severity | What to verify | Where |
|---|---|---|---|
| SIMG-01 | error | No component/docs story renders a raw serialized object where an image slot should be | rendered component story |
| SIMG-02 | warning | A custom story-node renderer for the designbook ImageNode shape is registered in the Storybook/addon configuration | Storybook config |
