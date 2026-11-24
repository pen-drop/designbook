<script setup lang="ts">
import { computed } from 'vue'
import { useData, useRoute, withBase } from 'vitepress'
import { AREA_ICONS } from './area-icons'

type Area = { label: string; link: string; icon: string }

const { theme } = useData()
const route = useRoute()
const areas = computed<Area[]>(() => theme.value.sidebarAreas ?? [])

function pathWithoutBase(path: string) {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  if (base && path.startsWith(base)) return path.slice(base.length) || '/'
  return path
}

function isActive(area: Area) {
  const current = pathWithoutBase(route.path)
  return current === area.link || current.startsWith(area.link)
}
</script>

<template>
  <nav class="sb-areas" aria-label="Documentation areas">
    <a
      v-for="area in areas"
      :key="area.link"
      class="sb-area"
      :class="{ 'is-active': isActive(area) }"
      :href="withBase(area.link)"
      :aria-current="isActive(area) ? 'page' : undefined"
    >
      <span class="sb-area__icon" aria-hidden="true" v-html="AREA_ICONS[area.icon] ?? ''" />
      <span>{{ area.label }}</span>
    </a>
  </nav>
</template>
