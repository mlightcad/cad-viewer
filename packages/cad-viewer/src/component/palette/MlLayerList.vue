<template>
  <div class="ml-layer-manager-panel">
    <div class="ml-layer-manager-header">
      <span class="ml-layer-manager-current" :title="currentLayerLabel">
        {{ currentLayerLabel }}
      </span>
      <el-input
        v-model="searchText"
        clearable
        size="small"
        class="ml-layer-manager-search"
        :placeholder="t('main.toolPalette.layerManager.searchPlaceholder')"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <div class="ml-layer-manager-toolbar">
      <el-popover
        v-model:visible="filterTreeVisible"
        placement="bottom-start"
        trigger="click"
        :width="220"
        :teleported="true"
        popper-class="ml-layer-manager-filter-popper"
      >
        <div class="ml-layer-manager-filter-popover">
          <div class="ml-layer-manager-filter-popover-header">
            <span class="ml-layer-manager-filters-title">
              {{ t('main.toolPalette.layerManager.filters') }}
            </span>
            <el-button
              text
              size="small"
              class="ml-layer-manager-toolbar-btn"
              :title="t('main.toolPalette.layerManager.toolbar.newFilter')"
              :aria-label="t('main.toolPalette.layerManager.toolbar.newFilter')"
              @click="handleNewFilter"
            >
              <el-icon :size="16"><Plus /></el-icon>
            </el-button>
          </div>
          <el-tree
            ref="filterTreeRef"
            class="ml-layer-manager-filter-tree"
            :data="filterTreeData"
            node-key="id"
            highlight-current
            default-expand-all
            :expand-on-click-node="false"
            :current-node-key="selectedFilterId"
            @node-click="handleFilterNodeClick"
          />
        </div>
        <template #reference>
          <el-button
            text
            size="small"
            class="ml-layer-manager-toolbar-btn"
            :class="{
              'ml-layer-manager-toolbar-btn--active': filterTreeVisible
            }"
            :title="t('main.toolPalette.layerManager.toolbar.showFilters')"
            :aria-label="t('main.toolPalette.layerManager.toolbar.showFilters')"
            :aria-expanded="filterTreeVisible"
          >
            <el-icon :size="16"><Filter /></el-icon>
          </el-button>
        </template>
      </el-popover>
      <el-button
        text
        size="small"
        class="ml-layer-manager-toolbar-btn"
        :title="t('main.toolPalette.layerManager.toolbar.newFilterGroup')"
        :aria-label="t('main.toolPalette.layerManager.toolbar.newFilterGroup')"
        @click="handleNewFilterGroup"
      >
        <el-icon :size="16"><FolderAdd /></el-icon>
      </el-button>
      <span class="ml-layer-manager-toolbar-sep" aria-hidden="true" />
      <el-button
        text
        size="small"
        class="ml-layer-manager-toolbar-btn"
        :title="t('main.toolPalette.layerManager.toolbar.newLayer')"
        :aria-label="t('main.toolPalette.layerManager.toolbar.newLayer')"
        @click="handleNewLayer"
      >
        <el-icon :size="16"><Plus /></el-icon>
      </el-button>
      <el-button
        text
        size="small"
        class="ml-layer-manager-toolbar-btn"
        :title="t('main.toolPalette.layerManager.toolbar.deleteLayer')"
        :aria-label="t('main.toolPalette.layerManager.toolbar.deleteLayer')"
        :disabled="!selectedLayer"
        @click="handleDeleteLayer"
      >
        <el-icon :size="16"><Delete /></el-icon>
      </el-button>
      <el-button
        text
        size="small"
        class="ml-layer-manager-toolbar-btn"
        :title="t('main.toolPalette.layerManager.toolbar.setCurrent')"
        :aria-label="t('main.toolPalette.layerManager.toolbar.setCurrent')"
        :disabled="!selectedLayer"
        @click="handleSetCurrent"
      >
        <span class="ml-layer-manager-toolbar-icon" aria-hidden="true">
          <component :is="layerCurrent" />
        </span>
      </el-button>
    </div>

    <div class="ml-layer-manager-body">
      <div class="ml-layer-manager-list">
        <el-table
          :data="displayedLayers"
          class="ml-layer-list"
          highlight-current-row
          :row-class-name="getRowClassName"
          @current-change="handleCurrentRowChange"
          @row-dblclick="handleRowDbClick"
        >
          <el-table-column
            property="name"
            :label="t('main.toolPalette.layerManager.layerList.name')"
            min-width="120"
            sortable
            show-overflow-tooltip
          >
            <template #default="scope">
              <span class="ml-layer-list-name">
                {{ scope.row.name }}
                <span
                  v-if="scope.row.name === currentLayerName"
                  class="ml-layer-list-current-marker"
                  :title="
                    t('main.toolPalette.layerManager.layerList.currentLayer')
                  "
                  aria-hidden="true"
                >
                  *
                </span>
              </span>
            </template>
          </el-table-column>
          <el-table-column
            property="isOn"
            :label="t('main.toolPalette.layerManager.layerList.on')"
            width="50"
          >
            <template #header>
              <div class="ml-layer-list-header-toggle">
                <el-checkbox
                  :model-value="isAllOn"
                  :indeterminate="isSomeOn"
                  :aria-label="t('main.toolPalette.layerManager.layerList.on')"
                  @change="handleToggleAll"
                />
              </div>
            </template>
            <template #default="scope">
              <div class="ml-layer-list-cell">
                <el-checkbox
                  :model-value="scope.row.isOn"
                  @change="handleLayerVisibility(scope.row, $event)"
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
      </div>
    </div>

    <ml-color-picker-dlg
      v-model="colorDialogVisible"
      :title="t('dialog.colorPickerDlg.title')"
      :color="oldColor"
      @ok="handleColorDialogOk"
      @cancel="handleColorDialogCancel"
    />
  </div>
