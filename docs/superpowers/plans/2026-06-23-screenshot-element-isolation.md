# Screenshot Element-Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den Selector-Pfad der Screenshot-Capture von Bounding-Box-Crop auf Element-Isolation (Heben ans body-Root + full-page transparent) umstellen.

**Architecture:** Reine Skill-Dokumentations-Änderung an vier Markdown-Dateien unter `.agents/skills/designbook/`. Der CSS-Selektor selektiert weiterhin das Zielelement, wird aber nicht mehr zum Croppen genutzt, sondern zum Freistellen: erstes Match via `eval` ans `body`-Root heben, alles andere entfernen, Hintergrund transparent, dann `page.screenshot({ fullPage: true, omitBackground: true })`. Symmetrisch für Story (`check.selector`) und Referenz (`check.reference_selector`).

**Tech Stack:** Markdown-Skill-Dateien (designbook), `playwright-cli` (`eval`, `run-code`), Playwright `page.screenshot`. Test-Workspace via `scripts/setup-workspace.sh`.

## Global Constraints

- **Skill-Creator-Gate (CLAUDE.md):** Vor JEDEM Erstellen/Editieren von task- oder rule-Dateien unter `.agents/skills/designbook/` MUSS `designbook-skill-creator` geladen werden, plus die passende Per-File-Type-Rule: `rules/rule-files.md` für `playwright-capture.md`, `rules/task-files.md` für die `capture-*.md`, und `rules/common-rules.md` immer. Nicht optional.
- **Kanonischer Pfad:** Skill-Quellen leben in `.agents/skills/` — dort editieren. `.claude/skills/` ist ein Symlink, NIE separat anfassen.
- **Keine Kompat-/Migrations-Logik:** Bestehende On-Disk-Screenshots sind disposable; Testing immer from-scratch. Keinen Code/Text schreiben, der alte Artefakte liest oder upgraded.
- **Symmetrie:** Story nutzt `check.selector`, Referenz nutzt `check.reference_selector`. Beide Seiten nutzen denselben Isolations-Modus.
- **Unberührt lassen:** Leerer Selektor → Story = `#storybook-root` Element-Capture, Referenz = `--full-page`. Viewport-Höhe 1600px, 3s-Settle, Session-Pinning `-s=<workspace>`, Consent-Overlay-Dismissal, Storybook-Restart vor Recapture.
- **Skip-with-warning:** Selektor ohne Treffer → full-page-Fallback + Warnung, NIE fail.
- **Code-Quality-Gate:** `pnpm check` (typecheck → lint → test, fail-fast) muss vor jedem Commit grün sein.
- **Spec:** `docs/superpowers/specs/2026-06-23-screenshot-element-isolation-design.md`.

---

## File Structure

- `.agents/skills/designbook/resources/cli-playwright.md` — CLI-Referenz. **Neu:** Pattern "Isolate-and-capture" (Foundation, wird von der Rule referenziert).
- `.agents/skills/designbook/design/rules/playwright-capture.md` — Hard-Constraints-Rule. **Neu:** "Element capture"-Sektion = ISOLATE-Protokoll statt `snapshot`→`screenshot <ref>`; Stale-Ref-Constraint streichen.
- `.agents/skills/designbook/design/tasks/capture-storybook.md` — Story-Task. **Mod:** Schritt 2b auf Isolations-Modus.
- `.agents/skills/designbook/design/tasks/capture-reference.md` — Referenz-Task. **Mod:** Schritt 2 auf Isolations-Modus.

Reihenfolge der Tasks folgt der Referenz-Richtung: Resource (Pattern) → Rule (Protokoll) → Tasks (Wortlaut) → Integrations-Verifikation.

---

### Task 1: Isolate-and-capture Pattern in cli-playwright.md

**Files:**
- Modify: `.agents/skills/designbook/resources/cli-playwright.md` (Abschnitt "Common Patterns", nach "Element screenshot via snapshot ref", ~Zeile 94)

