---
title: Resolve Dependency Closure
trigger:
  steps: [sync-to:resolve-deps]
params:
  type: object
  required: [config-set, with_deps]
  properties:
    config-set:
      description: >
        The DrupalConfigSet produced by the transform stage. This is the starting
        set of entities before dependency expansion.
      $ref: ../schemas.yml#/DrupalConfigSet
    with_deps:
      type: boolean
      description: >
        When true, expand the config-set to include all transitively reachable
        config entities via each entity's declared config dependencies.
        When false, pass the config-set through unchanged.
result:
  type: object
  required: [config-set]
  properties:
    config-set:
      description: >
        The (possibly expanded) DrupalConfigSet. When with_deps is true, includes
        the transitive closure over config dependencies. When with_deps is false,
        identical to the input config-set. Deduped by config_name.
      $ref: ../schemas.yml#/DrupalConfigSet
---

# Resolve Dependency Closure

Expand the `config-set` to include all transitively reachable config entities
when `with_deps` is true. When `with_deps` is false, pass the set through unchanged.

## Result: config-set

Run `closure` over the input `config-set` with `with_deps` and the full pool of
known config entities. The result is the deduped `DrupalConfigSet` — either the
original set (when `with_deps` is false) or the transitive closure reachable via
`data.dependencies.config[]` on each entity (when `with_deps` is true).
