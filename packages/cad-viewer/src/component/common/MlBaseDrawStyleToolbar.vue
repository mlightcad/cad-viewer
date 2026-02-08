<template>
  <el-button-group class="ml-base-draw-style-toolbar">
    <!-- =========================================================
           Prefix slot (e.g. layer dropdown)
           ========================================================= -->
    <slot name="prefix" />

    <!-- =========================================================
           Color button
           ========================================================= -->
    <el-popover
      placement="bottom"
      trigger="click"
      width="320"
      v-model:visible="colorPopoverVisible"
      :disabled="disabled"
    >
      <MlColorIndexPicker
        :model-value="colorIndex"
        @update:modelValue="onColorChange"
      />

      <template #reference>
        <el-button :disabled="disabled">
          <span
            class="ml-base-draw-style-color-indicator"
            :style="{ background: cssColor || 'transparent' }"
          />
        </el-button>
      </template>
    </el-popover>

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
import { AcGiLineWeight } from '@mlightcad/data-model'
import { computed, ref } from 'vue'

import { MlColorIndexPicker, MlLineWeightSelect } from '../common'

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
  /** Color index (AutoCAD style) */
  colorIndex: number
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
  (e: 'color-change', v: number): void
  (e: 'lineweight-change', v: AcGiLineWeight): void
}>()

/**
 * =============================================================
 * Local state
 * =============================================================
 */
const colorPopoverVisible = ref(false)

const lineWeightProxy = computed<AcGiLineWeight>({
  get: () => props.lineWeight,
  set: v => emit('lineweight-change', v)
})

/**
 * =============================================================
 * Event handlers
 * =============================================================
 */
function onColorChange(colorIndex: number) {
  emit('color-change', colorIndex)
  colorPopoverVisible.value = false
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
