<script setup lang="ts">
defineProps<{
  type?: string;
  title?: string;
}>();
</script>

<template>
  <article class="landing-teaser flex flex-col overflow-hidden rounded-lg bg-surface">
    <div v-if="$slots.image" class="aspect-video overflow-hidden [&_img]:h-full [&_img]:w-full [&_img]:object-cover">
      <slot name="image" />
    </div>
    <div class="flex flex-col gap-[var(--grid-sm)] p-[var(--grid-md)]">
      <div v-if="type" class="font-body text-sm uppercase text-secondary">{{ type }}</div>
      <h3 v-if="title" class="font-heading text-foreground">{{ title }}</h3>
    </div>
  </article>
</template>
