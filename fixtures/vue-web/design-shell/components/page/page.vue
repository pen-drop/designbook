<script setup lang="ts"></script>

<template>
  <div class="page">
    <div class="page__header">
      <slot name="header" />
    </div>
    <main class="page__content">
      <slot name="content" />
    </main>
    <div class="page__footer">
      <slot name="footer" />
    </div>
  </div>
</template>
