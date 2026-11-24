<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  overlapping?: boolean;
  style?: string;
}>();

const classes = computed(() =>
  ["signage", "w-full", props.overlapping ? "-mt-16" : "", props.style ? `signage--${props.style}` : ""].filter(
    (c) => c,
  ),
);
</script>

<template>
  <section :class="classes">
    <div class="signage__inner mx-auto max-w-[1200px] px-4 pt-0 pb-12 md:px-8 lg:px-10">
      <div v-if="$slots.items" class="signage__items grid gap-6 md:grid-cols-3 lg:gap-8">
        <slot name="items" />
      </div>
    </div>
  </section>
</template>
