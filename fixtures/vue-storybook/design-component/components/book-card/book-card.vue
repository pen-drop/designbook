<script setup lang="ts">
type BookStatus = "in_stock" | "preorder" | "out_of_stock";

defineProps<{
  title?: string;
  author?: string;
  price?: string;
  coverUrl?: string;
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
  <div class="flex flex-col overflow-hidden rounded-lg border border-[var(--color-muted)]/20 bg-[var(--color-background)]">
    <img :src="coverUrl" :alt="title" class="aspect-[2/3] w-full object-cover" />
    <div class="flex flex-1 flex-col gap-1 p-4">
      <h3 class="text-base font-semibold text-[var(--color-foreground)]">{{ title }}</h3>
      <p class="text-sm text-[var(--color-muted)]">{{ author }}</p>
      <p class="mt-1 text-sm font-medium text-[var(--color-foreground)]">{{ price }}</p>
      <p v-if="status" class="text-xs font-medium uppercase tracking-wide" :class="statusClass[status]">
        {{ statusLabel[status] }}
      </p>
      <div class="mt-2">
        <slot name="actions"></slot>
      </div>
    </div>
  </div>
</template>
