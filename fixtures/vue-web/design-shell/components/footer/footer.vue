<script setup lang="ts">
defineProps<{
  copyright?: string;
}>();
</script>

<template>
  <footer class="footer">
    <section class="footer__newsletter">
      <slot name="newsletter" />
    </section>
    <div class="footer__social">
      <slot name="social" />
    </div>
    <div class="footer__funding-logos">
      <slot name="funding_logos" />
    </div>
    <div class="footer__legal">
      <div class="footer__legal-primary">
        <slot name="legal_primary" />
      </div>
      <div class="footer__legal-secondary">
        <slot name="legal_secondary" />
      </div>
      <nav class="footer__navigation">
        <slot name="navigation" />
      </nav>
    </div>
    <div v-if="copyright" class="footer__copyright">{{ copyright }}</div>
  </footer>
</template>
