<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'

type Area = { label: string; link: string; icon: string }

const { theme } = useData()
const areas = computed<Area[]>(() => theme.value.sidebarAreas ?? [])
</script>

<template>
  <div class="manual-cards">
    <a v-for="area in areas" :key="area.link" class="manual-card" :href="withBase(area.link)">
      <strong>{{ area.label }}</strong>
      <span>Open the {{ area.label }} handbook</span>
    </a>
  </div>
</template>
