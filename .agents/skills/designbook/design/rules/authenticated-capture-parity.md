---
trigger:
  steps: [observe, capture-file, capture-image]
---

# Authenticated Capture Parity

A backend capture must observe the same relevant user state as the reference it will be
compared against. State parity is established through the session already selected for
that state in the intake's capture block — the existing session/capture abstraction — never
through a new or improvised authentication path.

## Prove state before capturing

Before taking the screenshot, positively confirm the expected state is active — a
selector, text, or structural marker known to appear only in that state. Confirming state
is a positive check for the state's own evidence, not the mere absence of an error page:
a session that silently fails still returns a 200 and a full page, so absence-of-error
proves nothing.

## Abort, never score, on a measurement error

Any of the following mean the capture did not observe the intended state — the run is a
measurement error, not a comparison result:

- a login or sign-in page appears where the expected state is authenticated,
- a redirect landed on a 200 response for a different page than requested,
- the page renders an empty or access-guard placeholder instead of the expected content.

Abort the capture for that state on any of these. An aborted capture produces no image for
that cell and carries no diff score — downstream comparison must treat the missing capture
as blocked, per [screen-compare.md](screen-compare.md), never as a pass or a measured
deviation.

## Checks

| ID | Severity | What to verify | Where |
|---|---|---|---|
| AUTHCAP-01 | error | Each captured state carries the session declared for that state in the capture block; no ad hoc or inline authentication path is introduced | body |
| AUTHCAP-02 | error | A positive state-evidence check runs immediately before the screenshot for every state that expects a specific user state | body |
| AUTHCAP-03 | error | A login page, a same-status redirect to an unexpected page, or an empty/access-guard placeholder aborts the capture for that state and never emits a diff score | body |
