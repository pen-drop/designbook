## Why

Die 4 Komponenten-Skills (`designbook-drupal-components-ui`, `-shell`, `-entity`, `-screen`) sind historisch gewachsen und verwenden **inkonsistente Terminologie, Namenskonventionen und Ortsangaben**. Es ist nicht auf einen Blick klar, dass es genau 4 Arten von Komponenten gibt, wie sie sich unterscheiden, und wo ihre Files liegen. Dieses Change soll Klarheit schaffen und die Skills aktualisieren.

## Analyse: Was unklar/inkonsistent ist

### 1. Begriffe: "Designbook Component" vs. "UI Component" vs. "Design Component"

| Skill | Eigene Bezeichnung | Bezeichnet als… |
|-------|-------------------|-----------------|
| **UI** | "Drupal SDC component" | (kein expliziter Typ-Name im H1) |
| **Shell** | "structural shell components" / "design-phase prototypes" | "designbook components" |
| **Entity** | "entity design components" | "designbook entity components" / "structural wrappers" |
| **Screen** | "screen design components" | "top-level composition layer" |

**Problem:** Es fehlt eine klare, einheitliche Taxonomie die in **jedem** Skill gleich verwendet wird. Der User muss die Zuordnung selbst ableiten.

### 2. Pfad-Konventionen: Wo liegen die Komponenten?

| Skill | Beschriebener Pfad | Tatsächlicher Prefix |
|-------|-------------------|-----------------------|
| **UI** | `$DESIGNBOOK_DRUPAL_THEME/components/[name]/` | (kein Prefix) |
| **Shell** | `$DESIGNBOOK_DIST/components/shell-header/` | `shell-` |
| **Entity** | `$DESIGNBOOK_DIST/components/entity-node-article/` | `entity-` |
| **Screen** | `$DESIGNBOOK_DIST/components/section-news-article-list/` | `section-` |

**Problem im User-Request:** User sagt "shell-*" für UI-Komponenten und `entity-` für Entity. Der Screen-Skill verwendet `section-` Prefix, nicht `screen-`. Das muss klar dokumentiert sein.

> **Klärungsbedarf:** User sagt UI-Komponenten liegen in `DESIGNBOOK_THEME/components/shel-*` — das stimmt nicht. UI-Komponenten haben keinen Prefix und liegen in `$DESIGNBOOK_DRUPAL_THEME/components/`. Shell-Komponenten (Header/Footer) liegen in `$DESIGNBOOK_DIST/components/shell-*`.

### 3. Markup / Twig: Wer hat Markup, wer nicht?

| Skill | Hat Markup? | Twig enthält… |
|-------|------------|---------------|
| **UI** | ✅ JA | Echtes HTML mit CSS-Klassen (z.B. DaisyUI) |
| **Shell** | ❌ NEIN | Nur Slot-Variablen `{{ logo }}{{ navigation }}` — zero HTML |
| **Entity** | ⚠️ MINIMAL | `<article{{ attributes }}>{{ content }}</article>` — Wrapper-Element |
| **Screen** | ❌ NEIN (Annahme) | `{{ header }}{{ content }}{{ footer }}` — slots only |

**Problem:** Entity hat doch minimalen Markup (`<article>` Wrapper). Der User sagt "kein Markup", aber der Skill generiert ein Wrapper-Element. Das sollte klar als "struktureller Wrapper, kein visuelles Markup" beschrieben sein.

### 4. Story-Typen: Was ist in den Stories?

| Skill | Story-Inhalt | Datei-Konvention |
|-------|-------------|-----------------|
| **UI** | Props + Slots mit realen Werten | `[name].story.yml` |
| **Shell** | `type: component` Refs zu UI-Komponenten | `[name].default.story.yml` |
| **Entity** | `type: component` Refs + `type: ref` Data-Bindings | `[name].[viewmode].story.yml` |
| **Screen** | `type: component` Refs zu Shell + Entity | `[name].story.yml` |

**Problem:** Story-Dateinamenskonvention ist inkonsistent:
- UI: `button.story.yml` (einfach)
- Shell: `shell-header.default.story.yml` (mit Viewmode-Suffix)
- Entity: `entity-node-article.full.story.yml` (mit Viewmode-Suffix)
- Screen: `section-news-article-list.story.yml` (einfach)

### 5. Provider-Konvention

| Skill | Provider |
|-------|---------|
| **UI** | Theme-Provider (z.B. `daisy_cms_daisyui`) |
| **Shell** | `designbook_design` |
| **Entity** | `designbook_design` |
| **Screen** | `designbook_design` |

**Problem:** In den Skills wird der Provider unterschiedlich dokumentiert. Shell/Entity/Screen verwenden `designbook_design`, aber das steht teils erst am Ende in den "Design Principles". Sollte prominent am Anfang stehen.

### 6. Inkonsistente Skill-Referenz-Namen

| Wo | Wie referenziert |
|----|-----------------|
| Shell SKILL.md | "delegated to `designbook-drupal-components`" |
| Entity SKILL.md | "using the `designbook-drupal-components` skill" |
| Screen SKILL.md | "handled by `designbook-drupal-components`" |

Aber der tatsächliche Skill heißt `designbook-drupal-components-ui`. Sind das Aliase oder muss das korrigiert werden?

### 7. Screen-Skill: "section-" vs. "screen-" Prefix

Der User sagt "section componenten" mit Prefix `section-`, der Skill verwendet auch `section-` als Prefix. Aber der Skill-Name ist `designbook-drupal-components-screen`. Das kann verwirrend sein — ist es ein "Screen" oder eine "Section"?

## What Changes

- **Einheitliche Taxonomie**: Jeder Skill bekommt einen klaren "Component Type" Header-Block der beschreibt:
  1. Art der Komponente
  2. Ob Markup enthalten ist
  3. Wo die Files liegen (Pfad + Prefix)
  4. Welcher Provider verwendet wird
  5. Story-Konvention (Dateiname + Inhalt)
- **Cross-Reference-Tabelle**: Gemeinsame Tabelle in jedem Skill die den Überblick über alle 4 Typen gibt
- **Konsistente Skill-Referenzen**: `designbook-drupal-components` → `designbook-drupal-components-ui` (oder bewusst als internen Namen klären)
- **Entity Twig**: Klarstellen dass `<article>` ein struktureller Wrapper ist, kein visuelles Markup

## Capabilities

### New Capabilities
- `component-type-taxonomy`: Einheitliche Dokumentation der 4 Komponenten-Typen mit klarer Zuordnung zu Skills, Pfaden, Providern und Story-Konventionen

### Modified Capabilities
_Keine bestehenden Specs betroffen — es handelt sich um eine reine Dokumentations-/Skill-Aktualisierung._

## Impact

- `.agent/skills/designbook-drupal-components-ui/SKILL.md` — Header-Block hinzufügen
- `.agent/skills/designbook-drupal-components-shell/SKILL.md` — Header-Block, Referenz-Fix
- `.agent/skills/designbook-drupal-components-entity/SKILL.md` — Header-Block, Referenz-Fix, Twig-Klärung
- `.agent/skills/designbook-drupal-components-screen/SKILL.md` — Header-Block, section-/screen-Klärung
- Keine Breaking Changes — reine Dokumentationsänderungen
