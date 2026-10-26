<template>
  <fieldset class="ml-fieldset-group" :disabled="disabled">
    <legend v-if="hasTitle" class="ml-fieldset-group__legend">
      {{ title }}
    </legend>
    <div class="ml-fieldset-group__body">
      <slot />
    </div>
  </fieldset>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Text shown on the top border (Windows group caption). */
    title?: string
    /** Disables nested controls when true. */
    disabled?: boolean
  }>(),
  {
    title: '',
    disabled: false
  }
)

const hasTitle = computed(() => Boolean(props.title?.trim()))
</script>

<style scoped>
/**
 * Windows-style “group box”: bordered region with a legend sitting on the top edge.
 * Uses native <fieldset>/<legend> for accessibility and correct border notch behavior.
 */
.ml-fieldset-group {
  margin: 0;
  min-width: 0;
  min-height: 0;
  height: 100%;
  box-sizing: border-box;
  border: 1px solid var(--el-border-color);
  border-radius: 2px;
  padding: 10px 12px 12px;
  background-color: transparent;
  display: flex;
  flex-direction: column;
}

.ml-fieldset-group__legend {
  padding: 0 6px;
  margin-left: 4px;
  font-size: var(--ml-dialog-font-size, 12px);
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.ml-fieldset-group__body {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>
