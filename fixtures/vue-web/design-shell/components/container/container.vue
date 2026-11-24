<script setup lang="ts">
withDefaults(
  defineProps<{
    maxWidth?: string;
    theme?: string;
    content?: string;
  }>(),
  {
    maxWidth: "xl",
  },
);
</script>

<template>
  <div :class="`container container--${maxWidth}${theme ? ` container--theme-${theme}` : ''}`">
    <div v-if="$slots.background" class="container__background">
      <slot name="background" />
    </div>
    <div v-if="$slots.header" class="container__header">
      <slot name="header" />
    </div>
    <div class="container__content">
      <slot name="content">{{ content }}</slot>
    </div>
  </div>
</template>
