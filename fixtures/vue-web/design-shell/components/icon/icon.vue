<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string;
    size?: string;
    sprite?: string;
    id: string;
  }>(),
  {
    label: "",
    size: "24px",
    sprite: "/icons-defs.svg",
  },
);
</script>

<template>
  <span class="icon" role="img" :aria-label="label" :style="`--icon-size: ${size};`">
    <svg :width="size" :height="size" aria-hidden="true"><use :href="`${sprite}#${id}`" /></svg>
  </span>
</template>
