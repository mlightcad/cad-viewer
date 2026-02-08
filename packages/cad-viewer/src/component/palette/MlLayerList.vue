<template>
  <el-table
    :data="layers"
    class="ml-layer-list"
    @row-dblclick="handleRowDbClick"
  >
    <el-table-column
      property="name"
      :label="t('main.toolPalette.layerManager.layerList.name')"
      min-width="120"
      sortable
      show-overflow-tooltip
    />
    <el-table-column
      property="isOn"
      :label="t('main.toolPalette.layerManager.layerList.on')"
      width="50"
    >
      <template #default="scope">
        <div class="ml-layer-list-cell">
          <el-checkbox
            v-model="scope.row.isOn"
            @change="handleLayerVisibility(scope.row)"
          />
        </div>
      </template>
    </el-table-column>
    <el-table-column
      property="color"
      :label="t('main.toolPalette.layerManager.layerList.color')"
      width="70"
    >
      <template #default="scope">
        <div class="ml-layer-list-cell">
          <el-tag
            :color="scope.row.cssColor"
            class="ml-layer-list-color"
            @click.stop="openColorPicker(scope.row)"
          />
        </div>
      </template>
    </el-table-column>
  </el-table>

  <!-- Color picker dialog -->
  <ml-color-picker-dlg
    v-model="colorDialogVisible"
    :title="t('dialog.colorPickerDlg.title')"
    :color="oldColor"
    @ok="handleColorDialogOk"
    @cancel="handleColorDialogCancel"
  />
</template>

<script setup lang="ts">
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { AcCmColor } from '@mlightcad/data-model'
import { ElMessage, ElTable } from 'element-plus'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { LayerInfo, useLayers } from '../../composable'
import { MlColorPickerDlg } from '../dialog'

const { t } = useI18n()

/**
 * Props for MlLayerList component
 *
 * @property editor - The CAD editor/document manager.
 *                    Used to access layer table and view control
 *                    (zoom, pan, etc).
 */
interface Props {
  editor: AcApDocManager
}

const props = defineProps<Props>()

/**
 * layers: reactive array of LayerInfo retrieved from editor.
 * This composable also updates automatically when CAD document changes.
 */
const { layers } = useLayers(props.editor)

/**
 * Triggered when a row in the layer list table is double-clicked.
 *
 * Calls editor.curView.zoomToFitLayer(name) to zoom the viewport
 * to show all objects belonging to that layer.
 *
 * @param row - The LayerInfo representing the clicked layer
 */
const handleRowDbClick = (row: LayerInfo) => {
  const isSuccess = props.editor.curView.zoomToFitLayer(row.name)
  if (isSuccess) {
    ElMessage({
      message: t('main.toolPalette.layerManager.layerList.zoomToLayer', {
        layer: row.name
      }),
      grouping: true,
      type: 'success'
    })
  }
}

/**
 * Toggles layer visibility when checkbox changes.
 *
 * This updates the actual CAD database layer table:
 *   layer.isOff = !row.isOn
 *
 * @param row - LayerInfo for the row being changed
 */
const handleLayerVisibility = (row: LayerInfo) => {
  const layer = props.editor.curDocument.database.tables.layerTable.getAt(
    row.name
  )
  if (layer) layer.isOff = !row.isOn
}

/**
 * ===== Layer Color Picker Integration =====
 */

/** Dialog visibility for color picking */
const colorDialogVisible = ref(false)

/** Currently edited layer for color change */
const colorTargetLayer = ref<LayerInfo | null>(null)

/** Current color being edited, passed to color picker dialog */
const oldColor = ref<string | undefined>(undefined)

/**
 * Open color picker dialog when clicking color cell.
 */
const openColorPicker = (row: LayerInfo) => {
  colorTargetLayer.value = row
  oldColor.value = row.color
  colorDialogVisible.value = true
}

/**
 * Apply selected color to both UI layer list and CAD database layer table.
 */
const applySelectedColor = (color: AcCmColor) => {
  if (!colorTargetLayer.value) return

  // Update UI layer list color
  const target = colorTargetLayer.value
  target.color = color.toString()

  // Update underlying CAD layer color using AcCmColor
  const dbLayer = props.editor.curDocument.database.tables.layerTable.getAt(
    target.name
  )
  if (dbLayer) {
    dbLayer.color = color
  }
}

const handleColorDialogOk = (color: AcCmColor) => {
  applySelectedColor(color)
}

const handleColorDialogCancel = () => {
  // No-op for now; we simply discard temporary selection
}
</script>

<style>
/* Full-width table with compact appearance */
.ml-layer-list {
  width: 100%;
  font-size: small;
  min-width: 100%;
}

/* Compact row height */
.ml-layer-list .el-table__cell {
  padding-top: 2px;
  padding-bottom: 2px;
}

/* Optional: slightly smaller header padding as well */
.ml-layer-list .el-table__header .el-table__cell {
  padding-top: 4px;
  padding-bottom: 4px;
}

/* Add bottom border to header and body */
.ml-layer-list .el-table__header,
.ml-layer-list .el-table__body {
  border-bottom: 1px solid var(--el-border-color);
}

/* Flex container for centered cell content */
.ml-layer-list-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Small square color preview */
.ml-layer-list-color {
  width: 20px;
  height: 20px;
}
</style>
