# Plan: Robust Storybook reload — phase separation over per-flush reload

Status: PROPOSAL (for review). No code yet.

## Problem

The current model writes component/story/scene files **while Storybook is
running** and signals incremental reloads. Storybook/SDC build the story index,
the Twig namespace map and the Twig template cache **once at startup** and have no
native "files appeared mid-run" support. We bridge that with a stack of
interacting workarounds:

1. `.workflow-trigger` file + chokidar watcher + `server.restart()` (side channel).
2. Native HMR via the dev-server watcher tracking the story-glob roots.
3. Namespace map (`toTwingNamespaces`) — startup-only → new namespace needs restart.
4. Twig template cache — survives `server.restart()` → "Cannot find template".

Each layer is a workaround for the same root and each is a failure point we have
already hit:
- deaf trigger watcher (fixed #75),
- over-restart on every flush → reload churn → polish recapture stall (fixed #86),
- template cache after restart (open, vendored plugin),
- `optimizeDeps`/semver client breakage (fixed #83),
- schema `$ref` isolation (fixed #84).

It works, but it is **fragile by construction**: correctness depends on the
precise interaction of 4 startup-bound caches + 2 watchers + a restart side
channel.

## What is already solved (keep)

- **Glob-root existence** lives in `storybook start` (#75 `storyGlobDirs` reads the
  `stories` globs from `.storybook/main.js` and `mkdir`s the roots before spawn).
  Generic, works for any consumer — no `.gitkeep` needed. This stays regardless of
  the model below.
- **Restart gating** (#86): only a new component directory forces a restart.

## Proposed model — separate BUILD from CAPTURE

The design-shell stages already run **isolated subagents per stage**. Reorder so
that file-producing stages do **not** depend on a live, incrementally-reloading
Storybook:

1. **Build phase** (component → scene): write all `.component.yml` / `.twig` /
   `.story.yml` / scene files to disk. Storybook need not be running, or may be
   running but is **not** relied on for rendering yet. No reload signalling.
2. **Single clean start**: once all files exist, (re)start Storybook **once**.
   Because every glob root + file is present at startup, the story index,
   namespace map and template cache are built complete and correct — exactly the
   case all four caches handle natively. No trigger, no incremental restart.
3. **Capture / compare phase**: Storybook is now stable and complete → capture +
   compare with no reload during the pass.
4. **Polish loop**: the only place that mutates files after the clean start. Bound
   it: apply a round of fixes, then **one** `storybook start --force` per round
   (a deliberate phase boundary), then recapture. N rounds → N restarts, not one
   per flush. (Today polish recaptures churn because every flush restarted.)

Net: `server.restart()` becomes a **deliberate phase boundary** (clean start;
once per polish round), never a per-flush side effect. The `.workflow-trigger`
side channel + per-flush gating can be retired — the workflow decides when to
restart, explicitly.

## What this removes / simplifies

- The `.workflow-trigger` write-on-flush + watcher + `onTrigger` restart side
  channel (the whole class). The flush no longer signals anything.
- The #86 heuristic ("new component dir → restart") — superseded by the explicit
  clean-start boundary.
- Reliance on native HMR mid-run for correctness (it becomes a nice-to-have for
  interactive dev, not load-bearing for the workflow).
- The template-cache-after-restart problem becomes moot in the common path (the
  clean start has everything; polish restarts are full+clean).

## Trade-offs / open questions (for review)

1. **Cost of `start --force`** — a clean Storybook start takes ~10–15s. Build→
   single-start adds one start; polish adds one per round. Acceptable vs the
   current churn (we measured 124 reload events in one fable verify)?
2. **Stage isolation interplay** — capture/compare already run as isolated
   subagents; does moving the "clean start" to a workflow step (between scene and
   validate) fit the engine's `before/after`/stage model cleanly?
3. **Polish round boundary** — how to express "fix round → one restart → recapture"
   in the design-verify workflow (re-capture/re-compare stages already exist).
   Bound the number of rounds (e.g. ≤2) to avoid unbounded loops.
4. **Daemon start latency** — can `storybook start --force` be made faster
   (warm cache reuse) so per-round restarts are cheap?
5. **Backwards** — per project rule, no migration; the engine just stops writing
   the trigger and the start CLI gains a "rebuild" step. Confirm no consumer
   depends on the trigger.
6. **Does a single clean start actually avoid ALL the cache issues?** Empirically
   verify: build a full component set on disk, `storybook start`, confirm index +
   namespaces + templates all resolve with zero reloads and zero "Cannot find
   template".

## Out of scope

- The dispatched-subagent-never-returns / no-parent-timeout issue (separate; a
  stalled stage should be detectable/bounded regardless of the reload model).
- `compare-images` deterministic scoring (separate plan, PR #85).
