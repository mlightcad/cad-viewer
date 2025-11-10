<template>
  <el-table
    ref="multipleTableRef"
    :data="layers"
    class="ml-layer-list"
    @selection-change="handleSelectionChange"
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
import { ElTable } from 'element-plus'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { LayerInfo, useLayers } from '../../composable'

const { t } = useI18n()

/**
 * Properties of MlLayerList component
 */
interface Props {
  /**
   * Current drawing database
   */
  editor: AcApDocManager
}

const props = defineProps<Props>()

const layers = useLayers(props.editor)

const multipleTableRef = ref<InstanceType<typeof ElTable>>()
const multipleSelection = ref<LayerInfo[]>([])

const handleSelectionChange = (val: LayerInfo[]) => {
  multipleSelection.value = val
}
const handleLayerVisibility = (row: LayerInfo) => {
  const layer = props.editor.curDocument.database.tables.layerTable.getAt(
    row.name
  )
  if (layer) layer.isOff = !row.isOn
}
</script>

<style>
.ml-layer-list {
  width: 100%;
  font-size: small;
  min-width: 100%;
}

.ml-layer-list .el-table__header,
.ml-layer-list .el-table__body {
  border-bottom: 1px solid var(--el-border-color);
}

.ml-layer-list-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.ml-layer-list-color {
  width: 20px;
  height: 20px;
}
</style>
