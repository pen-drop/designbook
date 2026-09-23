<script setup lang="ts">
import { computed } from "vue";

interface CtaLink {
  url?: string;
  title?: string;
  text?: string;
}

const props = defineProps<{
  icon?: string;
  title?: string;
  description?: string;
  links?: CtaLink[];
  buttonAnonymous?: CtaLink;
}>();

const cta = computed<CtaLink | undefined>(() => {
  const fromLinks = (props.links || [])[0];
  if (fromLinks) return fromLinks;
  if (props.buttonAnonymous) return props.buttonAnonymous;
  return undefined;
});
</script>

<template>
  <article
    class="signage-item relative flex h-full min-h-[428px] flex-col rounded-2xl border border-[var(--color-accent)] bg-[var(--color-surface-variant)] px-7 pb-5"
  >
    <div class="signage-item__header flex min-h-[44px] items-start gap-4">
      <div
        v-if="icon"
        class="signage-item__icon mt-[-34px] flex h-[86px] w-[86px] shrink-0 items-center justify-center rounded-full bg-white text-[42px] leading-none text-[var(--color-secondary)]"
        aria-hidden="true"
      >
        <span
          style="
            font-family: 'Material Symbols Outlined';
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 48;
          "
          >{{ icon }}</span
        >
      </div>
      <h2
        v-if="title"
        class="signage-item__title mt-[-6px] font-heading text-[34px] font-medium leading-tight text-black"
      >
        {{ title }}
      </h2>
    </div>
    <p v-if="description" class="signage-item__description mt-5 pl-[104px] text-[18px] leading-normal text-black">
      {{ description }}
    </p>
    <div v-if="cta" class="signage-item__actions mt-auto flex justify-center pt-6">
      <a class="rounded-md bg-[var(--color-primary)] px-7 py-3 font-heading text-[18px] leading-none text-white" :href="cta.url || '#'">{{
        cta.title || cta.text || "Link"
      }}</a>
    </div>
  </article>
</template>
