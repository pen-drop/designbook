<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  variant?: string;
  size?: string;
  url?: string;
  label?: string;
}>();

const classes = computed(() =>
  ["btn", props.variant ? `btn--${props.variant}` : "", props.size ? `btn--${props.size}` : ""].filter(
    (c) => c,
  ),
);
</script>

<template>
  <a :class="classes" :href="url || undefined">
    {{ label }}
  </a>
</template>