**Interfaces:**
- Produces: Das benannte Pattern "Isolate-and-capture" (eval `ISOLATE` + run-code `page.screenshot({ fullPage, omitBackground })`), auf das Task 2 per Verweis zeigt.

- [ ] **Step 1: Skill-Gate** — `designbook-skill-creator` ist hier nicht zwingend (Resource, keine task/rule-Datei), aber `common-rules.md` einmal lesen schadet nicht. Datei lesen: `.agents/skills/designbook/resources/cli-playwright.md`.

- [ ] **Step 2: Pattern-Abschnitt einfügen** nach dem Block "### Element screenshot via snapshot ref":

````markdown
### Isolate-and-capture (Element freistellen, full-page transparent)

Statt das Bounding-Box-Rechteck eines Elements zu croppen: das erste gematchte
Element ans `body`-Root heben, alles andere entfernen, Hintergrund transparent,
dann den ganzen Viewport full-page transparent screenshoten. Das Element rendert
self-sizing am Breakpoint-Viewport; überlappende Fremd-Elemente und Hintergrund
fallen weg.

> **Wichtig:** Der zweite Parameter von `eval` ist ein **Element-Ref**, kein Wert —
> daher KANN ein Selektor nicht als Argument übergeben werden. Treffer-Erkennung
> per `eval` (Trefferzahl, branchbar in der Shell); das Freistellen per `run-code` +
> `page.evaluate` mit **inline eingebettetem** Selektor.

```bash
SEL='<css-selector>'   # in den run-code-String eingebettet (Single-Quotes außen)
npx playwright-cli -s=$WS open
npx playwright-cli -s=$WS goto "${url}"
npx playwright-cli -s=$WS resize ${viewportWidth} 1600
npx playwright-cli -s=$WS run-code "async (page) => { await page.waitForTimeout(3000) }"
# (optional) check.steps hier ausführen — im VOLLEN Layout, vor dem Freistellen

# 1) Treffer-Erkennung (gibt die Zahl auf stdout zurück):
COUNT=$(npx playwright-cli -s=$WS eval "() => document.querySelectorAll('${SEL}').length")
if [ "$COUNT" = "0" ]; then
  # full-page-Fallback + Warnung (NIE fail)
  npx playwright-cli -s=$WS run-code "async (page) => { await page.screenshot({ path: '${STAGED}', fullPage: true }) }"
else
  # 2) Freistellen (Hoist ans body-Root):
  npx playwright-cli -s=$WS run-code "async (page) => {
    await page.evaluate(() => {
      const el = document.querySelector('${SEL}');
      document.body.replaceChildren(el);
      el.style.margin = '0';
      el.style.inset = 'auto';
      document.documentElement.style.background = 'transparent';
      document.body.style.background = 'transparent';
      document.body.style.margin = '0';
    });
  }"
  npx playwright-cli -s=$WS run-code "async (page) => { await page.waitForTimeout(1000) }"
  # 3) Full-page transparent capturen:
  npx playwright-cli -s=$WS run-code "async (page) => { await page.screenshot({ path: '${STAGED}', fullPage: true, omitBackground: true }) }"
fi
npx playwright-cli -s=$WS close
```

- Trefferzahl `0` → full-page-Fallback + Warnung (nie fail). Expliziter Branch.
- Dem Element wird KEINE Breite aufgezwungen — Media-Queries reagieren auf die
  Breakpoint-Viewport-Breite. Container-Queries siehe Spec-Limitations.
- `omitBackground: true` + transparenter body-bg → Leerraum ist transparent.
- Selektor mit Single-Quotes (z.B. `[data-x='y']`) bricht das Inline-Quoting —
  in dem seltenen Fall doppelte Quotes im Selektor verwenden oder escapen.
- Limitations (akzeptiert): `querySelector` pierct nicht in Shadow-DOM/iframes;
  out-of-flow Descendants können trotz full-page abgeschnitten werden.
````

