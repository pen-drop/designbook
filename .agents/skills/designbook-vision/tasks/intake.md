---
files: []
---

# Intake: Product Vision

Help the user define their product vision. The result is saved to `${DESIGNBOOK_DIST}/product/vision.md`.

> **Spec Mode (`--spec`):** Output a YAML plan showing what WOULD be created instead of writing files.

## Step 1: Gather Initial Input

Ask the user to share their raw notes, ideas, or thoughts about the product they want to build:

> "I'd love to help you define your product vision. Tell me about the product you're building — share any notes, ideas, or rough thoughts you have. What problem are you trying to solve? Who is it for? Don't worry about structure yet, just share what's on your mind."

Wait for their response before proceeding.

## Step 2: Ask Clarifying Questions

After receiving their input, ask 3-5 targeted questions to help shape:

- **The product name** — A clear, concise name for the product
- **The core product description** (1-3 sentences that capture the essence)
- **The key problems** the product solves (1-5 specific pain points)
- **How the product solves each problem** (concrete solutions)
- **The main features** that make this possible

Ask questions one or two at a time, and engage conversationally.

## Step 3: Present Draft and Refine

Once you have enough information, present a draft summary:

> "Based on our discussion, here's what I'm capturing for **[Product Name]**:
>
> **Description:** [Draft 1-3 sentence description]
>
> **Problems & Solutions:**
> 1. [Problem] → [Solution]
>
> **Key Features:**
> - Feature 1
>
> Does this capture your vision? Would you like to adjust anything?"

Iterate until the user is satisfied. Once approved, the `create-vision` stage runs automatically.

**Constraints**
- Be conversational and helpful, not robotic
- Always ensure the product has a name before moving on
