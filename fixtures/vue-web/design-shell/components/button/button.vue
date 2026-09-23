<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: string;
    variant?: string;
    label?: string;
  }>(),
  {
    type: "button",
    variant: "primary",
  },
);
</script>

<template>
  <button :type="type" :class="`button button--${variant}`">
    <slot name="label">{{ label }}</slot>
  </button>
</template>
