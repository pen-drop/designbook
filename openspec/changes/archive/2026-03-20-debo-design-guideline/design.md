## Context

Design-System-Workflows nutzen aktuell `reads:` Frontmatter in Task-Files um Dateien zu prüfen und zu laden (z.B. `data-model.yml`). Dieselbe Mechanik wird für `guidelines.yml` genutzt — kein neues Protokoll nötig. Die Skills in `guidelines.yml` werden von der AI beim Start jedes Design-System-Stages via Skill-Tool geladen, analog zu Rule 4 in `designbook-workflow`.

## Goals / Non-Goals

**Goals:**
- `debo-design-guideline` Workflow mit Dialog für: Skills, Naming, Referenzen, Prinzipien
- `guidelines.yml` als persistente, versionierbare Quelle für Designentscheidungen
- Automatisches Skill-Loading: alle gelisteten Skills werden beim Start jedes Design-System-Stages geladen
- Guidelines-Tab im Design-System-UI (vor Token-Tab)
- Dashboard-Badge für guidelines.yml

**Non-Goals:**
- Kein generischer `workflow.skills` Config-Key — Guidelines sind der richtige Ort für projektspezifische Skill-Konfiguration
- Kein Validation-Schema für die Skills-Liste — Typos scheitern lautlos (Skill-Tool-Verhalten)
- Keine Versionierung von Guidelines (kein History-Tracking)

## Decisions

**`guidelines.yml` liegt in `design-system/` neben `design-tokens.yml`**
Rationale: logisch gruppiert mit anderen design-system-artifacts; konsistent mit der Dashboard-StatusBox-Struktur die `design-system/` scannt.

**Skills-Loading via `reads:` + Task-File-Logik, nicht via Config**
Rationale: `reads:` ist die bestehende Konvention für File-Abhängigkeiten in Workflows. Die Task-Files der Design-Workflows lesen `guidelines.yml` und laden die darin gelisteten Skills. Kein neuer Mechanismus nötig.

**Tab-Reihenfolge: Guidelines vor Tokens**
Rationale: Guidelines sind Voraussetzung für Tokens — wer Guidelines noch nicht hat, soll sie zuerst sehen. Tokens sind von Guidelines abhängig (z.B. welche Figma-Referenz genutzt wird).

**`guidelines.yml` Schema:**
```yaml
references:
  - type: figma
    url: https://...
    label: Brand Guidelines
  - type: url
    url: https://...
    label: Reference Design System

design_file:
  type: figma           # figma | sketch | xd | other
  url: https://...
  label: Main Design File

principles:
  - "Accessible by default"
  - "Mobile-first"

component_patterns:
  - "Always use the container component as layout wrapper"
  - "Cards always use card-header + card-body slots"

naming:
  convention: kebab-case
  examples:
    - hero-section
    - card-teaser

mcp:
  server: figma-mcp    # MCP server name if available
  url: http://localhost:3333

skills:
  - frontend-design
  - web-design-guidelines
```

**Dialog order (non-technical → technical). All output always in English — no language question asked.**

1. **References** — "Are there existing design systems, websites, or styles you're orienting towards?" (optional, multiple)
2. **Design file** — "Do you have a design file (Figma, Sketch, etc.)? Share the URL." (optional)
3. **Principles** — "Which design principles should always apply — e.g. accessible, mobile-first, minimal?" (optional, free text)
4. **Component patterns** — "Are there component patterns or rules that always apply — e.g. 'always use the container component'?" (optional, free text)
5. **Naming** — "What naming convention for components? (default: kebab-case) Share 2–3 examples." (semi-technical)
6. **MCP server** — "Is there an MCP server available for design tool access?" (optional, technical)
7. **Skills** — "Which design skills should auto-load during design-system stages?" (technical, offer known list)

## Risks / Trade-offs

- **Guidelines veralten** → kein Auto-Invalidation. Mitigation: Dashboard-Badge zeigt Alter; User muss manuell neu ausführen.
- **Skills-Liste in guidelines.yml vs. in jedem Task-File** → guidelines.yml ist single source of truth; Task-Files müssen sie lesen und anwenden. Etwas mehr Komplexität in Task-Files, dafür zentrale Pflege.

## Open Questions

Keine.
