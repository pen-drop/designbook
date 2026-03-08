## 1. Infrastructure Setup

- [x] 1.1 Create `promptfoo/scripts/clean.sh` — removes `promptfoo/workspaces/` directory
- [x] 1.2 Add `promptfoo/workspaces/` to `.gitignore`
- [x] 1.3 Update `promptfoo/README.md` with new directory structure documentation

## 2. PetMatch Fixture Content

- [x] 2.1 Create shared PetMatch `product-overview.md` for fixtures
- [x] 2.2 Create shared PetMatch `data-model.yml` for fixtures
- [x] 2.3 Create shared PetMatch `design-tokens.yml` for fixtures
- [x] 2.4 Create shared PetMatch `sections/homepage/overview.section.yml` for fixtures
- [x] 2.5 Create shared PetMatch `sections/homepage/spec.md` for fixtures
- [x] 2.6 Create shared PetMatch `components/pet-card/pet-card.component.yml` and `.twig` for fixtures
- [x] 2.7 Create shared PetMatch `sections/homepage/data.yml` for fixtures

## 3. Per-Workflow Fixture Directories

- [x] 3.1 Create `promptfoo/fixtures/debo-product-vision/` (1 file: config only)
- [x] 3.2 Create `promptfoo/fixtures/debo-product-sections/` (2 files: config + product-overview)
- [x] 3.3 Create `promptfoo/fixtures/debo-design-tokens/` (2 files: config + product-overview)
- [x] 3.4 Create `promptfoo/fixtures/debo-data-model/` (2 files: config + product-overview)
- [x] 3.5 Create `promptfoo/fixtures/debo-css-generate/` (3 files: config + product-overview + tokens)
- [x] 3.6 Create `promptfoo/fixtures/debo-shape-section/` (3 files: config + product-overview + section)
- [x] 3.7 Create `promptfoo/fixtures/debo-design-component/` (4 files: config + product-overview + section + tokens)
- [x] 3.8 Create `promptfoo/fixtures/debo-sample-data/` (4 files: config + product-overview + section + data-model)
- [x] 3.9 Create `promptfoo/fixtures/debo-design-screen/` (9 files: full fixture set)
- [x] 3.10 Create `promptfoo/fixtures/debo-design-shell/` (4 files: config + product-overview + section + tokens)

## 4. Unified Promptfoo Config

- [x] 4.1 Create `promptfoo/promptfooconfig.yaml` — single self-contained config with:
  - 12 named prompts (inlined, no external files)
  - Per-test prompt selector (avoids combinatorial explosion)
  - Dual providers (gemini-3-pro + claude-opus-4-6)
  - llm-rubric assertions for all 10 workflows + 2 addon integration tests
  - Optional Storybook verification on component-generating workflows

## 5. Verification

- [ ] 5.1 Run `promptfoo/scripts/clean.sh` and verify workspaces are cleared
- [ ] 5.2 Run one workflow test: `npx promptfoo eval -c promptfoo/promptfooconfig.yaml --filter-pattern "product-vision"`
- [ ] 5.3 Run all workflow tests: `npx promptfoo eval -c promptfoo/promptfooconfig.yaml`
- [ ] 5.4 Document multi-integration parameterization (drupal now, react planned) in README
