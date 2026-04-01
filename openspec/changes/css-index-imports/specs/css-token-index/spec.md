## ADDED Requirements

### Requirement: css-generate erzeugt tokens/index.src.css

Nach dem `transform`-Stage des `css-generate`-Workflows SHALL die Pipeline `css/tokens/index.src.css` erzeugen. Diese Datei enthält einen `@import`-Eintrag pro vorhandener Token-CSS-Datei in `css/tokens/` (alphabetisch sortiert, `index.src.css` selbst ausgenommen).

#### Scenario: Index wird nach Token-Generierung erzeugt

- **WHEN** der `css-generate`-Workflow die `index`-Stage ausführt
- **THEN** liest der Task alle `*.src.css`-Dateien in `css/tokens/` (außer `index.src.css`)
- **AND** schreibt `css/tokens/index.src.css` mit je einem `@import "./<datei>"` pro Datei, alphabetisch sortiert

#### Scenario: app.src.css importiert nur noch den Index

- **WHEN** `index.src.css` vorhanden ist
- **THEN** SHALL `app.src.css` ausschließlich `@import "./tokens/index.src.css"` für Token-Importe verwenden
- **AND** keine einzelnen Token-Dateien direkt importieren

#### Scenario: Neue Token-Datei erscheint automatisch im Index

- **WHEN** ein neues Token-Gruppe zum `css-generate`-Lauf hinzukommt (z.B. `motion.src.css`)
- **AND** der Workflow erneut ausgeführt wird
- **THEN** enthält `index.src.css` danach auch `@import "./motion.src.css"`
- **AND** `app.src.css` muss nicht manuell angepasst werden

#### Scenario: index.src.css ist eigenständiger Vite-Build-Output

- **WHEN** Vite den Build ausführt
- **THEN** wird `css/tokens/index.src.css` vom Glob `css/**/[!_]*.src.css` erfasst
- **AND** als `dist/css/tokens/index.css` ausgegeben
