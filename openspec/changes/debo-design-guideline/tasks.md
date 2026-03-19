## 1. Workflow Skill — debo-design-guideline

- [x] 1.1 Erstelle `.claude/skills/debo-design-guideline/index.md` — Workflow-Definition mit Dialog-Steps (non-technical → technical), Stages `[dialog, create-guidelines]`
- [x] 1.2 Erstelle `.claude/skills/designbook-guidelines/tasks/create-guidelines.md` — Task-File mit params (references, design_file, principles, component_patterns, naming, mcp, skills), `reads: $DESIGNBOOK_DIST/design-system/design-tokens.yml` (optional), files: `$DESIGNBOOK_DIST/design-system/guidelines.yml`, vollständige Dateiformat-Vorlage inkl. aller optionalen Keys
- [x] 1.3 Dialog-Reihenfolge in Skill-File dokumentieren: references → design_file → principles → component_patterns → naming → mcp → skills (always English, no language question)
- [x] 1.4 Registriere `debo-design-guideline` in der Skill-Liste — skill description: "Create design guidelines for design-system workflows. Load when user runs /debo-design-guideline."

## 2. Guidelines Reads-Dependency in Design-System Task-Files

- [x] 2.1 Füge `reads: $DESIGNBOOK_DIST/design-system/guidelines.yml` zu `.claude/skills/designbook-tokens/tasks/create-tokens.md` Frontmatter hinzu
- [x] 2.2 Füge `reads:` zu allen weiteren design-system Task-Files hinzu: `debo-design-component`, `debo-design-screen`, `debo-design-shell` (jeweilige stage task files)
- [x] 2.3 Ergänze in jedem dieser Task-Files eine Instruktion: "Lese `guidelines.yml` → lade alle Skills unter `skills:` via Skill-Tool, wende `naming` und `principles` als implizite Constraints an"

## 3. Design System UI — Guidelines Tab

- [x] 3.1 In `DeboDesignSystemPage.jsx`: Guidelines-Tab als erstes Element in `tabs`-Array einfügen — `{ id: 'guidelines', title: 'Guidelines', children: () => <GuidelinesTab /> }`
- [x] 3.2 `GuidelinesTab` in `DeboDesignSystemPage.jsx` als lokale Funktion implementieren — nutzt `DeboSection` mit `dataPath="design-system/guidelines.yml"`, `command="/debo-design-guideline"`, `emptyMessage="No design guidelines yet"`, `renderContent={(data) => <DeboDesignGuidelines data={data} />}`
- [x] 3.3 Erstelle `src/components/display/DeboDesignGuidelines.jsx` — rendert references, design_file, principles, component_patterns, naming, mcp, skills; alle styled mit `styled` from `storybook/theming`; optionale Sektionen nur rendern wenn im data-Objekt vorhanden
- [x] 3.4 Expose `design-system/guidelines.yml` über `/__designbook/status` API (neben design-tokens.yml)

## 4. Dashboard — Guidelines Badge

- [x] 4.1 Ergänze "guidelines"-Badge in der Design-System StatusBox — grün wenn `design-system/guidelines.yml` existiert, grau mit Hint "Run /debo-design-guideline" wenn fehlend
- [x] 4.2 Positioniere guidelines-Badge vor dem tokens-Badge in der StatusBox
