# DESIGNBOOK-26 — Spec & Implementation Plan

**Ticket:** `designbook-gaia`: GAIA-Step-Skills für die Designbook-Work-Types ins Designbook-Repo überführen
**Workflow:** `gaia_chore` · **Sub-work:** `work:docs` · **Task-Art:** `skill-authoring`
**Runtime surface:** none (Skill-Markdown + `marketplace.json` entry) → doc-structural verification.

---

## 1. Problem

The two GAIA step-skills that encode **Designbook** domain knowledge —
`debo-designbook-design` (`work_type: design-to-designbook`) and `debo-config-sync`
(`work_type: designbook-to-config`) — currently live in the **gaia** plugin
(`~/projects/gaia/.claude/skills/gaia/skills/`). This makes the gaia plugin the owner of
Designbook-specific knowledge (debo flags, `design-verify`/`config-verify`, Storybook & Drupal
preview links, `design_verify`/`config_verify` measurements) even though **Designbook is the source
of that knowledge**.

**Goal:** a new integration skill **`designbook-gaia`** in the Designbook repo provides both step
skills. Designbook becomes the sole owner. The gaia-repo copies are removed and its `WORKFLOW.md`
repointed to `@designbook-gaia/...` — as a **separate MR/ticket in the gaia repo** (out of scope
here; not reachable from the Designbook worktree).

## 2. Decision (design)

Create `.agents/skills/designbook-gaia/` mirroring the **proven nested-sub-skill layout** of the
`designbook` core plugin (DESIGNBOOK-25): a parent `SKILL.md` index plus real sub-skills under
`skills/<name>/SKILL.md`. Each sub-skill is a **1:1 port** of the current gaia body and frontmatter
(`when` triple, `inputs` with `description`+`default`) — only the *home plugin* changes, not the
contract. All helper invocations stay `@gaia/...`; **no helper is copied**, so `designbook-gaia` is
deliberately non-runnable without the gaia plugin loaded (documented in its `SKILL.md`).

```
.agents/skills/designbook-gaia/
  SKILL.md                              # index: what this skill provides, the @gaia/workflow-step
                                        #   contract reference, the cross-plugin dependency note,
                                        #   load-lines + a copyable WORKFLOW.md consumer block
  skills/
    debo-designbook-design/SKILL.md     # when: work_type design-to-designbook  (1:1 port)
    debo-config-sync/SKILL.md           # when: work_type designbook-to-config   (1:1 port)
```

Register it as the 5th plugin in `.claude-plugin/marketplace.json`
(`source: ./.agents/skills/designbook-gaia`, `skills: ["./"]`) — the same marketplace mechanics the
`designbook` core plugin already uses to expose its 17 nested sub-skills. Add `designbook-gaia` to
the Part-3 integration list in `CLAUDE.md`.

## 3. Resolved open decisions

| # | Decision | Choice | Rationale | Rejected alternative |
|---|---|---|---|---|
| **D1** | Sub-skill names | **Keep** `debo-designbook-design` / `debo-config-sync` | Minimal gaia-repo diff (only the `@gaia/` → `@designbook-gaia/` namespace prefix moves); `name:` and the `when` triple are unchanged, so the load-time coverage/collision validator of `@gaia/initialize-project`/`@gaia/upgrade-project` is untouched; the ↔gaia parallel stays obvious. | Shorten to `design`/`config-sync` — extra rename churn in the gaia repointing, and a `name:` collision risk against the debo-core `design-*` sub-skills. |
| **D2** | Measurement definitions (`design-verify.json`, `config-verify.json`) | **Keep in gaia** (`review-ticket/measurements/definitions/`); ported bodies keep the reference verbatim | The definitions are consumed by the `@gaia/implement-ticket`/`@gaia/review-ticket` measurement machinery via that exact path and PATCHed into `gaia_ticket.metrics` per gaia's measurement-subsystem README — they are gaia measurement-system artifacts, not *loadable* Designbook content. Moving them breaks path resolution and forces gaia-repo code changes (out of scope). | Move the two JSON defs into `designbook-gaia` — splits the measurement subsystem, breaks the machinery path, needs gaia code changes. |
| **D3** | Consumer doc block | **Yes** — `designbook-gaia/SKILL.md` ships a copyable `WORKFLOW.md` block (load-lines + typical overrides incl. `provision: ddev init --provider recipe-test`) | Low cost, high value; mirrors what gaia's `WORKFLOW.md`/`README.md` already carry, so a consuming project can wire the skills without reverse-engineering. | Omit — every consumer re-derives the wiring. |
| **D4** | `designbook-skill-creator` guardrail | **Does not apply**; add one clarifying line to `CLAUDE.md`, **no** new skill-creator rule | CLAUDE.md's guardrail (line 31) is scoped to `task/rule/blueprint/workflow/schemas.yml` files of the debo 4-level model. `designbook-gaia` ships **only `SKILL.md`** GAIA-step prose — none of the guarded types — so the guardrail already excludes it by its own wording. A short note keeps that explicit. | Add a skill-creator rule for GAIA-step skills — over-engineering; the guardrail does not match these files at all. |

## 4. Port fidelity — what stays byte-identical

- **Frontmatter `when` triples** (AC2): `work_type` `design-to-designbook` / `designbook-to-config`,
  `workflow: [gaia_feature, gaia_bug, gaia_chore]`, `step: [diagnose, spec, coding, review]`.
- **`inputs`** (AC3): `spec`, `build`, `validate`, `provision`, each with `description` + `default`
  (`debo <workflow> --plan`, `debo <workflow> --from-plan <plan>`, `debo design-verify` /
  `debo config-verify`, `ddev init`).
