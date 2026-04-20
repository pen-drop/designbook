# Design: Drupal Form Blueprint

## Summary

Ein einzelner Blueprint für das gesamte Drupal Form-Komponentensystem. Definiert ein Bundle aus Wrapper (`form_element`), Label und Input-Typen als flachen Katalog. Das zentrale Pattern: `form_element` ist der universelle Wrapper, der Label, Description, Error und den eigentlichen Input zusammenfasst. Die Inputs selbst sind schlank und rendern nur ihr HTML-Element.

**Referenz-Implementierung:** kern_ux (`/home/cw/projects/kern/kern_ux/components/`) — dient als Beispiel, der Blueprint selbst ist generisch.

## Blueprint-Datei

Ziel: `.agents/skills/designbook-drupal/components/blueprints/form.md`

## Frontmatter

```yaml
---
type: component
name: form
priority: 10
embeds:
  - form_element
  - label
  - input
  - select
  - textarea
  - checkbox
  - radio
  - checkboxes
  - radios
  - submit
when:
  steps: [design-shell:intake, design-component:intake, design-screen:intake]
---
```

## Komponentengruppen

Zwei Markup-Pattern bestimmen die Struktur:

- **Text-like** (input, select, textarea): `form_element` mit `label_display: before`
- **Check-like** (checkbox, radio): `form_element` mit `label_display: after`
- **Gruppen** (checkboxes, radios): sammeln mehrere check-like-Elemente

## Komponentenkatalog

### form_element

Universeller Wrapper um Label und Form-Input. Stellt konsistente Struktur für Label, Description, Prefix/Suffix und Error-Anzeige bereit.

**Use for:** Jedes einzelne Formularfeld — wrapped den jeweiligen Input-Typ.

#### Props
- type: string — Drupal Form-Element-Typ (textfield, email, checkbox, select, etc.)
- label_display: enum [before, after, invisible] (default: "before")
- description_display: enum [before, after, invisible] (default: "after")
- description: object { content: string, attributes: object }

#### Slots
- label — Label-Komponente
- prefix — Inhalt vor dem Input
- suffix — Inhalt nach dem Input
- errors — Fehlermeldung
- children — der eigentliche Input

#### Composition Rules
- Typ bestimmt CSS-Pattern: text-like → `form-input`-Wrapper, check-like → `form-check`-Wrapper
- label_display steuert Reihenfolge: `before`/`invisible` → Label vor Children, `after` → Label nach Children
- Error-Anzeige nach dem Input mit alert-Rolle
- Description-Position wird über description_display gesteuert

---

### label

Form-Label-Komponente, die innerhalb von form_element im label-Slot verwendet wird.

**Use for:** Label-Rendering für alle Form-Elemente.

#### Props
- title_display: enum [before, after, invisible, hidden] (default: "before")

#### Slots
- title — Der Label-Text

---

### input

Schlanker Input für text-basierte Eingaben. Der Typ wird über das HTML type-Attribut gesteuert.

**Use for:** textfield, email, password, number, tel, url, search, date, file, color, range

#### Props
- pattern: string — HTML pattern-Attribut für Validierung (Regex)

#### Slots
- children — optionale zusätzliche Elemente

#### Composition
- Wird immer in form_element als children-Slot eingebettet
- Input-Typ (email, tel, etc.) wird über HTML-Attribute gesteuert, nicht über Komponenten-Props

---

### select

Dropdown-Auswahl.

#### Props
- options: array — Array von Option-Objekten { value, label, selected }

#### Slots
- option_elements — Custom HTML-Options (überschreibt options-Prop)
- children — Fallback für rohes HTML

#### Composition
- Wird in form_element als children-Slot eingebettet
- form_element.type = "select"

---

### textarea

Mehrzeiliges Textfeld.

#### Props
- value: string (default: "")

#### Slots
- children — rohes HTML (überschreibt value-Prop)

#### Composition
- Wird in form_element als children-Slot eingebettet

---

### checkbox

Einzelne Checkbox. Rendert nur das Input-Element.

#### Props
- (keine eigenen Props — Zustand über HTML-Attribute: checked, disabled, value)

#### Slots
- children — optionale zusätzliche Elemente

#### Composition
- Wird in form_element als children-Slot eingebettet
- form_element.type = "checkbox", label_display = "after"

---

### radio

Einzelner Radio-Button. Rendert nur das Input-Element.

#### Props
- (keine eigenen Props — Zustand über HTML-Attribute: checked, disabled, value, name)

#### Slots
- children — optionale zusätzliche Elemente

#### Composition
- Wird in form_element als children-Slot eingebettet
- form_element.type = "radio", label_display = "after"

---

### checkboxes

Gruppencontainer für mehrere Checkboxen.

#### Slots
- children — Array von checkbox-Komponenten (jeweils in eigenem form_element gewrapped)

#### Composition
- Wird in form_element als children-Slot eingebettet
- form_element.type = "checkboxes"
- Jedes Kind ist ein form_element mit checkbox als children

---

### radios

Gruppencontainer für mehrere Radio-Buttons.

#### Slots
- children — Array von radio-Komponenten (jeweils in eigenem form_element gewrapped)

#### Composition
- Wird in form_element als children-Slot eingebettet
- form_element.type = "radios"
- Alle Radios teilen sich denselben name-Attributwert

---

### submit

Absenden-Button für Formulare.

#### Props
- (Wert und Zustand über HTML-Attribute: value, disabled)

#### Composition
- Steht eigenständig, wird nicht in form_element gewrapped

## Abgedeckte Drupal Form-Element-Typen

Das Blueprint deckt alle wesentlichen Drupal-Core-Form-Typen ab:

| Drupal-Typ | Blueprint-Komponente | Anmerkung |
|---|---|---|
| textfield, email, password, number, tel, url, search | input | Typ via HTML-Attribut |
| date, file, color, range | input | Typ via HTML-Attribut |
| select | select | Eigene Komponente wegen Options-Array |
| textarea | textarea | Eigene Komponente |
| checkbox | checkbox + form_element | label_display: after |
| radio | radio + form_element | label_display: after |
| checkboxes | checkboxes + form_element | Gruppiert checkbox-Instanzen |
| radios | radios + form_element | Gruppiert radio-Instanzen |
| submit | submit | Ohne form_element-Wrapper |

Spezialisierte Admin-Typen (machine_name, password_confirm, path_element, vertical_tabs, item) werden nicht abgedeckt — diese benötigen projektspezifische Lösungen.
