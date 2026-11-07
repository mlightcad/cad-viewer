<template>
  <ml-base-dialog
    v-model:modelValue="visible"
    :title="t('dialog.viewManagerDlg.title')"
    :width="720"
    :show-footer="false"
    @open="reload"
  >
    <div class="ml-view-manager">
      <div class="ml-view-manager__tree">
        <div
          v-for="node in treeNodes"
          :key="node.id"
          class="ml-view-manager__node"
        >
          <button
            type="button"
            class="ml-view-manager__node-label"
            :class="{ 'is-active': selectedId === node.id }"
            :disabled="node.disabled"
            @click="selectNode(node)"
          >
            {{ node.label }}
          </button>
          <ul v-if="node.children?.length" class="ml-view-manager__children">
            <li v-for="child in node.children" :key="child.id">
              <button
                type="button"
                class="ml-view-manager__node-label is-child"
                :class="{ 'is-active': selectedId === child.id }"
                :disabled="child.disabled"
                @click="selectNode(child)"
              >
                {{ child.label }}
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div class="ml-view-manager__props">
        <div class="ml-view-manager__section-title">
          {{ t('dialog.viewManagerDlg.general') }}
        </div>
        <dl class="ml-view-manager__dl">
          <div>
            <dt>{{ t('dialog.viewManagerDlg.name') }}</dt>
            <dd>{{ selectedProps.name || '—' }}</dd>
          </div>
          <div>
            <dt>{{ t('dialog.viewManagerDlg.layerSnapshot') }}</dt>
            <dd>
              {{
                selectedProps.hasLayerSnapshot
                  ? t('dialog.viewManagerDlg.yes')
                  : t('dialog.viewManagerDlg.no')
              }}
            </dd>
          </div>
        </dl>
        <div class="ml-view-manager__section-title">
          {{ t('dialog.viewManagerDlg.view') }}
        </div>
        <dl class="ml-view-manager__dl">
          <div>
            <dt>{{ t('dialog.viewManagerDlg.center') }}</dt>
            <dd>{{ selectedProps.center }}</dd>
          </div>
          <div>
            <dt>{{ t('dialog.viewManagerDlg.height') }}</dt>
            <dd>{{ selectedProps.height }}</dd>
          </div>
          <div>
            <dt>{{ t('dialog.viewManagerDlg.width') }}</dt>
            <dd>{{ selectedProps.width }}</dd>
          </div>
          <div>
            <dt>{{ t('dialog.viewManagerDlg.roll') }}</dt>
            <dd>{{ selectedProps.roll }}</dd>
          </div>
        </dl>
      </div>

      <div class="ml-view-manager__actions">
        <el-button
          :disabled="!canSetCurrent"
          @click="setCurrent"
        >
          {{ t('dialog.viewManagerDlg.setCurrent') }}
        </el-button>
        <el-button :disabled="!canWrite" @click="openNewView">
          {{ t('dialog.viewManagerDlg.new') }}
        </el-button>
        <el-button
          :disabled="!canUpdateLayers"
          @click="updateLayers"
        >
          {{ t('dialog.viewManagerDlg.updateLayers') }}
        </el-button>
        <el-button
          :disabled="!canEditBoundaries"
          @click="editBoundaries"
        >
          {{ t('dialog.viewManagerDlg.editBoundaries') }}
        </el-button>
        <el-button :disabled="!canDelete" @click="deleteSelected">
          {{ t('dialog.viewManagerDlg.delete') }}
        </el-button>
        <el-button @click="visible = false">
          {{ t('dialog.viewManagerDlg.close') }}
        </el-button>
      </div>
    </div>
  </ml-base-dialog>
</template>

<script setup lang="ts">
import {
  AcApDocManager,
  type AcApNamedViewListItem,
  AcApNamedViewService,
  AcEdOpenMode,
  AcEdPromptBoxOptions,
  AcEdPromptStatus} from '@mlightcad/cad-simple-viewer'
import { ElButton, ElMessage } from 'element-plus'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useDialogManager } from '../../composable'
import { bumpNamedViewsRevision } from '../../composable/namedViewsRevision'
import MlBaseDialog from '../common/MlBaseDialog.vue'

