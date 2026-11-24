<script setup lang="ts">
interface NavItem {
  title: string;
  url: string;
  inActiveTrail?: boolean;
  below?: NavItem[];
}

defineProps<{
  items: NavItem[];
}>();
</script>

<template>
  <ul class="navigation__list">
    <li
      v-for="(it, index) in items"
      :key="index"
      class="navigation__item"
      :class="{ 'is-active': it.inActiveTrail }"
    >
      <a class="navigation__link" :href="it.url">{{ it.title }}</a>
      <navigation-tree v-if="it.below" :items="it.below" />
    </li>
  </ul>
</template>
