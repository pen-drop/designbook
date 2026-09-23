<script setup lang="ts"></script>

<template>
  <div class="flex min-h-screen flex-col bg-[var(--color-background)] text-[var(--color-foreground)]">
    <header>
      <slot name="header"></slot>
    </header>
    <main class="flex-1">
      <slot name="content"></slot>
    </main>
    <footer>
      <slot name="footer"></slot>
    </footer>
  </div>
</template>
