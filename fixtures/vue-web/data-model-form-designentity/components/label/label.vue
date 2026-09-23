<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    titleDisplay?: "before" | "after" | "invisible" | "hidden";
  }>(),
  {
    titleDisplay: "before",
  },
);

const classes = computed(() =>
  [
    "form-label",
    "block",
    "font-medium",
    "mb-1",
    props.titleDisplay === "invisible" || props.titleDisplay === "hidden" ? "sr-only" : "",
  ].filter((c) => c),
);
</script>

<template>
  <label :class="classes">
    <slot name="title" />
  </label>
</template>
