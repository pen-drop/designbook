## ADDED Requirements

### Requirement: Layout component slot outputs are wrapped in block tags

Every slot output rendered by a layout component (`container`, `section`, `grid`) SHALL be wrapped in `{% block <slotname> %}...{% endblock %}` tags. This wrapping is mandatory for all named slots so that embedding templates can override individual slots via `{% embed %}`.

#### Scenario: Embed with block override injects content

- **WHEN** a template embeds a `container` component using `{% embed %}` and overrides the `content` block
- **THEN** the overriding block content is rendered in place of the default slot value

#### Scenario: Embed without block wrapping fails to inject content

- **WHEN** a layout component renders a slot without `{% block %}` wrapping and a consuming template attempts to override it via `{% embed %}`
- **THEN** the override has no effect and the default (empty) slot value is rendered instead

---

### Requirement: SDC conventions rule enforces block wrapping for embeddable components

The `sdc-conventions` rule MUST include a constraint requiring that all embeddable layout components wrap each slot output in `{% block <slotname> %}` tags. This constraint is a hard rule and cannot be overridden by integration skills.

#### Scenario: SDC conventions rule flags missing block wrapper

- **WHEN** a layout component's Twig template renders a slot without a surrounding `{% block %}` tag
- **THEN** the `sdc-conventions` rule identifies this as a violation

#### Scenario: SDC conventions rule accepts correct block wrapping

- **WHEN** a layout component's Twig template renders each slot inside `{% block <slotname> %}...{% endblock %}`
- **THEN** the `sdc-conventions` rule reports no violation for that component

---

### Requirement: Container blueprint documents block convention with examples

The `container` blueprint SHALL include documentation of the `{% block %}` wrapping convention. The documentation MUST contain at minimum one complete example showing a slot rendered inside a `{% block %}` tag, and one explanation of why the wrapping is required for `{% embed %}` compatibility.

#### Scenario: Developer follows container blueprint guidance

- **WHEN** a developer creates a new container-style component following the blueprint
- **THEN** the resulting Twig template wraps every slot in `{% block <slotname> %}...{% endblock %}` as shown in the blueprint example
