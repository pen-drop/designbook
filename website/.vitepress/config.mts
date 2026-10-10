import { defineConfigWithTheme, type DefaultTheme } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import tailwindcss from '@tailwindcss/vite'
import postcssConfig from '../postcss.config.mjs'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { AREAS, SIDEBAR, SRC_EXCLUDE } from './manual.mjs'

const require = createRequire(import.meta.url)
const vitepressRequire = createRequire(require.resolve('vitepress/package.json'))
const vueRoot = dirname(vitepressRequire.resolve('vue/package.json'))

const BASE = '/designbook/'

type Area = { label: string; link: string; icon: string }

type DocsThemeConfig = DefaultTheme.Config & {
  sidebarAreas: Area[]
}

export default withMermaid(
  defineConfigWithTheme<DocsThemeConfig>({
    srcDir: '../docs',
    srcExclude: SRC_EXCLUDE,
    rewrites: { 'index.md': 'manual.md', 'landing.md': 'index.md' },
    outDir: './.vitepress/dist',
    title: 'Designbook',
    description:
      'Structured AI workflows that turn design references into data models, components and implementation-ready specifications.',
    lang: 'en-US',
    base: BASE,
    cleanUrls: true,
    ignoreDeadLinks: false,
    vite: {
      css: { postcss: postcssConfig },
      resolve: { alias: { vue: vueRoot } },
      publicDir: fileURLToPath(new URL('../../docs/assets/logo', import.meta.url)),
      plugins: [tailwindcss()],
    },
    markdown: {
      theme: 'github-dark',
    },
    head: [
      ['link', { rel: 'icon', type: 'image/png', href: `${BASE}favicon.png` }],
      ['link', { rel: 'apple-touch-icon', href: `${BASE}apple-touch-icon.png` }],
      ['meta', { name: 'theme-color', content: '#12454E' }],
    ],
    themeConfig: {
      logo: {
        light: '/logo-nav.png',
        dark: '/logo-nav-dark.png',
        alt: 'Designbook',
      },
      siteTitle: 'Designbook',
      sidebarAreas: AREAS as Area[],
      outline: { level: [2, 3], label: 'On this page' },
      docFooter: { prev: 'Previous', next: 'Next' },
      nav: AREAS.map((area) => ({ text: area.label, link: area.link })),
      sidebar: SIDEBAR,
      search: {
        provider: 'local',
      },
    },
    mermaid: {
      look: 'classic',
    },
    mermaidPlugin: { class: 'mermaid' },
  }),
)
