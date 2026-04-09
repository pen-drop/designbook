## ADDED Requirements

### Requirement: Image provider configuration in designbook.config.yml

`designbook.config.yml` MAY declare an `image_provider` key with a `type` string (required). The default type is `"picsum"`.

```yaml
image_provider:
  type: picsum
```

#### Scenario: Explicit provider configuration
- **WHEN** `designbook.config.yml` contains `image_provider: { type: "picsum" }`
- **THEN** the picsum provider is used for image URL generation

#### Scenario: No provider configured — default to picsum
- **WHEN** `designbook.config.yml` does not contain an `image_provider` key
- **THEN** the picsum provider is used by default

### Requirement: Provider contract

An image provider SHALL be a function with signature `(width: number, height: number) => string` that returns a valid image URL. Each invocation MUST return a URL with visual variety (different image content).

#### Scenario: Provider returns URL with correct dimensions
- **WHEN** the picsum provider is called with width=800, height=600
- **THEN** it returns a URL matching the pattern `https://picsum.photos/id/{number}/800/600`

#### Scenario: Provider returns different images on successive calls
- **WHEN** the provider is called twice with the same dimensions
- **THEN** the returned URLs contain different image IDs

### Requirement: Built-in picsum provider

The system SHALL ship a built-in `picsum` provider that generates URLs in the format `https://picsum.photos/id/{id}/{width}/{height}` where `{id}` is a random integer between 0 and 1000.

#### Scenario: Picsum URL format
- **WHEN** the picsum provider generates a URL for width=1200, height=675
- **THEN** the URL matches `https://picsum.photos/id/{0-1000}/1200/675`
