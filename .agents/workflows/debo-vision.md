---
name: /debo-vision
id: debo-vision
category: Designbook
description: Define your product vision through a guided conversation
workflow:
  title: Define Product Vision
  stages: [dialog, create-vision]
---

Help the user define their product vision for Designbook. This is a conversational, multi-step process. The result is saved to `${DESIGNBOOK_DIST}/product/vision.md`.

> **Spec Mode (`--spec`):** If the user passes `--spec`, do NOT create or modify any files. Instead, output a structured YAML plan showing what WOULD be created — file paths and content summaries. This enables testing without side effects.
**Steps**

## Step 0: Load Workflow Tracking

Load the `designbook-workflow` skill via the Skill tool.

## Step 1: Gather Initial Input

Ask the user to share their raw notes, ideas, or thoughts about the product they want to build. Be warm and open-ended:

> "I'd love to help you define your product vision. Tell me about the product you're building — share any notes, ideas, or rough thoughts you have. What problem are you trying to solve? Who is it for? Don't worry about structure yet, just share what's on your mind."

Wait for their response before proceeding.

## Step 2: Ask Clarifying Questions

After receiving their input, ask 3-5 targeted questions to help shape:

- **The product name** — A clear, concise name for the product
- **The core product description** (1-3 sentences that capture the essence)
- **The key problems** the product solves (1-5 specific pain points)
- **How the product solves each problem** (concrete solutions)
- **The main features** that make this possible

**Important:** If the user hasn't already provided a product name, ask:
- "What would you like to call this product? (A short, memorable name)"

Other example clarifying questions (adapt based on their input):
- "Who is the primary user of this product? Can you describe them?"
- "What's the single biggest pain point you're addressing?"
- "How do people currently solve this problem without your product?"
- "What makes your approach different or better?"
- "What are the 3-5 most essential features?"

Ask questions one or two at a time, and engage conversationally.

## Step 3: Present Draft and Refine

Once you have enough information, present a draft summary:

> "Based on our discussion, here's what I'm capturing for **[Product Name]**:
>
> **Description:** [Draft 1-3 sentence description]
>
> **Problems & Solutions:**
> 1. [Problem] → [Solution]
> 2. [Problem] → [Solution]
>
> **Key Features:**
> - Feature 1
> - Feature 2
> - Feature 3
>
> Does this capture your vision? Would you like to adjust anything?"

Iterate until the user is satisfied. Once approved, the `create-vision` stage runs automatically.

**Dialog Constraints**
- Be conversational and helpful, not robotic
- Ask follow-up questions when answers are vague
- Help the user think through their product, don't just transcribe
- Always ensure the product has a name before moving on
