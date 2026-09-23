<script setup lang="ts">
defineProps<{
  storeName?: string;
}>();
</script>

<template>
  <div class="flex items-center justify-between border-b border-[var(--color-muted)]/20 bg-[var(--color-background)] px-6 py-4">
    <span class="text-lg font-semibold text-[var(--color-foreground)]">{{ storeName }}</span>
    <slot name="nav"></slot>
  </div>
</template>
