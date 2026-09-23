<script setup lang="ts">
withDefaults(
  defineProps<{
    href?: string;
    src?: string;
    alt?: string;
    height?: string;
  }>(),
  {
    href: "/",
    alt: "",
    height: "48px",
  },
);
</script>

<template>
  <a class="logo" :href="href">
    <slot name="image">
      <img v-if="src" :src="src" :alt="alt" :style="`height: ${height};`" />
    </slot>
  </a>
</template>
