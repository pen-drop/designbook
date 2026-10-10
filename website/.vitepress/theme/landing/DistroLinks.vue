<script setup lang="ts">
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'

type Landing = { id: string; label: string; link: string; status: string }

const { frontmatter, theme } = useData()
const isRoot = computed(
  () => frontmatter.value.layout === 'home' && frontmatter.value.landing == null,
)
const ready = computed<Landing[]>(() =>
  (theme.value.landings ?? []).filter((entry: Landing) => entry.status === 'ready'),
)
</script>

<template>
  <section v-if="isRoot && ready.length" class="distro-links" aria-labelledby="distro-links-heading">
    <h2 id="distro-links-heading" class="distro-links__title">Start here</h2>
    <ul class="distro-links__list">
      <li v-for="entry in ready" :key="entry.id">
        <a class="distro-links__link" :href="withBase(entry.link)">Designbook for {{ entry.label }}</a>
      </li>
    </ul>
  </section>
</template>