</template>

<script setup lang="ts">
import {
  Delete,
  Filter,
  FolderAdd,
  Plus,
  Search
} from '@element-plus/icons-vue'
import {
  AcApDocManager,
  AcApLayerService
} from '@mlightcad/cad-simple-viewer'
import { AcCmColor } from '@mlightcad/data-model'
import {
  ElButton,
  ElCheckbox,
  ElIcon,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElPopover,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTree
} from 'element-plus'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  LAYER_FILTER_ALL,
  LAYER_FILTER_ALL_USED,
  LayerInfo,
  useLayerFilters,
  useLayers
} from '../../composable'
import { layerCurrent } from '../../svg'
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

interface FilterTreeNode {
  id: string
  label: string
  children?: FilterTreeNode[]
}

const props = defineProps<Props>()

const {
  layers,
  currentLayerName,
  setLayerOn,
  setLayerColor,
  setCurrentLayer
} = useLayers(props.editor)

const {
  filterTree,
  selectedFilterId,
  matchesSelectedFilter,
  createNamedFilter,
  createGroupFilter
} = useLayerFilters(props.editor)

const searchText = ref('')
const filterTreeVisible = ref(false)
const selectedLayer = ref<LayerInfo | null>(null)
const filterTreeRef = ref<InstanceType<typeof ElTree>>()

const syncFilterTreeSelection = async () => {
  await nextTick()
  filterTreeRef.value?.setCurrentKey(selectedFilterId.value)
}

watch(selectedFilterId, () => {
  void syncFilterTreeSelection()
})

watch(filterTreeVisible, visible => {
  if (visible) void syncFilterTreeSelection()
})

const currentLayerLabel = computed(() =>
  t('main.toolPalette.layerManager.currentLayerLabel', {
    name: currentLayerName.value || '—'
  })
)

const toFilterTreeNodes = (
  nodes: typeof filterTree
): FilterTreeNode[] =>
  nodes.map(node => ({
    id: node.id,
    label: node.name,
    children:
      node.children.length > 0 ? toFilterTreeNodes(node.children) : undefined
  }))

const filterTreeData = computed<FilterTreeNode[]>(() => [
  {
    id: LAYER_FILTER_ALL,
    label: t('main.toolPalette.layerManager.filterAll'),
    children: [
      {
        id: LAYER_FILTER_ALL_USED,
        label: t('main.toolPalette.layerManager.filterAllUsed')
      },
      ...toFilterTreeNodes(filterTree)
    ]
  }
])

const displayedLayers = computed(() => {
  const db = props.editor.curDocument?.database
  let result = [...layers]

  if (selectedFilterId.value !== LAYER_FILTER_ALL && db) {
    result = result.filter(layerInfo => {
      const record = db.tables.layerTable.getAt(layerInfo.name)
      return record ? matchesSelectedFilter(record) : false
    })
  }

  const query = searchText.value.trim().toLowerCase()
  if (query) {
    result = result.filter(layer => layer.name.toLowerCase().includes(query))
  }

  return result
})

