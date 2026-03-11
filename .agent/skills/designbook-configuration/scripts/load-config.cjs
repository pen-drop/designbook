/**
 * Thin CJS wrapper that delegates to the shared config module.
 *
 * This file is called by set-env.sh to load designbook configuration.
 * It delegates to the shared resolver in storybook-addon-designbook/config
 * which implements the walk-up directory traversal.
 */

const { loadConfig } = require('storybook-addon-designbook/config');

if (require.main === module) {
    const config = loadConfig();
    console.log(JSON.stringify(config));
}

module.exports = { loadConfig };
