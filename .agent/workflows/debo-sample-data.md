---
name: /sample-data
id: sample-data
category: Designbook
description: Create sample data and type definitions for a section
---

Help the user create realistic sample data for one of their roadmap sections. The result is saved to `${DESIGNBOOK_DIST}/sections/[section-id]/data.json`.

**Steps**

## Step 1: Check Prerequisites

Check if the following files exist:
- `${DESIGNBOOK_DIST}/product/product-overview.md` — product vision (required)
- `${DESIGNBOOK_DIST}/product/product-roadmap.md` — roadmap sections (required)
- `${DESIGNBOOK_DIST}/data-model.json` — data model (required for understanding entities)

**If product vision, roadmap, or data model are missing**, tell the user:

> "Before creating sample data, you need:
> 1. `/product-vision` — Define your product
> 2. `/product-roadmap` — Define your sections
> 3. `/data-model` — Define your data model"

Stop here.

Read all available files. Also check for an existing section specification:
- `${DESIGNBOOK_DIST}/sections/[section-id]/spec.md` — section spec (strongly recommended)

If the spec doesn't exist, warn:

> "Note: No specification found for this section. I recommend running `/shape-section` first to define the section's user flows and requirements. Proceed anyway?"

## Step 2: Select Section

Parse the roadmap to extract sections. Check which sections already have data by looking for existing files at `${DESIGNBOOK_DIST}/sections/[section-id]/data.json`.

**Section ID conversion:** Convert the section title to kebab-case by lowercasing, removing `&`, replacing non-alphanumeric characters with `-`, and trimming leading/trailing dashes.

Present the sections:

> "Here are your roadmap sections:
>
> 1. **[Section 1]** — ✓ Spec / ✓ Data / ○ No data yet
> 2. **[Section 2]** — ○ No spec / ○ No data yet
>
> Which section would you like to create sample data for?"

If the section already has data, ask: "This section already has sample data. Would you like to update it or start fresh?"

Wait for their response.

## Step 3: Analyze Data Needs

Based on the section spec and data model, analyze what data the section needs:

> "Based on the **[Section Title]** specification and your data model, this section needs:
>
> **Models needed:**
> - [Entity 1] — [why it's needed for this section]
> - [Entity 2] — [why it's needed]
>
> **Proposed data structure:**
> - [Entity 1]: [N] sample records with [key fields]
> - [Entity 2]: [N] sample records with [key fields]
>
> **Relationships:**
> - [How entities connect in this section's context]
>
> Does this look right? Any entities to add or remove?"

Wait for their response.

## Step 4: Present Sample Data

Create and present the sample data:

> "Here's the sample data for **[Section Title]**:
>
> **[Entity 1]** ([N] records):
> - [Brief summary of first record]
> - [Brief summary of second record]
>
> **[Entity 2]** ([N] records):
> - [Brief summary]
>
> The data includes:
> - Realistic content (names, descriptions, dates)
> - Varied data (different lengths, categories, statuses)
> - Edge cases (empty optional fields, long text)
>
> Shall I save this?"

Iterate until the user is satisfied.

## Step 5: Save the File

Once approved, create the file at `${DESIGNBOOK_DIST}/sections/[section-id]/data.json` with this format:

```json
{
  "_meta": {
    "models": {
      "entityName": "Description of what this entity represents in this section",
      "anotherEntity": "Description"
    },
    "relationships": [
      "Entity A has many Entity B",
      "Entity B belongs to Entity A"
    ]
  },
  "entityName": [
    {
      "id": "1",
      "field1": "value",
      "field2": "value"
    }
  ],
  "anotherEntity": [
    {
      "id": "1",
      "field1": "value",
      "entityNameId": "1"
    }
  ]
}
```

Create the directory `${DESIGNBOOK_DIST}/sections/[section-id]/` if it doesn't exist.

## Step 6: Confirm Completion

> "I've saved the sample data to `${DESIGNBOOK_DIST}/sections/[section-id]/data.json`.
>
> **[Section Title] sample data:**
> - [N] models defined
> - [N] total records
> - Relationships documented
>
> Open Storybook to see the data on the section page. You can run `/sample-data` again to update it, or proceed to `/design-screen` for screen designs."

**Guardrails**
- Create 5–10 records per entity (enough to demonstrate UI patterns like lists, pagination, empty states)
- Use realistic, varied content — not placeholder text like "Lorem ipsum"
- Include edge cases: long names, empty optional fields, different statuses
- Model IDs should be simple strings ("1", "2", etc.)
- Relationships should use foreign key patterns (e.g., `"serviceId": "1"`)
- The `_meta` section is required — it documents what each model represents and how they relate
- The JSON format must be valid and parseable
- Reference the data model for entity structure and relationships
- Reference the section spec for what data the UI needs to display
