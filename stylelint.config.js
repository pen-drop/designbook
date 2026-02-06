/**
 * @type {import('stylelint').Config}
 * This line uses JSDoc to define the type of this module's export.
 * It imports the type definition for a Stylelint configuration from the 'stylelint' package.
 */
export default {
  extends: [
    // This extends the recommended Stylelint configuration,
    // which includes common linting rules for CSS.
    "stylelint-config-recommended",

    // This extends the configuration specifically for Tailwind CSS,
    // a utility-first CSS framework. It will include Tailwind-specific linting rules
    // to ensure that styles written using Tailwind classes adhere to best practices.
    "stylelint-config-tailwindcss",
    "stylelint-prettier/recommended"
  ],
  "rules": {

    "media-query-no-invalid": [
      null,
    ],
    "at-rule-no-deprecated": [
      true,
      {
        "ignoreAtRules": ["apply"]
      }
    ],
    "at-rule-no-unknown": [
      true,
      {
        "ignoreAtRules": ["tailwind", "theme", "reference", 'source', 'plugin', 'apply', 'utility']
      }
    ],
    "no-descending-specificity": null,
    "no-duplicate-selectors": null
  }
};

// The resulting configuration will enforce the linting rules defined
// in both the recommended Stylelint base configuration and the custom rules
// from the Tailwind-specific configuration, ensuring that your CSS code
// is consistently formatted and free from common errors.
