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
      <el-button
        text
        size="small"
        class="ml-layer-manager-toolbar-btn"
        :class="{
          'ml-layer-manager-toolbar-btn--active': filterPanelVisible
        }"
        :title="t('main.toolPalette.layerManager.toolbar.showFilters')"
        :aria-label="t('main.toolPalette.layerManager.toolbar.showFilters')"
        :aria-pressed="filterPanelVisible"
        @click="filterPanelVisible = !filterPanelVisible"
      >
        <el-icon :size="16"><Filter /></el-icon>
      </el-button>
      <span class="ml-layer-manager-toolbar-sep" aria-hidden="true" />
      <div class="ml-layer-manager-toolbar-layer-actions">
        <el-button
          text
          size="small"
          class="ml-layer-manager-toolbar-btn"
          :title="t('main.toolPalette.layerManager.toolbar.newLayer')"
          :aria-label="t('main.toolPalette.layerManager.toolbar.newLayer')"
          :disabled="isDraftingNewLayer"
          @click="handleNewLayer"
        >
          <span class="ml-layer-manager-toolbar-icon" aria-hidden="true">
            <component :is="layerNew" />
          </span>
        </el-button>
        <el-button
          text
          size="small"
          class="ml-layer-manager-toolbar-btn"
          :title="t('main.toolPalette.layerManager.toolbar.deleteLayer')"
          :aria-label="t('main.toolPalette.layerManager.toolbar.deleteLayer')"
          :disabled="!selectedLayer || isDraftingNewLayer"
          @click="handleDeleteLayer"
        >
          <span class="ml-layer-manager-toolbar-icon" aria-hidden="true">
            <component :is="layerDelete" />
          </span>
        </el-button>
        <el-button
          text
          size="small"
          class="ml-layer-manager-toolbar-btn"
          :title="t('main.toolPalette.layerManager.toolbar.setCurrent')"
          :aria-label="t('main.toolPalette.layerManager.toolbar.setCurrent')"
          :disabled="!selectedLayer || isDraftingNewLayer"
          @click="handleSetCurrent"
        >
          <span class="ml-layer-manager-toolbar-icon" aria-hidden="true">
            <component :is="layerSetCurrent" />
          </span>
        </el-button>
      </div>
    </div>

    <div class="ml-layer-manager-body">
      <div
        v-show="filterPanelVisible"
        class="ml-layer-manager-filter-panel"
      >
        <div class="ml-layer-manager-filter-panel-header">
          <span class="ml-layer-manager-filters-title">
            {{ t('main.toolPalette.layerManager.filters') }}
          </span>
          <div class="ml-layer-manager-filter-panel-actions">
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
            <el-button
              text
              size="small"
              class="ml-layer-manager-toolbar-btn"
              :title="t('main.toolPalette.layerManager.toolbar.newFilterGroup')"
              :aria-label="
                t('main.toolPalette.layerManager.toolbar.newFilterGroup')
              "
              @click="handleNewFilterGroup"
            >
              <el-icon :size="16"><FolderAdd /></el-icon>
            </el-button>
          </div>
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

      <div class="ml-layer-manager-list">
        <MlLayerTable
          ref="layerTableRef"
          :layers="displayedLayers"
          :current-layer-name="currentLayerName"
          v-model:selected-layer-name="selectedLayerName"
          v-model:draft-layer-name="draftLayerName"
          @row-dblclick="handleRowDbClick"
          @draft-commit="commitDraftLayer"
          @draft-cancel="cancelDraftLayer"
          @toggle-all-on="handleToggleAll"
          @change="handleLayerChange"
          @change-color="handleLayerColorChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Filter,
  FolderAdd,
  Plus,
  Search
} from '@element-plus/icons-vue'
import {
  AcApDocManager,
  AcApLayerService
} from '@mlightcad/cad-simple-viewer'
import { AcCmColor, AcCmTransparency } from '@mlightcad/data-model'
import {
  ElButton,
  ElIcon,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElTree
} from 'element-plus'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  LAYER_FILTER_ALL,
  LAYER_FILTER_ALL_USED,
  useLayerFilters,
  useLayers
} from '../../composable'
import { layerDelete, layerNew, layerSetCurrent } from '../../svg'
import MlLayerTable from '../common/MlLayerTable.vue'
import type {
  MlLayerTableChangeField,
  MlLayerTableRow
} from '../common/MlLayerTable.vue'

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

