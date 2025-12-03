<template>
  <el-table
    ref="multipleTableRef"
    :data="layers"
    class="ml-layer-list"
    @selection-change="handleSelectionChange"
    @row-click="handleRowClick"
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
          <el-tag :color="scope.row.color" class="ml-layer-list-color" />
        </div>
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup lang="ts">
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { ElMessage, ElTable } from 'element-plus'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { LayerInfo, useLayers } from '../../composable'

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
const layers = useLayers(props.editor)

/** Reference to the Element Plus <el-table> component instance */
const multipleTableRef = ref<InstanceType<typeof ElTable>>()

/** Stores currently selected rows from the table */
const multipleSelection = ref<LayerInfo[]>([])

/**
 * Triggered when row selections change (checkbox selection mode).
 * Stores current selection results.
 */
const handleSelectionChange = (val: LayerInfo[]) => {
  multipleSelection.value = val
}

/**
 * Triggered when a row in the layer list table is clicked.
 *
 * Calls editor.curView.zoomToFitLayer(name) to zoom the viewport
 * to show all objects belonging to that layer.
 *
 * @param row - The LayerInfo representing the clicked layer
 */
const handleRowClick = (row: LayerInfo) => {
  const isSuccess = props.editor.curView.zoomToFitLayer(row.name)
  if (isSuccess) {
    ElMessage({
      message: t('main.toolPalette.layerManager.layerList.zoomToLayer'),
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
</script>

<style>
/* Full-width table with compact appearance */
.ml-layer-list {
  width: 100%;
  font-size: small;
  min-width: 100%;
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
