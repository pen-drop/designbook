/**
 * Thin CJS wrapper that delegates to the shared config module.
 *
 * This file is called by set-env.sh to load designbook configuration.
 * It delegates to the shared resolver in @designbook/storybook-addon-designbook/config
 * which implements the walk-up directory traversal.
 *
 * Requires the addon to be built first (npm run build / npx tsup).
 */

const path = require('path');

let loadConfig;
try {
    // Preferred: use the package subpath export (works after npm install)
    ({ loadConfig } = require('@designbook/storybook-addon-designbook/config'));
} catch {
    // Fallback: resolve relative path in monorepo dev (not installed as root dep)
    ({ loadConfig } = require(
        path.resolve(__dirname, '../../../../packages/storybook-addon-designbook/dist/config.cjs')
    ));
}

if (require.main === module) {
    const config = loadConfig();
    console.log(JSON.stringify(config));
}

module.exports = { loadConfig };