interface TreeNode {
  id: string
  label: string
  kind: 'current' | 'group' | 'named' | 'preset'
  name?: string
  disabled?: boolean
  children?: TreeNode[]
}

const { t } = useI18n()
const visible = defineModel<boolean>('modelValue', { default: false })
const { toggleDialog } = useDialogManager()

const namedViews = ref<AcApNamedViewListItem[]>([])
const selectedId = ref('current')

const canWrite = computed(
  () =>
    AcApDocManager.instance.curDocument.openMode >= AcEdOpenMode.Write
)

const selectedNamed = computed(() => {
  if (!selectedId.value.startsWith('named:')) return undefined
  const name = selectedId.value.slice('named:'.length)
  return namedViews.value.find(v => v.name === name)
})

const selectedIsPresetTop = computed(() => selectedId.value === 'preset:Top')

const canSetCurrent = computed(
  () => !!selectedNamed.value || selectedIsPresetTop.value
)

const canUpdateLayers = computed(
  () => canWrite.value && !!selectedNamed.value
)

const canEditBoundaries = computed(
  () => canWrite.value && !!selectedNamed.value
)

const canDelete = computed(() => canWrite.value && !!selectedNamed.value)

const selectedProps = computed(() => {
  const empty = {
    name: '',
    hasLayerSnapshot: false,
    center: '—',
    height: '—',
    width: '—',
    roll: '—'
  }
  if (selectedId.value === 'current') {
    return { ...empty, name: t('dialog.viewManagerDlg.current') }
  }
  if (selectedIsPresetTop.value) {
    return { ...empty, name: 'Top' }
  }
  const item = selectedNamed.value
  if (!item) return empty
  const camera = AcApNamedViewService.getCamera(
    AcApDocManager.instance.curDocument.database,
    item.name
  )
  if (!camera) return { ...empty, name: item.name }
  return {
    name: item.name,
    hasLayerSnapshot: camera.hasLayerSnapshot,
    center: `${formatNum(camera.center.x)}, ${formatNum(camera.center.y)}`,
    height: formatNum(camera.viewHeight),
    width: formatNum(camera.viewWidth),
    roll: formatNum((camera.viewTwistAngle * 180) / Math.PI)
  }
})

const treeNodes = computed<TreeNode[]>(() => {
  const modelChildren = namedViews.value
    .filter(v => v.group === 'model')
    .map(v => ({
      id: `named:${v.name}`,
      label: v.name,
      kind: 'named' as const,
      name: v.name
    }))
  const layoutChildren = namedViews.value
    .filter(v => v.group === 'layout')
    .map(v => ({
      id: `named:${v.name}`,
      label: v.name,
      kind: 'named' as const,
      name: v.name
    }))
  return [
    {
      id: 'current',
      label: t('dialog.viewManagerDlg.current'),
      kind: 'current'
    },
    {
      id: 'model-views',
      label: t('dialog.viewManagerDlg.modelViews'),
      kind: 'group',
      children: modelChildren
    },
    {
      id: 'layout-views',
      label: t('dialog.viewManagerDlg.layoutViews'),
      kind: 'group',
      children: layoutChildren
    },
    {
      id: 'preset-views',
      label: t('dialog.viewManagerDlg.presetViews'),
      kind: 'group',
      children: [
        {
          id: 'preset:Top',
          label: 'Top',
          kind: 'preset'
        },
        {
          id: 'preset:Bottom',
          label: 'Bottom',
          kind: 'preset',
          disabled: true
        },
        {
          id: 'preset:Left',
          label: 'Left',
          kind: 'preset',
          disabled: true
        },
        {
          id: 'preset:Right',
          label: 'Right',
          kind: 'preset',
          disabled: true
        },
        {
          id: 'preset:Front',
          label: 'Front',
          kind: 'preset',
          disabled: true
        },
        {
          id: 'preset:Back',
          label: 'Back',
          kind: 'preset',
          disabled: true
        }
      ]
    }
  ]
})

function formatNum(value: number) {
  if (!Number.isFinite(value)) return '—'
  return Number(value.toFixed(4)).toString()
}

function reload() {
  const db = AcApDocManager.instance.curDocument.database
  namedViews.value = AcApNamedViewService.listViews(db)
  selectedId.value = 'current'
}

