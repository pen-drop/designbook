import './tailwind.css'
import DefaultTheme from 'vitepress/theme'
import './docs.css'
import { h } from 'vue'
import SidebarAreas from './components/SidebarAreas.vue'
import ManualCards from './components/ManualCards.vue'
import DistroLinks from './landing/DistroLinks.vue'
import LandingContent from './landing/LandingContent.vue'
import type { Theme } from 'vitepress'

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'sidebar-nav-before': () => h(SidebarAreas),
      'home-hero-after': () => h(DistroLinks),
      'home-features-after': () => h(LandingContent),
    }),
  enhanceApp({ app }) {
    app.component('ManualCards', ManualCards)
  },
} satisfies Theme
