<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    reverse?: boolean;
    title?: string;
    headingLevel?: number;
    text?: string;
  }>(),
  {
    headingLevel: 1,
  },
);

const classes = computed(() => ["hero", "w-full", props.reverse ? "hero--reverse" : ""].filter((c) => c));

const headingTag = computed(() => `h${props.headingLevel ?? 1}`);
</script>

<template>
  <section :class="classes">
    <div class="hero__inner mx-auto max-w-[1200px] px-4 py-12 md:px-8">
      <component :is="headingTag" v-if="title" class="hero__title">{{ title }}</component>
      <div v-if="text" class="hero__text">{{ text }}</div>
      <div v-if="$slots.button" class="hero__button">
        <slot name="button" />
      </div>
    </div>
  </section>
</template>