function selectNode(node: TreeNode) {
  if (node.disabled || node.kind === 'group') return
  selectedId.value = node.id
}

function setCurrent() {
  const docManager = AcApDocManager.instance
  const doc = docManager.curDocument
  if (selectedIsPresetTop.value) {
    ElMessage.info(t('dialog.viewManagerDlg.topPresetHint'))
    visible.value = false
    return
  }
  const item = selectedNamed.value
  if (!item) return
  const applyLayers = doc.openMode >= AcEdOpenMode.Write
  if (applyLayers) {
    doc.captureLayerPreviousState()
  }
  const ok = AcApNamedViewService.restoreView(
    doc.database,
    docManager.curView,
    item.name,
    applyLayers
  )
  if (!ok) {
    ElMessage.warning(t('dialog.viewManagerDlg.notFound', { name: item.name }))
    return
  }
  visible.value = false
}

function openNewView() {
  visible.value = false
  toggleDialog('NewViewDlg', true)
}

function updateLayers() {
  const item = selectedNamed.value
  if (!item) return
  const ok = AcApNamedViewService.updateLayerSnapshot(
    AcApDocManager.instance.curDocument.database,
    item.name
  )
  if (!ok) {
    ElMessage.warning(t('dialog.viewManagerDlg.notFound', { name: item.name }))
    return
  }
  reload()
  selectedId.value = `named:${item.name}`
  bumpNamedViewsRevision()
  ElMessage.success(t('dialog.viewManagerDlg.layersUpdated'))
}

async function editBoundaries() {
  const item = selectedNamed.value
  if (!item) return
  visible.value = false
  const docManager = AcApDocManager.instance
  const boxOptions = new AcEdPromptBoxOptions(
    t('dialog.viewManagerDlg.firstCorner'),
    t('dialog.viewManagerDlg.secondCorner')
  )
  const boxResult = await docManager.editor.getBox(boxOptions)
  if (boxResult.status !== AcEdPromptStatus.OK || !boxResult.value) {
    return
  }
  const ok = AcApNamedViewService.updateBoundaries(
    docManager.curDocument.database,
    item.name,
    boxResult.value
  )
  if (!ok) {
    ElMessage.warning(t('dialog.viewManagerDlg.notFound', { name: item.name }))
    return
  }
  bumpNamedViewsRevision()
  ElMessage.success(t('dialog.viewManagerDlg.boundariesUpdated'))
}

function deleteSelected() {
  const item = selectedNamed.value
  if (!item) return
  const ok = AcApNamedViewService.deleteView(
    AcApDocManager.instance.curDocument.database,
    item.name
  )
  if (!ok) {
    ElMessage.warning(t('dialog.viewManagerDlg.notFound', { name: item.name }))
    return
  }
  reload()
  bumpNamedViewsRevision()
  ElMessage.success(t('dialog.viewManagerDlg.deleted', { name: item.name }))
}
</script>

<style scoped>
.ml-view-manager {
  display: grid;
  grid-template-columns: 200px 1fr 140px;
  gap: 12px;
  min-height: 360px;
}

.ml-view-manager__tree {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  padding: 8px;
  overflow: auto;
  max-height: 420px;
}

.ml-view-manager__node {
  margin-bottom: 4px;
}

.ml-view-manager__node-label {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 4px 6px;
  border-radius: 3px;
  cursor: pointer;
  color: inherit;
  font: inherit;
}

.ml-view-manager__node-label:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ml-view-manager__node-label.is-active {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

.ml-view-manager__node-label.is-child {
  padding-left: 16px;
}

.ml-view-manager__children {
  list-style: none;
  margin: 0;
  padding: 0;
}

.ml-view-manager__props {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  padding: 10px 12px;
  overflow: auto;
}

.ml-view-manager__section-title {
  font-weight: 600;
  margin: 8px 0 6px;
}

.ml-view-manager__dl {
  margin: 0;
}

.ml-view-manager__dl > div {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.ml-view-manager__dl dt {
  color: var(--el-text-color-secondary);
}

.ml-view-manager__dl dd {
  margin: 0;
}

.ml-view-manager__actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ml-view-manager__actions .el-button {
  margin: 0;
  width: 100%;
}
</style>
