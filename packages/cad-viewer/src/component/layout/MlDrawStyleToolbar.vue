<template>
  <el-button-group class="ml-draw-style-toolbar">
    <!-- =========================================================
         Layer dropdown
         ========================================================= -->
    <el-dropdown trigger="click" @command="onLayerChange">
      <el-button class="ml-layer-button">
        <span class="ml-layer-name">
          {{ currentLayer?.name || '—' }}
        </span>
      </el-button>

      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="layer in layers"
            :key="layer.name"
            :command="layer.name"
            :disabled="!layer.isOn"
          >
            <span
              class="ml-layer-color"
              :style="{ background: layer.color }"
            />
            {{ layer.name }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <!-- =========================================================
         Color button (updates layer color)
         ========================================================= -->
    <el-popover
      placement="bottom-start"
      trigger="click"
      width="320"
      v-model:visible="colorPopoverVisible"
    >
      <MlColorIndexPicker
        :model-value="currentColorIndex"
        @update:modelValue="onColorChange"
      />

      <template #reference>
        <el-button :disabled="!currentLayer">
          <span
            class="ml-color-indicator"
            :style="{ background: currentLayer?.color }"
          />
        </el-button>
      </template>
    </el-popover>

    <!-- =========================================================
         Line width button (updates layer line weight)
         ========================================================= -->
    <el-dropdown
      trigger="click"
      @command="onLineWidthChange"
    >
      <el-button :disabled="!currentLayer">
        <span
          class="ml-line-indicator"
          :style="{ height: lineWidthPx + 'px' }"
        />
      </el-button>

      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="w in lineWidths"
            :key="w"
            :command="w"
          >
            <span
              class="ml-line-option"
              :style="{ height: w + 'px' }"
            />
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </el-button-group>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { AcCmColor } from '@mlightcad/data-model'
import { MlColorIndexPicker } from '../common'
import { useLayers, type LayerInfo } from '../../composable'

/**
 * =============================================================
 * MlDrawStyleToolbar
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
const props = defineProps({
  editor: {
    type: Object as () => AcApDocManager,
    required: true
  },

  /**
   * Initial / controlled current layer name
   */
  layer: {
    type: String,
    default: ''
  }
})

/**
 * =============================================================
 * Emits
 * =============================================================
 */
const emit = defineEmits<{
  (e: 'update:layer', v: string): void
  (e: 'layer-change', v: string): void
}>()

/**
 * =============================================================
 * Layers
 * =============================================================
 */
const { layers, setLayerColor, setLayerLineWeight } = useLayers(props.editor)

/**
 * =============================================================
 * Current layer
 * =============================================================
 */
const currentLayerName = ref(
  props.layer || layers[0]?.name || ''
)

const currentLayer = computed<LayerInfo | undefined>(() =>
  layers.find(l => l.name === currentLayerName.value)
)

/**
 * =============================================================
 * Derived values
 * =============================================================
 */
const currentColorIndex = computed(() => {
  if (!currentLayer.value) return 1
  const c = AcCmColor.fromString(currentLayer.value.color)
  return c ? c.colorIndex : 0
})

const lineWidthPx = computed(() =>
  Math.max(1, currentLayer.value?.lineWeight ?? 1)
)

const lineWidths = [1, 2, 3, 4]
const colorPopoverVisible = ref(false)

/**
 * =============================================================
 * Watch controlled layer
 * =============================================================
 */
watch(
  () => props.layer,
  v => {
    if (v) currentLayerName.value = v
  }
)

/**
 * =============================================================
 * Event handlers
 * =============================================================
 */
function onLayerChange(layerName: string) {
  currentLayerName.value = layerName
  emit('update:layer', layerName)
  emit('layer-change', layerName)
}

/**
 * User changed color → update CURRENT layer
 */
function onColorChange(colorIndex: number) {
  if (!currentLayer.value) return
  setLayerColor(currentLayer.value.name, colorIndex)
  colorPopoverVisible.value = false
}

/**
 * User changed line width → update CURRENT layer
 */
function onLineWidthChange(lineWeight: number) {
  if (!currentLayer.value) return
  setLayerLineWeight(currentLayer.value.name, lineWeight)
}
</script>

<style scoped>
.ml-draw-style-toolbar {
  display: inline-flex;
}

/* =============================================================
   Layer button
   ============================================================= */
.ml-layer-button {
  min-width: 80px;
}

.ml-layer-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ml-layer-color {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  margin-right: 6px;
}

/* =============================================================
   Color indicator
   ============================================================= */
.ml-color-indicator {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid #666;
  display: inline-block;
}

/* =============================================================
   Line indicators
   ============================================================= */
.ml-line-indicator {
  width: 18px;
  background: var(--el-text-color-primary);
  display: inline-block;
}

.ml-line-option {
  width: 40px;
  background: var(--el-text-color-primary);
  display: block;
}
</style>
