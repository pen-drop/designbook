## REMOVED Requirements

### Requirement: Dashboard page registration
**Reason**: Dashboard replaced by compact onboarding guide block. Full-page dashboard duplicated info from individual pages.
**Migration**: Status information is now shown in the always-visible onboarding guide block. Per-section details are on the Sections Overview page.

### Requirement: Dashboard status boxes
**Reason**: `DeboStatusBox` component only used by the dashboard page.
**Migration**: Badge-based status display in `DeboOnboardingGuide` replaces status boxes.