const DRAFT_CSS_COLOR = '#FFFFFF'

const props = defineProps<Props>()

const {
  layers,
  currentLayerName,
  setLayerOn,
  setLayerFrozen,
  setLayerLocked,
  setLayerPlottable,
  setLayerColor,
  setLayerLinetype,
  setLayerLineWeight,
  setLayerTransparency,
  setLayerDescription,
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
const filterPanelVisible = ref(false)
/** Selected layer name (stable across table row identity refreshes). */
const selectedLayerName = ref<string | null>(null)
const filterTreeRef = ref<InstanceType<typeof ElTree>>()
const layerTableRef = ref<InstanceType<typeof MlLayerTable>>()
/** When true, an inline new-layer row is shown below the current layer. */
const isDraftingNewLayer = ref(false)
const draftLayerName = ref('')
/** Suppresses blur-commit when Escape cancels the draft. */
let cancellingDraft = false
/** Prevents re-entrant commit while creating the layer. */
let committingDraft = false

const syncFilterTreeSelection = async () => {
  await nextTick()
  filterTreeRef.value?.setCurrentKey(selectedFilterId.value)
}

watch(selectedFilterId, () => {
  void syncFilterTreeSelection()
})

watch(filterPanelVisible, visible => {
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

const buildDraftRow = (): MlLayerTableRow => ({
  name: draftLayerName.value,
  color: 'ACI:7',
  cssColor: DRAFT_CSS_COLOR,
  isOn: true,
  isFrozen: false,
  isLocked: false,
  isInUse: false,
  isPlottable: true,
  transparency: '0',
  linetype: 'Continuous',
  lineWeight: -1,
  description: '',
  isDraft: true
})

const displayedLayers = computed<MlLayerTableRow[]>(() => {
  const db = props.editor.curDocument?.database
  let result: MlLayerTableRow[] = [...layers]

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

  if (isDraftingNewLayer.value) {
    const draftRow = buildDraftRow()
    const insertAfter = currentLayerName.value
    const insertIndex = result.findIndex(layer => layer.name === insertAfter)
    if (insertIndex >= 0) {
      result = [
        ...result.slice(0, insertIndex + 1),
        draftRow,
        ...result.slice(insertIndex + 1)
      ]
    } else {
      result = [draftRow, ...result]
    }
  }

  return result
})

const selectedLayer = computed(
  () =>
    displayedLayers.value.find(
      layer => !layer.isDraft && layer.name === selectedLayerName.value
    ) ?? null
)

watch(displayedLayers, rows => {
  if (
    selectedLayerName.value &&
    !rows.some(
      row => !row.isDraft && row.name === selectedLayerName.value
    )
  ) {
    selectedLayerName.value = null
  }
})

const handleFilterNodeClick = (node: FilterTreeNode) => {
  selectedFilterId.value = node.id
}

const handleRowDbClick = (row: MlLayerTableRow) => {
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

const handleToggleAll = (isOn: boolean) => {
  displayedLayers.value.forEach(row => {
    if (row.isDraft) return
    if (row.isOn === isOn) return
    setLayerOn(row.name, isOn)
  })
}

const handleLayerChange = (payload: {
  layerName: string
  field: MlLayerTableChangeField
  value: boolean | string | number
}) => {
  const { layerName, field, value } = payload
  switch (field) {
    case 'on':
      setLayerOn(layerName, Boolean(value))
      break
    case 'frozen':
      setLayerFrozen(layerName, Boolean(value))
      break
    case 'locked':
      setLayerLocked(layerName, Boolean(value))
      break
    case 'plottable':
      setLayerPlottable(layerName, Boolean(value))
      break
    case 'linetype':
      setLayerLinetype(layerName, String(value))
      break
    case 'lineWeight':
      setLayerLineWeight(layerName, Number(value))
      break
    case 'transparency': {
      const transparency = AcCmTransparency.fromString(String(value).trim())
      setLayerTransparency(layerName, transparency)
      break
    }
    case 'description':
      setLayerDescription(layerName, String(value ?? ''))
      break
  }
}

const handleLayerColorChange = (payload: {
  layerName: string
  color: AcCmColor
}) => {
  setLayerColor(payload.layerName, payload.color)
}

const selectedLayerNamesForFilter = () => {
  if (selectedLayer.value) return [selectedLayer.value.name]
  return displayedLayers.value
    .filter(layer => !layer.isDraft)
    .map(layer => layer.name)
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

const suggestNewLayerName = () => {
  const existing = new Set(layers.map(layer => layer.name.toLowerCase()))
  let index = 1
  while (existing.has(`layer${index}`)) {
    index++
  }
  return `Layer${index}`
}

const focusDraftInput = async () => {
  await layerTableRef.value?.focusDraftInput()
}

const cancelDraftLayer = () => {
  if (!isDraftingNewLayer.value) return
  cancellingDraft = true
  isDraftingNewLayer.value = false
  draftLayerName.value = ''
  void nextTick(() => {
    cancellingDraft = false
  })
}

const commitDraftLayer = () => {
  if (cancellingDraft || committingDraft || !isDraftingNewLayer.value) return

  const name = draftLayerName.value.trim()
  if (!name) {
    cancelDraftLayer()
    return
  }

  const db = props.editor.curDocument?.database
  if (!db) {
    ElMessage({
      message: t('main.toolPalette.layerManager.messages.layerCreateFailed'),
      type: 'error'
    })
    cancelDraftLayer()
    return
  }

  committingDraft = true
  try {
    const result = new AcApLayerService(db).createLayers([name])
    if (result.existed.includes(name)) {
      ElMessage({
        message: t('main.toolPalette.layerManager.messages.layerExists', {
          name
        }),
        type: 'warning'
      })
      void focusDraftInput()
      return
    }
    if (result.created <= 0) {
      ElMessage({
        message: t('main.toolPalette.layerManager.messages.layerCreateFailed'),
        type: 'error'
      })
      cancelDraftLayer()
      return
    }

    isDraftingNewLayer.value = false
    draftLayerName.value = ''
    selectedLayerName.value = name
    ElMessage({
      message: t('main.toolPalette.layerManager.messages.layerCreated', {
        name
      }),
      type: 'success'
    })
  } finally {
    committingDraft = false
  }
}

const handleNewLayer = () => {
  if (isDraftingNewLayer.value) {
    void focusDraftInput()
    return
  }

  if (!props.editor.curDocument?.database) {
    ElMessage({
      message: t('main.toolPalette.layerManager.messages.layerCreateFailed'),
      type: 'error'
    })
    return
  }

  draftLayerName.value = suggestNewLayerName()
  isDraftingNewLayer.value = true
  selectedLayerName.value = null
  void focusDraftInput()
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

  selectedLayerName.value = null
  ElMessage({
    message: t('main.toolPalette.layerManager.messages.layerDeleted', {
      name: layer.name
    }),
    type: 'success'
  })
}

const handleSetCurrent = () => {
  const layerName = selectedLayerName.value
  if (!layerName) {
    ElMessage({
      message: t('main.toolPalette.layerManager.messages.selectLayerFirst'),
      type: 'warning'
    })
    return
  }

  // Same path as the Home ribbon layer dropdown: mutate via useLayers /
  // AcApLayerStore.setCurrentLayer (undo is handled inside the service).
  const ok = setCurrentLayer(layerName)

  ElMessage({
    message: ok
      ? t('main.toolPalette.layerManager.messages.setCurrentSuccess', {
          name: layerName
        })
      : t('main.toolPalette.layerManager.messages.setCurrentFailed', {
          name: layerName
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
  padding: 2px 2px 2px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.ml-layer-manager-toolbar-btn {
  padding: 4px;
  margin: 0;
  min-height: 24px;
}

.ml-layer-manager-toolbar-layer-actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.ml-layer-manager-toolbar-layer-actions
  .ml-layer-manager-toolbar-btn
  + .ml-layer-manager-toolbar-btn {
  margin-left: 0 !important;
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

.ml-layer-manager-filter-panel {
  display: flex;
  flex-direction: column;
  width: 180px;
  flex-shrink: 0;
  min-height: 0;
  border-right: 1px solid var(--el-border-color-lighter);
  overflow: hidden;
}

.ml-layer-manager-filter-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding: 4px 6px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.ml-layer-manager-filter-panel-actions {
  display: flex;
  align-items: center;
  gap: 0;
  flex-shrink: 0;
}

.ml-layer-manager-filters-title {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ml-layer-manager-filter-tree {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 4px 0;
  background: transparent;
  font-size: 12px;
}

.ml-layer-manager-filter-tree .el-tree-node__content {
  height: 26px;
}

.ml-layer-manager-list {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}
</style>
