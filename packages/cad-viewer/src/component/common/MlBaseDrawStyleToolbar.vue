<template>
  <div class="ml-base-draw-style-toolbar">
    <!-- =========================================================
           Prefix slot (e.g. layer dropdown)
           ========================================================= -->
    <slot name="prefix" />

    <!-- =========================================================
           Color button
           ========================================================= -->
    <MlColorPickerDropdown
      class="ml-base-draw-style-toolbar__color-picker"
      :model-value="pickerColor"
      :display-color="displayCssColor"
      :disabled="disabled"
      @update:modelValue="onPickerColorChange"
    >
      <template #reference>
        <button
          type="button"
          class="ml-base-draw-style-toolbar__color-button"
          :disabled="disabled"
        >
          <span
            class="ml-base-draw-style-color-indicator"
            :style="{ background: displayCssColor }"
          />
        </button>
      </template>
    </MlColorPickerDropdown>

    <!-- =========================================================
           Line weight dropdown
           ========================================================= -->
    <MlLineWeightSelect
      class="ml-base-draw-style-toolbar__lineweight"
      v-model="lineWeightProxy"
      :disabled="disabled"
      @change="onLineWeightChange"
    />
  </div>
</template>

<script setup lang="ts">
import { AcCmColor } from '@mlightcad/data-model'
import { AcGiLineWeight } from '@mlightcad/data-model'
import { computed } from 'vue'

import { MlColorPickerDropdown, MlLineWeightSelect } from '../common'

/**
 * =============================================================
 * MlBaseDrawStyleToolbar
 * =============================================================
 *
 * Stateless, UI-only draw style toolbar.
 *
 * - No knowledge of layers or entities
 * - Emits pure style change events
 * - Can be composed by layer/entity toolbars
 */

/**
 * =============================================================
 * Props
 * =============================================================
 */
const props = defineProps<{
  /** Current draw color */
  color?: AcCmColor
  /** CSS color string for preview */
  cssColor?: string
  /** Current line weight */
  lineWeight: AcGiLineWeight
  /** Disable entire toolbar */
  disabled?: boolean
}>()

/**
 * =============================================================
 * Emits
 * =============================================================
 */
const emit = defineEmits<{
  (e: 'color-change', v: AcCmColor | undefined): void
  (e: 'lineweight-change', v: AcGiLineWeight): void
}>()

/**
 * =============================================================
 * Local state
 * =============================================================
 */
const pickerColor = computed<AcCmColor | undefined>(() => props.color)
const displayCssColor = computed(() => {
  return props.cssColor ?? props.color?.cssColor ?? 'transparent'
})

const lineWeightProxy = computed<AcGiLineWeight>({
  get: () => props.lineWeight,
  set: v => emit('lineweight-change', v)
})

/**
 * =============================================================
 * Event handlers
 * =============================================================
 */
function onPickerColorChange(color: AcCmColor | undefined) {
  emit('color-change', color)
}

function onLineWeightChange(value: AcGiLineWeight) {
  emit('lineweight-change', value)
}
</script>

<style scoped>
.ml-base-draw-style-toolbar {
  --ml-base-draw-style-height: var(--ml-rb-compact-height, 28px);
  --ml-base-draw-style-lineweight-width: 188px;
  display: inline-flex;
  align-items: stretch;
}

.ml-base-draw-style-toolbar__color-picker {
  flex: 0 0 auto;
  width: var(--ml-base-draw-style-height);
  min-width: var(--ml-base-draw-style-height);
  height: var(--ml-base-draw-style-height);
}

.ml-base-draw-style-toolbar__color-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-regular);
  cursor: pointer;
  box-sizing: border-box;
  transition:
    border-color var(--el-transition-duration),
    box-shadow var(--el-transition-duration);
}

.ml-base-draw-style-toolbar__color-button:hover {
  border-color: var(--el-border-color-hover);
}

.ml-base-draw-style-toolbar__color-button:focus-visible {
  outline: none;
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}

.ml-base-draw-style-toolbar__color-button:disabled {
  cursor: not-allowed;
  color: var(--el-disabled-text-color);
  background: var(--el-fill-color-light);
  border-color: var(--el-border-color-light);
}

.ml-base-draw-style-toolbar :deep(.ml-base-draw-style-toolbar__lineweight) {
  flex: 0 0 var(--ml-base-draw-style-lineweight-width);
  width: var(--ml-base-draw-style-lineweight-width);
  min-width: var(--ml-base-draw-style-lineweight-width);
  height: var(--ml-base-draw-style-height);
}

/* =============================================================
     Color indicator
     ============================================================= */
.ml-base-draw-style-color-indicator {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid #666;
  display: inline-block;
}
</style>
