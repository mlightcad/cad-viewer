<template>
  <el-button-group class="ml-base-draw-style-toolbar">
    <!-- =========================================================
           Prefix slot (e.g. layer dropdown)
           ========================================================= -->
    <slot name="prefix" />

    <!-- =========================================================
           Color button
           ========================================================= -->
    <MlColorPickerDropdown
      :model-value="pickerColor"
      :display-color="displayCssColor"
      :disabled="disabled"
      @update:modelValue="onPickerColorChange"
    >
      <template #reference>
        <el-button :disabled="disabled">
          <span
            class="ml-base-draw-style-color-indicator"
            :style="{ background: displayCssColor }"
          />
        </el-button>
      </template>
    </MlColorPickerDropdown>

    <!-- =========================================================
           Line weight dropdown
           ========================================================= -->
    <MlLineWeightSelect
      v-model="lineWeightProxy"
      :disabled="disabled"
      @change="onLineWeightChange"
    />
  </el-button-group>
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
  display: inline-flex;
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