watch(displayedLayers, rows => {
  if (
    selectedLayer.value &&
    !rows.some(row => row.name === selectedLayer.value?.name)
  ) {
    selectedLayer.value = null
  }
})

const getRowClassName = ({ row }: { row: LayerInfo }) =>
  row.name === currentLayerName.value ? 'ml-layer-list-row--current' : ''

const isAllOn = computed(() => {
  if (!displayedLayers.value.length) return false
  return displayedLayers.value.every(layer => layer.isOn)
})

const isSomeOn = computed(() => {
  if (!displayedLayers.value.length) return false
  const anyOn = displayedLayers.value.some(layer => layer.isOn)
  return anyOn && !isAllOn.value
})

const setLayerVisibility = (row: LayerInfo, isOn: boolean) => {
  setLayerOn(row.name, isOn)
}

const handleToggleAll = (isOn: boolean) => {
  displayedLayers.value.forEach(row => {
    if (row.isOn === isOn) return
    setLayerVisibility(row, isOn)
  })
}

const handleFilterNodeClick = (node: FilterTreeNode) => {
  selectedFilterId.value = node.id
  filterTreeVisible.value = false
}

const handleCurrentRowChange = (row: LayerInfo | undefined) => {
  selectedLayer.value = row ?? null
}

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

const handleLayerVisibility = (row: LayerInfo, isOn: boolean) => {
  setLayerVisibility(row, isOn)
}

const colorDialogVisible = ref(false)
const colorTargetLayer = ref<LayerInfo | null>(null)
const oldColor = ref<string | undefined>(undefined)

const openColorPicker = (row: LayerInfo) => {
  colorTargetLayer.value = row
  oldColor.value = row.color
  colorDialogVisible.value = true
}

const applySelectedColor = (color: AcCmColor) => {
  if (!colorTargetLayer.value) return
  setLayerColor(colorTargetLayer.value.name, color)
}

const handleColorDialogOk = (color: AcCmColor) => {
  applySelectedColor(color)
}

const handleColorDialogCancel = () => {
  // Discard temporary selection
}

const selectedLayerNamesForFilter = () => {
  if (selectedLayer.value) return [selectedLayer.value.name]
  return displayedLayers.value.map(layer => layer.name)
}

const promptName = async (
  title: string,
  message: string,
  defaultValue = ''
) => {
  try {
    const { value } = await ElMessageBox.prompt(message, title, {
      confirmButtonText: t('main.toolPalette.layerManager.prompts.confirm'),
      cancelButtonText: t('main.toolPalette.layerManager.prompts.cancel'),
      inputValue: defaultValue,
      inputPattern: /\S+/,
      inputErrorMessage: message
    })
    return value.trim()
  } catch {
    return null
  }
}

const handleNewFilter = async () => {
  const name = await promptName(
    t('main.toolPalette.layerManager.prompts.newFilterTitle'),
    t('main.toolPalette.layerManager.prompts.newFilterName')
  )
  if (!name) return

  const created = createNamedFilter(selectedLayerNamesForFilter(), name)
  if (!created) {
    ElMessage({
      message: t('main.toolPalette.layerManager.messages.filterExists', {
        name
      }),
      type: 'warning'
    })
    return
  }

  ElMessage({
    message: t('main.toolPalette.layerManager.messages.filterCreated', {
      name: created
    }),
    type: 'success'
  })
}

const handleNewFilterGroup = async () => {
  const name = await promptName(
    t('main.toolPalette.layerManager.prompts.newFilterGroupTitle'),
    t('main.toolPalette.layerManager.prompts.newFilterGroupName')
  )
  if (!name) return

  const created = createGroupFilter(name)
  if (!created) {
    ElMessage({
      message: t('main.toolPalette.layerManager.messages.filterExists', {
        name
      }),
      type: 'warning'
    })
    return
  }

  ElMessage({
    message: t('main.toolPalette.layerManager.messages.filterCreated', {
      name: created
    }),
    type: 'success'
  })
}

const handleNewLayer = async () => {
  const name = await promptName(
    t('main.toolPalette.layerManager.prompts.newLayerTitle'),
    t('main.toolPalette.layerManager.prompts.newLayerName')
  )
  if (!name) return

  const db = props.editor.curDocument?.database
  if (!db) {
    ElMessage({
      message: t('main.toolPalette.layerManager.messages.layerCreateFailed'),
      type: 'error'
    })
    return
  }

  const result = new AcApLayerService(db).createLayers([name])
  if (result.existed.includes(name)) {
    ElMessage({
      message: t('main.toolPalette.layerManager.messages.layerExists', { name }),
      type: 'warning'
    })
    return
  }
  if (result.created <= 0) {
    ElMessage({
      message: t('main.toolPalette.layerManager.messages.layerCreateFailed'),
      type: 'error'
    })
    return
  }

  ElMessage({
    message: t('main.toolPalette.layerManager.messages.layerCreated', { name }),
    type: 'success'
  })
}

