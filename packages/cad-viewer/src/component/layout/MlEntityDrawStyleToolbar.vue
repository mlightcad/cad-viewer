<template>
  <ml-base-draw-style-toolbar
    v-if="isShowToolbar"
    :color="drawColor"
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
      color: AcCmColor
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
const { color, lineWeight, cssColor, isShowToolbar, setColor, setLineWeight } =
  useEntityDrawStyle(editorRef)

const drawColor = computed(() => {
  return AcCmColor.fromString(color.value) ?? new AcCmColor()
})

/**
 * =============================================================
 * Event handlers
 * =============================================================
 */
function onColorChange(v: AcCmColor | undefined) {
  if (!v) return
  setColor(v)
  emitStyleChange()
}

function onLineWeightChange(v: AcGiLineWeight) {
  setLineWeight(v)
  emitStyleChange()
}

function emitStyleChange() {
  emit('style-change', {
    color: drawColor.value,
    lineWeight: lineWeight.value
  })
}
</script>

<style scoped></style>