- [ ] **Step 3: `pnpm check`** — Run: `pnpm check`. Expected: PASS (Markdown-Änderung berührt keinen TS/Test).

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/resources/cli-playwright.md
git commit -m "docs(cli-playwright): add isolate-and-capture pattern"
```

---

### Task 2: Element-capture-Sektion in playwright-capture.md auf ISOLATE umstellen

**Files:**
- Modify: `.agents/skills/designbook/design/rules/playwright-capture.md` (Sektion "### Element capture (region with CSS selector)", Zeilen ~50–75; Constraint-Liste, Zeilen ~87–91)

**Interfaces:**
- Consumes: Pattern "Isolate-and-capture" aus `cli-playwright.md` (Task 1).
- Produces: Das verbindliche ISOLATE-Protokoll, auf das die Tasks `capture-storybook.md` und `capture-reference.md` (Tasks 3, 4) verweisen.

- [ ] **Step 1: Skill-Gate (zwingend)** — `designbook-skill-creator` laden, dann `rules/rule-files.md` + `rules/common-rules.md` lesen. Danach Datei lesen: `.agents/skills/designbook/design/rules/playwright-capture.md`.

- [ ] **Step 2: Sektion "### Element capture (region with CSS selector)" ersetzen.** Alten Block (von der Überschrift bis vor "## Constraints") durch ersetzen:

````markdown
### Element capture (region with CSS selector)

Do NOT crop the element's bounding box. Instead **isolate** the first matched
element and capture the whole viewport full-page & transparent — see the
**Isolate-and-capture** pattern in [cli-playwright.md](../../resources/cli-playwright.md).
There is NO `snapshot`/`screenshot <ref>` path any more.

Protocol after `resize` + settle (and after any `check.steps`):

```bash
SEL='<css-selector>'
# 1) Detect matches (eval prints the count; branch in the shell):
COUNT=$(npx playwright-cli -s=<ws> eval "() => document.querySelectorAll('${SEL}').length")
if [ "$COUNT" = "0" ]; then
  # selector matched nothing → full-page fallback + warn, never fail
  npx playwright-cli -s=<ws> run-code "async (page) => { await page.screenshot({ path: '<STAGED>', fullPage: true }) }"
else
  # 2) isolate (hoist first match to body root):
  npx playwright-cli -s=<ws> run-code "async (page) => {
    await page.evaluate(() => {
      const el = document.querySelector('${SEL}');
      document.body.replaceChildren(el);
      el.style.margin = '0';
      el.style.inset = 'auto';
      document.documentElement.style.background = 'transparent';
      document.body.style.background = 'transparent';
      document.body.style.margin = '0';
    });
  }"
  npx playwright-cli -s=<ws> run-code "async (page) => { await page.waitForTimeout(1000) }"
  # 3) full-page transparent capture:
  npx playwright-cli -s=<ws> run-code "async (page) => { await page.screenshot({ path: '<STAGED>', fullPage: true, omitBackground: true }) }"
fi
```

This mode applies to **both** captures, but each side uses its OWN selector — the
story DOM (design-system components) differs from the reference DOM:
- the **Storybook story** capture isolates `check.selector`
- the **reference** capture isolates `check.reference_selector`

Why isolate instead of crop: cropping the bbox drags in overlapping neighbors and
background pixels (false diffs), and crops the element inside its original layout
container so its responsive width is wrong. Isolating hoists the first match to the
`body` root — the element self-sizes against the breakpoint viewport, media queries
respond correctly, and transparent background drops out of the diff on both sides.
A component is standalone by design; if a reference element breaks once detached
from its ancestors, that is a real finding, not noise.

When the match count is `0`, fall back to full-page (skip-with-warning), never fail.
This lets a shell header verify use `.page__header` for the story and `app-site-header`
for the reference, or an entity use an empty story selector (full component) with
`app-signage` for the reference.

**Known limitations (accepted):** `document.querySelector` does not pierce Shadow
DOM or iframes — selectors into a web component's shadow root or an embedded iframe
match nothing and fall back to full-page (use a light-DOM/host selector instead).
`@container` queries whose container ancestor is removed by the hoist may stop
applying. Out-of-flow descendants (`position: absolute/fixed`) may not extend the
scroll height and can be clipped despite full-page.
````

- [ ] **Step 3: Stale-Ref-Constraint streichen.** In der "## Constraints"-Liste den Bullet entfernen, der mit **`resize` invalidates element refs.** beginnt — nach der Umstellung gibt es KEINEN `snapshot`/`<ref>`-Pfad mehr (auch empty-selector Story isoliert, siehe Task 3), also ist die Constraint gegenstandslos. Den Bullet "Reuse an open session across multiple captures for the same URL — only `open`/`close` once" behalten.

- [ ] **Step 4: `pnpm check`** — Run: `pnpm check`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook/design/rules/playwright-capture.md
git commit -m "feat(playwright-capture): isolate element instead of bbox crop"
```