const handleDeleteLayer = () => {
  const layer = selectedLayer.value
  if (!layer) {
    ElMessage({
      message: t('main.toolPalette.layerManager.messages.selectLayerFirst'),
      type: 'warning'
    })
    return
  }

  const db = props.editor.curDocument?.database
  if (!db) {
    ElMessage({
      message: t('main.toolPalette.layerManager.messages.layerDeleteFailed', {
        name: layer.name
      }),
      type: 'error'
    })
    return
  }

  const result = new AcApLayerService(db).deleteLayer(layer.name)
  if (!result.ok) {
    let message = t('main.toolPalette.layerManager.messages.layerDeleteFailed', {
      name: layer.name
    })
    if (result.reason === 'layer_0') {
      message = t('main.toolPalette.layerManager.messages.cannotDeleteLayer0')
    } else if (result.reason === 'current_layer') {
      message = t('main.toolPalette.layerManager.messages.cannotDeleteCurrent')
    }
    ElMessage({
      message,
      type: 'warning'
    })
    return
  }

  selectedLayer.value = null
  ElMessage({
    message: t('main.toolPalette.layerManager.messages.layerDeleted', {
      name: layer.name
    }),
    type: 'success'
  })
}

const handleSetCurrent = () => {
  const layer = selectedLayer.value
  if (!layer) {
    ElMessage({
      message: t('main.toolPalette.layerManager.messages.selectLayerFirst'),
      type: 'warning'
    })
    return
  }

  const ok = setCurrentLayer(layer.name)
  ElMessage({
    message: ok
      ? t('main.toolPalette.layerManager.messages.setCurrentSuccess', {
          name: layer.name
        })
      : t('main.toolPalette.layerManager.messages.setCurrentFailed', {
          name: layer.name
        }),
    type: ok ? 'success' : 'error'
  })
}
</script>

<style>
.ml-layer-manager-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.ml-layer-manager-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px 4px;
  flex-shrink: 0;
}

.ml-layer-manager-current {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.ml-layer-manager-search {
  width: 160px;
  flex-shrink: 0;
}

.ml-layer-manager-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px 6px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.ml-layer-manager-toolbar-btn {
  padding: 4px;
  margin: 0;
  min-height: 24px;
}

.ml-layer-manager-toolbar-btn--active {
  color: var(--el-color-primary);
}

.ml-layer-manager-toolbar-icon {
  display: inline-flex;
  width: 16px;
  height: 16px;
  color: var(--el-text-color-regular);
}

.ml-layer-manager-toolbar-icon :deep(svg) {
  width: 16px;
  height: 16px;
}

.ml-layer-manager-toolbar-sep {
  width: 1px;
  height: 16px;
  margin: 0 4px;
  background: var(--el-border-color);
}

.ml-layer-manager-body {
  display: flex;
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.ml-layer-manager-filters-title {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ml-layer-manager-filter-popover {
  display: flex;
  flex-direction: column;
  max-height: 280px;
  min-height: 0;
}

.ml-layer-manager-filter-popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding: 0 0 4px;
  flex-shrink: 0;
}

.ml-layer-manager-filter-tree {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: transparent;
  font-size: 12px;
}

.ml-layer-manager-filter-tree .el-tree-node__content {
  height: 26px;
}

.ml-layer-manager-filter-popper {
  padding: 8px;
}

.ml-layer-manager-list {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.ml-layer-list {
  width: 100%;
  font-size: small;
  min-width: 100%;
}

.ml-layer-list .el-table__cell {
  padding-top: 2px;
  padding-bottom: 2px;
}

.ml-layer-list .el-table__header .el-table__cell {
  padding-top: 4px;
  padding-bottom: 4px;
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

.ml-layer-list-header-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
}

.ml-layer-list-color {
  width: 20px;
  height: 20px;
}

.ml-layer-list-name {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.ml-layer-list-current-marker {
  color: var(--el-color-primary);
  font-weight: 600;
}

.ml-layer-list .ml-layer-list-row--current > td.el-table__cell {
  font-weight: 600;
}
</style>
