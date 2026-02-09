<template>
  <ml-base-draw-style-toolbar
    v-if="isShowToolbar"
    :color-index="colorIndex"
    :css-color="cssColor"
    :line-weight="lineWeight"
    @color-change="onColorChange"
    @lineweight-change="onLineWeightChange"
  >
  </ml-base-draw-style-toolbar>
</template>

<script setup lang="ts">
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { AcCmColor, AcGiLineWeight } from '@mlightcad/data-model'
import { computed, toRef } from 'vue'

import { useEntityDrawStyle } from '../../composable'
import { MlBaseDrawStyleToolbar } from '../common'

/**
 * =============================================================
 * EntityDrawStyleToolbar
 * =============================================================
 *
 * Draw style toolbar for newly created entities.
 *
 * - Does NOT mutate layers
 * - Maintains local draw style state
 * - Uses current layer only as context / label
 */

/**
 * =============================================================
 * Props
 * =============================================================
 */
const props = defineProps<{
  editor: AcApDocManager | null
}>()

/**
 * =============================================================
 * Emits
 * =============================================================
 */
const emit = defineEmits<{
  (
    e: 'style-change',
    v: {
      colorIndex: number
      lineWeight: AcGiLineWeight
    }
  ): void
}>()

/**
 * =============================================================
 * Local entity draw style state
 * =============================================================
 */
const editorRef = toRef(props, 'editor')
const {
  color,
  lineWeight,
  cssColor,
  isShowToolbar,
  setColorIndex,
  setLineWeight
} = useEntityDrawStyle(editorRef)

const colorIndex = computed(() => {
  const c = AcCmColor.fromString(color.value)
  // The default color for annotation is red
  return c?.colorIndex ?? 1
})

/**
 * =============================================================
 * Event handlers
 * =============================================================
 */
function onColorChange(v: number) {
  setColorIndex(v)
  emitStyleChange()
}

function onLineWeightChange(v: AcGiLineWeight) {
  setLineWeight(v)
  emitStyleChange()
}

function emitStyleChange() {
  emit('style-change', {
    colorIndex: colorIndex.value,
    lineWeight: lineWeight.value
  })
}
</script>

<style scoped></style>
