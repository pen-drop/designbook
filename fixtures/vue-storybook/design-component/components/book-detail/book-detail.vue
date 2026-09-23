<script setup lang="ts">
type BookStatus = "in_stock" | "preorder" | "out_of_stock";

defineProps<{
  title?: string;
  author?: string;
  genre?: string;
  price?: string;
  coverUrl?: string;
  summary?: string;
  status?: BookStatus;
}>();

const statusLabel: Record<BookStatus, string> = {
  in_stock: "In Stock",
  preorder: "Preorder",
  out_of_stock: "Out of Stock",
};

const statusClass: Record<BookStatus, string> = {
  in_stock: "text-[var(--color-success)]",
  preorder: "text-[var(--color-accent)]",
  out_of_stock: "text-[var(--color-muted)]",
};
</script>

<template>
  <article class="grid grid-cols-1 gap-8 bg-[var(--color-background)] p-6 md:grid-cols-[minmax(0,320px)_1fr]">
    <img :src="coverUrl" :alt="title" class="aspect-[2/3] w-full rounded-lg object-cover" />
    <div class="flex flex-col gap-3">
      <p class="text-sm uppercase tracking-wide text-[var(--color-muted)]">{{ genre }}</p>
      <h1 class="text-3xl font-semibold text-[var(--color-foreground)]">{{ title }}</h1>
      <p class="text-lg text-[var(--color-muted)]">{{ author }}</p>
      <p class="text-xl font-medium text-[var(--color-foreground)]">{{ price }}</p>
      <p v-if="status" class="text-sm font-medium uppercase tracking-wide" :class="statusClass[status]">
        {{ statusLabel[status] }}
      </p>
      <p class="mt-2 text-base leading-relaxed text-[var(--color-foreground)]">{{ summary }}</p>
      <div class="mt-4">
        <slot name="publisher"></slot>
      </div>
      <div class="mt-4">
        <slot name="actions"></slot>
      </div>
    </div>
  </article>
</template>
