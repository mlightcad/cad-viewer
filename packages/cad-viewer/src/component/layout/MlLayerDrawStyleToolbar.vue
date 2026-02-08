<template>
  <ml-base-draw-style-toolbar
    :color-index="currentColorIndex"
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
      <el-dropdown
        trigger="click"
        @command="onLayerChange"
        :disabled="layers.length === 0"
      >
        <el-button class="ml-layer-draw-style-layer-button">
          <span class="ml-layer-draw-style-layer-name">
            {{ currentLayerInfo?.name || '—' }}
          </span>
          <el-icon class="ml-dropdown-caret">
            <ArrowDown />
          </el-icon>
        </el-button>

        <template #dropdown>
          <el-dropdown-menu class="ml-layer-draw-style-layer-dropdown">
            <el-dropdown-item
              v-for="layer in layers"
              :key="layer.name"
              :command="layer.name"
              :disabled="!layer.isOn"
              :class="{ 'is-active': layer.name === currentLayerName }"
            >
              <span class="ml-layer-draw-style-layer-item-name">
                {{ layer.name }}
              </span>
            </el-dropdown-item>

            <el-dropdown-item v-if="layers.length === 0" disabled>
              No layers available
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </template>
  </ml-base-draw-style-toolbar>
</template>

<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { AcCmColor, AcGiLineWeight } from '@mlightcad/data-model'
import { computed } from 'vue'

import { useLayers } from '../../composable'
import { MlBaseDrawStyleToolbar } from '../common'

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
  setLayerColor,
  setLayerLineWeight
} = useLayers(props.editor)

/**
 * =============================================================
 * Derived values
 * =============================================================
 */
const currentColorIndex = computed(() => {
  if (!currentLayerInfo.value) return 1
  const c = AcCmColor.fromString(currentLayerInfo.value.color)
  return c?.colorIndex ?? 256
})

const currentLineWeight = computed<AcGiLineWeight>(() => {
  return (
    (currentLayerInfo.value?.lineWeight as AcGiLineWeight) ??
    AcGiLineWeight.ByLayer
  )
})

/**
 * =============================================================
 * Event handlers
 * =============================================================
 */
function onLayerChange(layerName: string) {
  currentLayerName.value = layerName
  emit('layer-change', layerName)
}

function onColorChange(colorIndex: number) {
  if (!currentLayerInfo.value) return
  setLayerColor(currentLayerInfo.value.name, colorIndex)
}

function onLineWeightChange(value: AcGiLineWeight) {
  if (!currentLayerInfo.value) return
  setLayerLineWeight(currentLayerInfo.value.name, value)
}
</script>

<style scoped>
/* =============================================================
   Layer button
   ============================================================= */
.ml-layer-draw-style-layer-button {
  min-width: 100px;
  display: flex;
  align-items: center;
}

.ml-layer-draw-style-layer-name {
  flex: 1;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ml-dropdown-caret {
  margin-left: 8px;
  font-size: 12px;
  opacity: 0.7;
}

/* Dropdown menu */
.ml-layer-draw-style-layer-dropdown {
  max-height: 260px;
  overflow-y: auto;
}

.ml-layer-draw-style-layer-item-name {
  vertical-align: middle;
}

/* Active (current) layer */
.el-dropdown-menu__item.is-active {
  font-weight: 600;
  background-color: var(--el-fill-color-light);
}
</style>
