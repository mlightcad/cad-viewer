<template>
  <ml-base-draw-style-toolbar
    :color="currentColor"
    :css-color="currentLayerInfo?.cssColor"
    :line-weight="currentLineWeight"
    :disabled="!currentLayerInfo"
    @color-change="onColorChange"
    @lineweight-change="onLineWeightChange"
  >
    <!-- =========================================================
         Layer dropdown
         ========================================================= -->
    <template #prefix>
      <ml-layer-select
        v-model="currentLayerName"
        class="ml-layer-draw-style-layer-select"
        :options="layerOptions"
        :disabled="layers.length === 0"
        @change="onLayerChange"
        @layer-state-toggle="onLayerStateToggle"
      />
    </template>
  </ml-base-draw-style-toolbar>
</template>

<script setup lang="ts">
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { AcCmColor, AcGiLineWeight } from '@mlightcad/data-model'
import { computed } from 'vue'

import type { LayerStateToggleKey } from '../../composable'
import { useLayers } from '../../composable'
import { MlBaseDrawStyleToolbar, MlLayerSelect } from '../common'

/**
 * =============================================================
 * MlLayerDrawStyleToolbar
 * =============================================================
 *
 * Layer-driven draw style toolbar.
 *
 * - Layer is the source of truth
 * - Color & line width edits update the CURRENT layer
 * - Actual layer mutation is delegated to external logic
 */

/**
 * =============================================================
 * Props
 * =============================================================
 */
const props = defineProps<{
  editor: AcApDocManager
}>()

/**
 * =============================================================
 * Emits
 * =============================================================
 */
const emit = defineEmits<{
  (e: 'layer-change', v: string): void
}>()

/**
 * =============================================================
 * Layers
 * =============================================================
 */
const {
  layers,
  currentLayerName,
  currentLayerInfo,
  toggleLayerState,
  setLayerColor,
  setLayerLineWeight
} = useLayers(props.editor)

/**
 * =============================================================
 * Derived values
 * =============================================================
 */
const currentColor = computed(() => {
  if (!currentLayerInfo.value) return new AcCmColor()
  return AcCmColor.fromString(currentLayerInfo.value.color) ?? new AcCmColor()
})

const currentLineWeight = computed<AcGiLineWeight>(() => {
  return (
    (currentLayerInfo.value?.lineWeight as AcGiLineWeight) ??
    AcGiLineWeight.ByLayer
  )
})
const layerOptions = computed(() =>
  layers.map(layer => ({
    value: layer.name,
    name: layer.name,
    cssColor: layer.cssColor,
    isOn: layer.isOn,
    isLocked: layer.isLocked,
    isFrozen: layer.isFrozen,
    lineType: layer.linetype
  }))
)

/**
 * =============================================================
 * Event handlers
 * =============================================================
 */
function onLayerChange(layerName: string) {
  emit('layer-change', layerName)
}

function onLayerStateToggle(payload: {
  layerName: string
  state: LayerStateToggleKey
}) {
  toggleLayerState(payload.layerName, payload.state)
}

function onColorChange(color: AcCmColor | undefined) {
  if (!currentLayerInfo.value) return
  if (!color) return
  setLayerColor(currentLayerInfo.value.name, color)
}

function onLineWeightChange(value: AcGiLineWeight) {
  if (!currentLayerInfo.value) return
  setLayerLineWeight(currentLayerInfo.value.name, value)
}
</script>

<style scoped>
.ml-layer-draw-style-layer-select {
  min-width: 100px;
  max-width: 220px;
}
</style>
