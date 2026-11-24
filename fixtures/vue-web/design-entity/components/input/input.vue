<script setup lang="ts">
withDefaults(
  defineProps<{
    inputType?: string;
    value?: string;
    pattern?: string;
  }>(),
  {
    inputType: "text",
  },
);
</script>

<template>
  <input
    class="form-input rounded border border-gray-300 px-3 py-2"
    :type="inputType"
    :value="value || undefined"
    :pattern="pattern || undefined"
  />
  <slot name="children" />
</template>
