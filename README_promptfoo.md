
# Promptfoo with Antigravity (via Opencode SDK)

This project uses `promptfoo` to evaluate AI skills using the internal Antigravity (Gemini 3 Pro) models, leveraged through the native `opencode` integration.

## Prerequisites

1.  **Opencode Installed**: You must have `opencode` installed and authenticated.
2.  **Antigravity Authentication**: You must be logged in to Antigravity via Opencode.

## Configuration

The configuration uses the `opencode` provider directly, which automatically handles authentication and API communication.

**`promptfoo.yaml` Example:**

```yaml
providers:
  - id: opencode:google/antigravity-gemini-3-pro
    config:
      temperature: 0.7
```

## Supported Models

You can use any model available in your `opencode` installation. Run `opencode models` to list them.

Common models:
- `google/antigravity-gemini-3-pro`
- `google/antigravity-gemini-3-flash`
- `google/antigravity-claude-sonnet-4-5`

## Usage

To run the prompt evaluations:

```bash
npm run test:prompt
```

or directly:

```bash
npx promptfoo eval -c promptfoo.yaml
```

## Troubleshooting

### "Provider not found"

Ensure you are using a recent version of `promptfoo` that supports the `opencode` provider.

### Token/Auth Issues

If you encounter authentication errors, try refreshing your Opencode credentials:

```bash
opencode auth login --provider=google
```
