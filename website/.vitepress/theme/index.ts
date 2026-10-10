import './tailwind.css'
import DefaultTheme from 'vitepress/theme'
import './docs.css'
import { h } from 'vue'
import SidebarAreas from './components/SidebarAreas.vue'
import ManualCards from './components/ManualCards.vue'
import type { Theme } from 'vitepress'

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'sidebar-nav-before': () => h(SidebarAreas),
    }),
  enhanceApp({ app }) {
    app.component('ManualCards', ManualCards)
  },
} satisfies Theme
