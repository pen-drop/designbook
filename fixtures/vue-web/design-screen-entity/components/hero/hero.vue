<script setup lang="ts">
// Hero — a title, formatted content body, and a call-to-action link.
// Rendered from block_content.hero (default view mode).
defineProps<{
  title?: string;
}>();
</script>

<template>
  <div class="hero flex flex-col gap-[var(--grid-md)] py-[var(--layout-spacing-lg)]">
    <h1 v-if="title" class="font-heading text-headline text-primary">{{ title }}</h1>
    <div v-if="$slots.content" class="font-body text-body-md text-foreground">
      <slot name="content" />
    </div>
    <div v-if="$slots.action" class="mt-[var(--layout-spacing-sm)]">
      <slot name="action" />
    </div>
  </div>
</template>
