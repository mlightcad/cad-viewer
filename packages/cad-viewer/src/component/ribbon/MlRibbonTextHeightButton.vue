<template>
  <ml-ribbon-property-field
    :icon="textHeightIcon"
    :disabled="disabled"
    :control-width="controlWidth"
    variant="line-weight"
  >
    <button
      type="button"
      class="ml-ribbon-text-height-button"
      :disabled="disabled"
      :aria-label="ariaLabel || placeholder"
      @click="emit('click')"
    >
      <template v-if="mode === 'custom'">
        <span class="ml-ribbon-text-height-button__mode">{{ wcsLabel }}</span>
        <span class="ml-ribbon-text-height-button__value">{{
          formattedWcs || '-'
        }}</span>
      </template>
      <span v-else class="ml-ribbon-text-height-button__value">{{ fitLabel }}</span>
    </button>
  </ml-ribbon-property-field>
</template>

<script setup lang="ts">
import { ICON_TEXT_HEIGHT } from '@mlightcad/cad-simple-viewer'
import { computed, defineComponent, h } from 'vue'

import MlRibbonPropertyField from './MlRibbonPropertyField.vue'

/**
 * Compact ribbon control that shows Fit / WCS text-height status and opens
 * the shared dialog on click (dialog is not embedded in the ribbon).
 */
interface RibbonTextHeightButtonProps {
  /** Current authoring mode shown in the summary. */
  mode?: 'adaptive' | 'custom'
  /** World-space height when {@link mode} is `'custom'`. */
  textHeightWcs?: number
  /** Short label for Fit-to-screen (e.g. `Fit`). */
  fitLabel?: string
  /** Short prefix for custom height (e.g. `WCS`). */
  wcsLabel?: string
  /** Accessible name / tooltip fallback. */
  placeholder?: string
  /** Optional explicit aria-label. */
  ariaLabel?: string
  disabled?: boolean
  controlWidth?: string
}

const props = withDefaults(defineProps<RibbonTextHeightButtonProps>(), {
  mode: 'adaptive',
  textHeightWcs: undefined,
  fitLabel: 'Fit',
  wcsLabel: 'WCS',
  placeholder: '',
  ariaLabel: '',
  disabled: false,
  controlWidth: '120px'
})

const emit = defineEmits<{
  (e: 'click'): void
}>()

const textHeightIcon = defineComponent({
  name: 'MlRibbonTextHeightIcon',
  setup() {
    return () =>
      h('span', {
        class: 'ml-ribbon-text-height-icon',
        innerHTML: ICON_TEXT_HEIGHT
      })
  }
})

const formattedWcs = computed(() => {
  const value = props.textHeightWcs
  if (value == null || !Number.isFinite(value) || value <= 0) return ''
  const rounded = Math.round(value * 1000) / 1000
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
})
</script>

<style scoped>
.ml-ribbon-text-height-button {
  --ml-ribbon-text-height-scale: var(--ml-rb-scale, 1);
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: calc(6px * var(--ml-ribbon-text-height-scale));
  width: 100%;
  min-height: var(--ml-rb-compact-height, 28px);
  padding: 0 calc(8px * var(--ml-ribbon-text-height-scale));
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: var(--el-border-radius-base, 4px);
  background: var(--el-fill-color-blank, #fff);
  color: var(--el-text-color-regular, #606266);
  font-size: calc(12px * var(--ml-ribbon-text-height-scale));
  line-height: 1.2;
  cursor: pointer;
  text-align: left;
}

.ml-ribbon-text-height-button:hover:not(:disabled) {
  border-color: var(--el-color-primary, #409eff);
  color: var(--el-color-primary, #409eff);
}

.ml-ribbon-text-height-button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.ml-ribbon-text-height-button__mode {
  flex: 0 0 auto;
  color: var(--el-text-color-secondary, #909399);
  font-weight: 500;
}

.ml-ribbon-text-height-button__value {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-primary, #303133);
  font-variant-numeric: tabular-nums;
}

.ml-ribbon-text-height-button:hover:not(:disabled)
  .ml-ribbon-text-height-button__value,
.ml-ribbon-text-height-button:hover:not(:disabled)
  .ml-ribbon-text-height-button__mode {
  color: inherit;
}
</style>
