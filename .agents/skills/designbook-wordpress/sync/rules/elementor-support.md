---
trigger:
  steps: [sync-to:intake, sync-to:transform]
filter:
  backend: wordpress
---

# Rule: Elementor Support

The fixture **pins** one Elementor Free build. The adapter **extends** that install. A **bump** is a new pin plus a fresh fixture run. Current pin values live in `packages/integrations/wordpress-fixture/ELEMENTOR.md`.

| ID | Constraint |
|---|---|
| EL-01 | Fixture Composer `require` names one exact Elementor Free version. The version and dist URL are the values in `ELEMENTOR.md`. |
| EL-02 | The dist content hash sits next to that pin in `ELEMENTOR.md`. |
| EL-03 | Workspaces install Elementor from the fixture Composer lock into `wp-content/plugins/elementor`. Adapter PHP and editor JS extend that install's widget and Nested Elements APIs. |
| EL-04 | **Refuse** missing Elementor, a version other than the pin, or unavailable Nested Elements: report the reason, skip widget registration and seed writes, keep PHP running. |
| EL-05 | A pin bump is a fresh fixture run that covers editor save/reopen and frontend parity. Seeded documents match the new pin. |
