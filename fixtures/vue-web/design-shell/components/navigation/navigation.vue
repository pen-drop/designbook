<script setup lang="ts">
import NavigationTree from "./navigation-tree.vue";

interface NavItem {
  title: string;
  url: string;
  inActiveTrail?: boolean;
  below?: NavItem[];
}

withDefaults(
  defineProps<{
    items?: NavItem[];
    variant?: string;
  }>(),
  {
    items: () => [],
    variant: "main",
  },
);
</script>

<template>
  <div :class="`navigation navigation--${variant}`">
    <NavigationTree :items="items" />
  </div>
</template>
