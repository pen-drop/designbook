<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    type?: string;
    labelDisplay?: "before" | "after" | "invisible";
  }>(),
  {
    labelDisplay: "before",
  },
);

const classes = computed(() =>
  ["form-item", "mb-4", props.type ? `form-item--${props.type}` : ""].filter((c) => c),
);
</script>

<template>
  <div :class="classes">
    <slot v-if="labelDisplay !== 'after'" name="label" />
    <slot name="prefix" />
    <slot name="children" />
    <slot name="suffix" />
    <slot v-if="labelDisplay === 'after'" name="label" />
    <div v-if="$slots.errors" class="form-item__errors text-red-600 text-sm mt-1" role="alert">
      <slot name="errors" />
    </div>
  </div>
</template>
