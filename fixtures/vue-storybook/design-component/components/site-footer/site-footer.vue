<script setup lang="ts">
defineProps<{
  copyright?: string;
}>();
</script>

<template>
  <div class="border-t border-[var(--color-muted)]/20 bg-[var(--color-background)] px-6 py-4 text-center text-sm text-[var(--color-muted)]">
    {{ copyright }}
  </div>
</template>