---

### Task 3: capture-storybook.md Schritt 2 auf Isolation umformulieren

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/capture-storybook.md` (Abschnitt "## Execution", Schritt 2a/2b, Zeilen ~47–49)

**Interfaces:**
- Consumes: ISOLATE-Protokoll aus `playwright-capture.md` (Task 2).

- [ ] **Step 1: Skill-Gate (zwingend)** — `designbook-skill-creator` laden, `rules/task-files.md` + `rules/common-rules.md` lesen. Datei lesen.

- [ ] **Step 2: Schritt 2a + 2b ersetzen** durch:

````markdown
   a. **Resolve viewport width** from `design-tokens.yml` and the **story selector**
      from the check's `selector` field. When `selector` is empty, use
      `#storybook-root` as the selector (the rendered story container) — NOT
      `--full-page`, which would capture the empty 1600px viewport around an isolated
      component.

   b. **Capture** using the **isolate-and-capture** mode of the `playwright-capture`
      rule: hoist the first matched element (the resolved `selector`, or
      `#storybook-root` when empty) to the `body` root and screenshot full-page
      transparent — NOT a bbox crop and NOT a `screenshot <ref>`. When `check.steps`
      are present, run them against the iframe BEFORE isolating, so the story is in
      the check's interaction state.
````

- [ ] **Step 3: `pnpm check`** — Run: `pnpm check`. Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/design/tasks/capture-storybook.md
git commit -m "feat(capture-storybook): use isolate-and-capture for selector regions"
```

---

### Task 4: capture-reference.md Schritt 2 auf Isolation umformulieren

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/capture-reference.md` (Abschnitt "## Execution", Schritt 2, Zeilen ~59–68)

**Interfaces:**
- Consumes: ISOLATE-Protokoll aus `playwright-capture.md` (Task 2).

- [ ] **Step 1: Skill-Gate (zwingend)** — `designbook-skill-creator` laden, `rules/task-files.md` + `rules/common-rules.md` lesen. Datei lesen.

- [ ] **Step 2: Schritt 2 ersetzen** durch:

````markdown
2. **Capture screenshot** for this breakpoint/region using the `playwright-capture` rule.

   - When `check.reference_selector` is non-empty, use **isolate-and-capture** mode —
     hoist the first matched element to the `body` root and screenshot full-page
     transparent (this is the REFERENCE-side selector, distinct from the story's
     `check.selector`). If it matches no element, fall back to full-page and warn
     (per `playwright-capture`); do not fail.
   - When `check.reference_selector` is empty, full-page capture.

   Follow `playwright-capture.md` for viewport resolution, the isolate-and-capture
   protocol (`eval` hoist → `run-code` `page.screenshot({ fullPage, omitBackground })`),
   and the staged file flow.
````

