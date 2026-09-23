<script setup lang="ts">
defineProps<{
  title?: string;
}>();
</script>

<template>
  <div class="mode-probe">{{ title }}</div>
</template>
