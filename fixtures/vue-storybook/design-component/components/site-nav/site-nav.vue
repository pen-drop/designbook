<script setup lang="ts">
defineProps<{
  links?: { label: string; url: string }[];
}>();
</script>

<template>
  <nav class="flex items-center gap-6">
    <a
      v-for="link in links"
      :key="link.url"
      :href="link.url"
      class="text-sm font-medium text-[var(--color-foreground)] hover:text-[var(--color-accent)]"
    >
      {{ link.label }}
    </a>
  </nav>
</template>
