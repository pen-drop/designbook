# Promptfoo Test Results — Error Log

> **Run:** `eval-K5e-2026-03-08T00:23:38`
> **Duration:** 35 min | **Tokens:** 416k (237k eval + 179k grading)
> **Results:** ✅ 10 passed | ❌ 11 failed | ⚠️ 3 SDK errors | **41.67% pass rate**

## Summary by Provider

| Provider | Passed | Failed | Error | Total |
|---|---|---|---|---|
| claude-opus-4-6 | 8 | 1 | 3 | 12 |
| gemini-3.1-pro | 2 | 10 | 0 | 12 |

## Summary by Test

| Test | Opus | Gemini |
|---|---|---|
| product-vision | ✅ | ✅ |
| product-sections | ✅ | ❌ missing `title` field |
| design-tokens | ❌ summary only | ❌ summary only |
| data-model | ❌ no validation mention | ❌ no field details |
| css-generate | ✅ | ✅ |
| shape-section | ✅ | ❌ no file contents |
| design-component | ⚠️ fetch failed | ❌ no `.story.yml` mention |
| sample-data | ✅ | ❌ generated JSON not YAML |
| design-screen | ✅ | ❌ summary only |
| design-shell | ❌ no Storybook mention | ✅ (graded pass!) |
| addon-data-model | ⚠️ fetch failed | ✅ (but rendering issues) |
| addon-design-tokens | ⚠️ fetch failed | ❌ console errors |

---

## Error Details

### Category 1: Assertions Too Strict — Agent Summarizes Instead of Showing File Contents

**Affected tests:** design-tokens (both), data-model (both), shape-section (gemini), design-screen (gemini)

**Pattern:** The agent creates files correctly but only reports a summary in the conversation. The `llm-rubric` grader can only see the conversation output, not the actual files. When the rubric says "verify the file contains X", the grader fails because the conversation summary doesn't include full file contents.

**Fix (Skill):** `designbook-tokens`, `designbook-data-model`, `designbook-screen`
- Each SKILL.md should instruct the agent to echo key file contents (or relevant excerpts) back to the user after creation.
- Alternatively, relax assertions to accept confirmations of file creation + summary of content instead of requiring exact format verification.

**Recommended config change:**
```yaml
# Change assertions from:
assert:
  - type: llm-rubric
    value: |
      3. Each color token has $value (hex format) and $type: color

# To:
assert:
  - type: llm-rubric
    value: |
      3. The output mentions or shows token values in hex format (like #XXXXXX)
```

---

### Category 2: Wrong File Format/Path

**Test:** sample-data (gemini)
**Error:** Generated JSON instead of YAML data file
**Reason:** Gemini didn't read/follow the `//sample-data` workflow skill which specifies YAML output
**Fix (Skill):** `designbook-screen` / sample-data workflow
- Reinforce in SKILL.md that output MUST be YAML, not JSON

**Test:** product-vision (gemini, previous run)
**Error:** Wrote to `designbook/petmatch_product_vision.md` instead of `product/product-overview.md`
**Fix (Skill):** `designbook-configuration` / product-vision workflow
- Make the output path explicit and non-negotiable in the prompt

---

### Category 3: OpenCode SDK Connectivity (fetch failed)

**Affected tests:** design-component (opus), addon-data-model (opus), addon-design-tokens (opus)
**Error:** `Error calling OpenCode SDK: TypeError: fetch failed`
**Reason:** Intermittent connectivity to the opencode daemon. Likely token refresh or rate limit.
**Fix (Infrastructure):** Not a skill issue — this is an SDK/daemon stability issue.
- Add retry logic to promptfoo config (if supported)
- Increase timeout
- Check opencode daemon health before running tests

---

### Category 4: Missing Required Output Details

**Test:** product-sections (gemini)
**Error:** YAML files missing `title` field
**Fix (Skill):** `designbook-screen` / sections workflow
- SKILL.md should explicitly list required YAML fields: `id, title, description, status, order`

**Test:** design-component (gemini)
**Error:** No `.story.yml` file mentioned in output
**Fix (Skill):** `designbook-drupal-components-ui`
- SKILL.md should ensure story file creation is always reported

**Test:** design-shell (opus)
**Error:** No Storybook mention in completion message
**Fix (Skill):** Shell workflow
- Add Storybook reference to completion message template

---

### Category 5: Storybook Rendering Issues

**Test:** addon-design-tokens (gemini)
**Error:** Console SyntaxError on page load, "Application Shell" section blank
**Fix (Skill):** `designbook-addon-components`
- Debug the SyntaxError in the Design System page component
- Ensure Application Shell section has fallback content when no shell-spec.md exists

---

## Skill Integration Map

| Error Category | Skill to Fix | Priority |
|---|---|---|
| Assertions too strict | Assertion rubrics in `promptfooconfig.yaml` | 🔴 High |
| Summary-only output | All workflow SKILLs (add "echo file contents" instruction) | 🟡 Medium |
| Wrong file format (JSON vs YAML) | `designbook-screen` + sample-data workflow | 🟡 Medium |
| Missing YAML fields | Section/component workflow SKILLs | 🟡 Medium |
| SDK fetch failures | OpenCode infrastructure (not a skill) | 🟠 Infra |
| Storybook SyntaxError | `designbook-addon-components` | 🔴 High |

---

## Recommendations

1. **Relax assertion rubrics** — Change from "verify file contains X format" to "verify agent confirms X was created with expected properties". The grader only sees conversation output, not actual files.

2. **Add `--output-verbose` or file echo** — Each SKILL.md should include a step to `cat` or echo the created file's key sections back to the conversation.

3. **Increase SDK timeout** — The current 120s timeout may be too low for complex workflows that scaffold multiple files. Consider 300s.

4. **Debug Storybook SyntaxError** — The addon has a rendering issue on the Design System page that needs investigation.

5. **Run Gemini and Opus separately** — The 3 fetch failures all hit Opus, suggesting rate limiting when both providers run concurrently. Consider `--max-concurrency 1` or staggered runs.