- **Step bodies** (AC4): Shared Start (with `@gaia/ensure-qualification` for `spec`/`diagnose`/
  `coding`, **not** `review`), RED/GREEN gate, measurement recording before the transition,
  `@gaia/run-outtake`, human confirmation, transition destination, origin-publish, STOP, plus
  "Multi-work single transition".
- **Helper references** (AC5): every `@gaia/...` invocation unchanged; the `measurements/
  definitions/{design,config}-verify.json` reference stays gaia-relative.

The only edits vs. the gaia originals: the parent `SKILL.md` is new (index + cross-plugin note +
consumer block); the sub-skill bodies are copied verbatim (their internal `@gaia/...` references are
already correct and unchanged).

## 5. Risks

- **R1 — Contract drift.** If a `when` value is altered during the port, the gaia load-time
  validator throws a coverage gap/collision. *Mitigation:* diff the ported frontmatter against the
  gaia originals; the port is verbatim.
- **R2 — Nested-skill addressability (AC7).** Nested `skills/<name>/` registration must be *proven*,
  not assumed. *Mitigation:* mirror the DESIGNBOOK-25 layout exactly and run the concrete check in
  §6 (workspace rebuild + skill listing / load of `@designbook-gaia/debo-designbook-design`).
- **R3 — Cross-plugin dependency.** `designbook-gaia` is non-runnable without gaia. *Mitigation:*
  documented explicitly in `SKILL.md`; this is intended, not a defect.
- **R4 — gaia-side follow-up not reachable here.** The gaia-repo removal/repointing is a mandatory
  counterpart. *Mitigation:* AC10 — link/note it on the ticket in the coding step.

## 6. Acceptance ↔ evidence matrix

| AC | What proves it (doc-structural) |
|---|---|
| 1 — dir + 3 `SKILL.md` | `ls .agents/skills/designbook-gaia/{SKILL.md,skills/debo-designbook-design/SKILL.md,skills/debo-config-sync/SKILL.md}` |
| 2 — `when` triples unchanged | `diff` ported frontmatter vs. gaia originals; grep `work_type`/`workflow`/`step` |
| 3 — inputs + defaults | grep `inputs:` block for `spec`/`build`/`validate`/`provision` each with `description`+`default`; values match gaia |
| 4 — bodies complete | grep each step heading + `ensure-qualification`, `run-outtake`, `transition-ticket`, "Multi-work single transition" |
| 5 — helpers stay `@gaia/`; no helper copied | grep `@gaia/` resolves; `find designbook-gaia -name SKILL.md` = exactly 3 (index + 2 steps), none of them a gaia helper |
| 6 — marketplace entry valid | `node -e 'JSON.parse(...)'`; assert `designbook-gaia` entry with `source`/`skills` |
| 7 — nested sub-skills addressable | `./scripts/setup-workspace.sh` rebuild → skill listing shows `@designbook-gaia/debo-designbook-design` & `debo-config-sync` loadable (or documented equivalent check) |
| 8 — CLAUDE.md Part-3 | grep `designbook-gaia` in the Part-3 line; assert no `@gaia/debo-*` compat alias anywhere |
| 9 — `pnpm check` green | run `pnpm check` (typecheck → lint → test) |
| 10 — gaia follow-up linked | note/link comment on the ticket (coding step) |
| 11 — standing `work:docs` AC | the grep/git-diff/JSON-validity/skill-load checks above all green |

## 7. Implementation plan (checkbox — for the coding step)

- [ ] Create `.agents/skills/designbook-gaia/skills/debo-designbook-design/SKILL.md` — verbatim
      port of the gaia body + frontmatter (no `@gaia/...` reference changed).
- [ ] Create `.agents/skills/designbook-gaia/skills/debo-config-sync/SKILL.md` — verbatim port.
- [ ] Verify the two ported frontmatters `diff`-clean against the gaia originals (only file location
      differs).
- [ ] Author `.agents/skills/designbook-gaia/SKILL.md` — index: what it provides, the
      `@gaia/workflow-step` contract reference, the **cross-plugin dependency** note (needs gaia
      loaded; copies no helper), load-lines, and a **copyable `WORKFLOW.md` consumer block**
      (load-lines + typical overrides incl. `provision: ddev init --provider recipe-test`).
- [ ] Add the `designbook-gaia` plugin entry to `.claude-plugin/marketplace.json`
      (`source: ./.agents/skills/designbook-gaia`, `strict: false`, `skills: ["./"]`, description +
      `category: "design"`); assert valid JSON.
- [ ] Add `designbook-gaia` to the `CLAUDE.md` Part-3 integration list; add the one-line note that
      GAIA-integration skills sit outside the debo 4-level model / skill-creator guardrail.
- [ ] Prove nested-sub-skill addressability: rebuild a test workspace
      (`./scripts/setup-workspace.sh`) and confirm `@designbook-gaia/debo-designbook-design` and
      `@designbook-gaia/debo-config-sync` are listed/loadable — record the evidence (AC7).
- [ ] Run `pnpm check` (typecheck → lint → test) → green (AC9).
- [ ] Add the gaia-repo follow-up (delete the two skills; repoint `WORKFLOW.md` / `README.md` /
      `templates/WORKFLOW.template.md` to `@designbook-gaia/...`) as a link/note on the ticket
      (AC10).

## 8. Artifacts

- This spec: `.gaia/specs/DESIGNBOOK-26-spec.md` (committed).
- To be created in coding: the three `SKILL.md` files, the `marketplace.json` entry, the `CLAUDE.md`
  edit.
