## ADDED Requirements

### Requirement: Image style definition in data-model.yml

`data-model.yml` MAY declare an `image_styles` top-level section. Each key is a style name (kebab-case or snake_case). Each style MUST declare `aspect_ratio` (string, format `W:H`). Each style MAY declare a `breakpoints` map.

```yaml
image_styles:
  hero:
    aspect_ratio: 21:9
    breakpoints:
      xl: { width: 1200 }
      md: { width: 768, aspect_ratio: 16:9 }
      sm: { width: 480, aspect_ratio: 4:3 }
  card:
    aspect_ratio: 4:3
    breakpoints:
      sm: { width: 480, aspect_ratio: 1:1 }
  avatar:
    aspect_ratio: 1:1
```

#### Scenario: Minimal image style with aspect ratio only
- **WHEN** `data-model.yml` contains `image_styles: { avatar: { aspect_ratio: "1:1" } }`
- **THEN** the style `avatar` is available with aspect ratio 1:1 and no responsive breakpoints

#### Scenario: Image style with responsive breakpoints
- **WHEN** `data-model.yml` contains a style `hero` with `aspect_ratio: "21:9"` and breakpoints `md: { width: 768, aspect_ratio: "16:9" }` and `sm: { width: 480, aspect_ratio: "4:3" }`
- **THEN** the style `hero` has a default ratio of 21:9, overridden to 16:9 at widths ≤768px and 4:3 at widths ≤480px

#### Scenario: Breakpoint inherits default aspect ratio when not overridden
- **WHEN** a style has `aspect_ratio: "4:3"` and a breakpoint `sm: { width: 480 }` (no `aspect_ratio`)
- **THEN** the breakpoint uses the style's default ratio 4:3 with width 480

### Requirement: Image style breakpoints are independent from CSS breakpoints

Image style breakpoints SHALL NOT depend on or reference CSS/Tailwind breakpoint tokens. Breakpoint names within an image style are arbitrary labels. The `width` value determines the media query threshold.

#### Scenario: Image style breakpoint names don't match CSS breakpoints
- **WHEN** an image style defines breakpoints `{ large: { width: 1000 }, small: { width: 500 } }`
- **AND** the project's CSS breakpoints use `sm: 640px, md: 768px, lg: 1024px`
- **THEN** the image style uses `(min-width: 1000px)` and `(min-width: 500px)` regardless of CSS breakpoint values

### Requirement: Aspect ratio format

Aspect ratios SHALL be expressed as `W:H` strings where W and H are positive integers (e.g. `16:9`, `4:3`, `1:1`, `21:9`).

#### Scenario: Valid aspect ratio formats
- **WHEN** an image style declares `aspect_ratio: "16:9"`
- **THEN** the system parses width=16, height=9

#### Scenario: Invalid aspect ratio format
- **WHEN** an image style declares `aspect_ratio: "wide"`
- **THEN** the system reports a validation error
