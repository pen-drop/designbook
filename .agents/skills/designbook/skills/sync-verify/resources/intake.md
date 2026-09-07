---
name: sync-verify-intake
description: Domain decisions required before planning sync-verify artifacts.
---

# sync-verify intake

1. Load the effective comparison catalogue through the [shared builder](../../../resources/workflow-building.md).
   Use its backend integration and subject-mapping rules to resolve the exact
   Storybook story, kind, backend render URL, authentication and configuration
   fix surface. Keep config-entity, entity-view mapping and full scene scopes
   distinct. Present both native locators and their intended subject to the user.
2. Resolve build/index and backend availability prerequisites before capture.
   Select corresponding subjects, native views, explicit breakpoint mappings and
   interaction states. A missing story, backend subject or required state blocks
   preparation; a whole-page fallback cannot replace an intended isolated subject.
3. Follow the [shared capture intake](../../extract-reference/resources/intake.md)
   twice, enabling the installed `storybook` and `website` extensions in the
   effective capture configuration: the Storybook integration captures the current story with role
   `reference`; the website integration captures the resolved backend render with
   role `actual`. Each capture has its own source identity, fixed workflow,
   revision and common observed-data outputs through `workflow done`.
   Preserve backend access and locator instructions in the selected website
   capture tasks. Complete both capture workflows before continuing.
4. Prepare one frozen observation query per side of each explicit comparison.
   Bind the published directories, subject/view/state identities and fingerprints
   in `comparison.reference_query` and `comparison.actual_query`. IDs and locators
   may differ between the two renders. Resolve thresholds and diff output paths
   outside the capture revisions. Storybook metadata and captures remain unchanged.
5. Build the fixed `sync-verify` definition from `compare-observations`,
   `triage-config` and `outtake`. All comparison results and issues use explicit
   predecessor inputs. Every issue identifies the backend configuration that
   produced the actual render; the Storybook component remains the reference.
   Invoke [execute-workflow](../../execute-workflow/SKILL.md) with the saved path.

Completion: both capture revisions are published, every selected pair is explicit,
and the report accounts for every comparison. After this check completes, follow
[verification handoff](../../../resources/verification-handoff.md) with the full
issue list. A later capture or repaired backend produces a new revision and a new
comparison definition rather than changing the bound evidence.