- [ ] **Step 3: `pnpm check`** — Run: `pnpm check`. Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/design/tasks/capture-reference.md
git commit -m "feat(capture-reference): use isolate-and-capture for selector regions"
```

---

### Task 5: From-Scratch Integrations-Verifikation

**Files:**
- Keine Code-Änderung. Verifikation des End-to-End-Verhaltens.

**Interfaces:**
- Consumes: Tasks 1–4.

- [ ] **Step 1: Test-Workspace bauen** — Run: `./scripts/setup-workspace.sh isolate-verify` (vom Worktree-Root). Erwartung: Workspace mit aktueller `.agents`/`.claude`.

- [ ] **Step 2: design-verify mit Selektor-Region from-scratch laufen lassen** gegen eine Story + Referenz-URL, deren Check einen nichtleeren `selector`/`reference_selector` hat (z.B. Shell-Header `.page__header` / `app-site-header`). Bestehende Screenshots vorher löschen (disposable).

- [ ] **Step 3: Captures inspizieren** — die freigestellten PNGs öffnen/lesen. Erwartung, alle drei Schmerzpunkte behoben:
  - Leerraum neben schmalem Element ist **transparent** (Alpha-Kanal vorhanden).
  - **Kein** überlappendes Fremd-Element (Sticky/Overlay/Nachbar) im Bild.
  - Bei zwei verschiedenen Breakpoints reagiert die Element-Breite sichtbar auf die jeweilige Viewport-Breite (responsive korrekt).

- [ ] **Step 4: Kein-Treffer-Pfad prüfen** — einen Check mit absichtlich nicht-matchendem Selektor laufen lassen. Erwartung: full-page-Fallback + Warnung, Task wird NICHT als failed markiert.

- [ ] **Step 5: Ergebnis dokumentieren** — kurze Notiz (transparent ✔ / kein Overlap ✔ / responsive ✔ / Fallback ✔) im Verifikations-Output. Kein separater Commit nötig (keine Datei-Änderung); falls beim Lauf Wortlaut-Bugs in den Tasks/Rule auffallen, zurück zum jeweiligen Task.

---

## Self-Review

**Spec coverage:**
- Schmerzpunkt 1 (Hintergrund) → Task 1/2 `omitBackground` + transparent body; Task 5 Step 3 verifiziert. ✔
- Schmerzpunkt 2 (Überlappung) → Task 1/2 `body.replaceChildren(el)`; Task 5 Step 3. ✔
- Schmerzpunkt 3 (responsive) → Self-Sizing, kein erzwungenes width; Task 5 Step 3 Breakpoint-Vergleich. ✔
- Mechanik "ans body-Root heben" → `page.evaluate`-Hoist in Task 1/2. ✔
- Treffer-Erkennung getrennt + expliziter Fallback-Branch → eval-COUNT + `if`/`else` in Task 1/2; Task 5 Step 4. ✔
- Empty-Selector Story isoliert `#storybook-root` (kein Ref-Pfad) → Task 3 Step 2a/2b. ✔
- Empty-Selector Referenz = full-page → Task 4 Step 2. ✔
- Symmetrie Story/Referenz → Tasks 3 + 4. ✔
- Nebeneffekt (Stale-Ref-Constraint streichen, kein Ref-Pfad) → Task 2 Step 3. ✔
- Limitations (Shadow-DOM/iframe/Container-Query/out-of-flow Overflow) → Rule-Text Task 2 Step 2 + Task 1 Step 2 Notizen. ✔
- 4 geänderte Dateien aus Spec → Tasks 1–4. ✔

**Placeholder scan:** Keine TBD/TODO; jeder Edit-Step zeigt den vollständigen Ziel-Text. ✔

**Type consistency:** Hoist-Funktion identisch in Task 1 und Task 2 (`replaceChildren`, `margin:0`, `inset:auto`, transparent). Detection identisch (`querySelectorAll('${SEL}').length` via `eval`). Screenshot-Aufruf identisch (`fullPage: true, omitBackground: true`; Fallback ohne `omitBackground`). Kein `eval`-mit-Selektor-Argument mehr (Codex-Blocker behoben: Selektor inline in `run-code`/`page.evaluate`). ✔
