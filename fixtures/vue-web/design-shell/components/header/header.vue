<script setup lang="ts">
defineProps<{
  sticky?: boolean;
}>();
</script>

<template>
  <header class="header" :data-sticky="sticky ? 'true' : undefined">
    <div class="header__funding-bar">
      <slot name="funding_bar" />
    </div>
    <div class="header__main">
      <div class="header__logo">
        <slot name="logo" />
      </div>
      <nav class="header__navigation">
        <slot name="navigation" />
      </nav>
      <div class="header__actions">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>
