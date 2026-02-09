---
name: Verify Input
description: Verifies that the required Figma input data exists
---

# Verify Input

This skill checks that the Figma component data file exists before processing.

## Purpose
Ensures the required input file is present before transformation begins.

## Prerequisites
- Step 1: Validate Parameters (completed)

## Input
- Expected file: `.pendrop/input/pendrop.data.components.json`

## Process

1. **Check if input file exists**
   - Command: `test -f .pendrop/input/pendrop.data.components.json`
   - Check file existence in the workspace

2. **Handle missing file**
   - If file is missing:
     - Display message: "Input file not found. Please run `/pendrop-fetch-figma` first to download component data from Figma."
     - Offer to run `/pendrop-fetch-figma` automatically
     - Wait for user confirmation

3. **Verify file is not empty**
   - Check file size is greater than 0 bytes
   - Verify file contains valid JSON structure

## Output
- Confirmation that input file exists and is valid

## Error Handling
- File missing: Prompt to run `/pendrop-fetch-figma`
- File empty: Show error and suggest re-fetching
- File corrupted: Show error and suggest re-fetching

## Success Criteria
- `.pendrop/input/pendrop.data.components.json` exists
- File is not empty
- File contains valid JSON
