import tailwindcss from '@tailwindcss/vite'

/** @type { import('@storybook/html-vite').StorybookConfig } */
const config = {
    stories: [
        // UI components (agent-generated)
        "../components/**/*.component.yml",
        // Section scenes
        "../designbook/sections/*/*.scenes.yml",
        // Shell scenes
        "../designbook/shell/*.scenes.yml",
    ],
    addons: [
        '@storybook/addon-docs',
        {
            name: 'storybook-addon-designbook',
            options: {
                designbook: {
                    provider: 'petmatch',
                },
            },
        },
        {
            name: 'storybook-addon-sdc',
            options: {
                sdcStorybookOptions: {
                    twigLib: 'twing',
                    namespace: 'petmatch',
                    namespaces: {},
                },
                jsonSchemaFakerOptions: {
                    requiredOnly: true,
                    useExamplesValue: true,
                    useDefaults: true,
                },
            },
        },
    ],
    framework: {
        name: "@storybook/html-vite",
        options: {}
    },
    async viteFinal(config) {
        const { mergeConfig } = await import('vite');
        return mergeConfig(config, {
            plugins: [tailwindcss()],
            build: {
                cssMinify: 'esbuild',
            },
        });
    },
};
export default config;
