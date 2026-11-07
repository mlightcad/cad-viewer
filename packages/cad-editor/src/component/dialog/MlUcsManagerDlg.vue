<template>
  <ml-base-dialog
    v-model:modelValue="visible"
    :title="t('dialog.ucsManagerDlg.title')"
    :width="520"
    @open="reload"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <el-tabs v-model="activeTab" class="ml-ucs-manager">
      <el-tab-pane
        :label="t('dialog.ucsManagerDlg.tabs.named')"
        name="named"
      >
        <div class="ml-ucs-manager__current">
          {{
            t('dialog.ucsManagerDlg.currentUcs', { name: currentName })
          }}
        </div>
        <div class="ml-ucs-manager__named">
          <ul
            class="ml-ucs-manager__list"
            role="listbox"
            @contextmenu.prevent="onContextMenu"
          >
            <li
              v-for="item in listItems"
              :key="`${item.kind}:${item.name}`"
              class="ml-ucs-manager__item"
              :class="{
                'is-selected': selectedName === item.name,
                'is-current': item.isCurrent
              }"
              role="option"
              :aria-selected="selectedName === item.name"
              @click="selectedName = item.name"
              @dblclick="setCurrent"
            >
              <span
                class="ml-ucs-manager__pointer"
                :class="{ 'is-current': item.isCurrent }"
                aria-hidden="true"
              />
              <span class="ml-ucs-manager__item-name">{{ item.name }}</span>
            </li>
          </ul>
          <div class="ml-ucs-manager__side">
            <el-button :disabled="!selectedName" @click="setCurrent">
              {{ t('dialog.ucsManagerDlg.setCurrent') }}
            </el-button>
            <el-button :disabled="!selectedName" @click="detailsVisible = true">
              {{ t('dialog.ucsManagerDlg.details') }}
            </el-button>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane
        :label="t('dialog.ucsManagerDlg.tabs.settings')"
        name="settings"
      >
        <ml-fieldset-group
          :title="t('dialog.ucsManagerDlg.iconSettings')"
          class="ml-ucs-manager__fieldset"
        >
          <el-checkbox v-model="iconForm.on">{{
            t('dialog.ucsManagerDlg.iconOn')
          }}</el-checkbox>
          <el-checkbox v-model="iconForm.atOrigin">{{
            t('dialog.ucsManagerDlg.iconAtOrigin')
          }}</el-checkbox>
          <el-checkbox v-model="iconForm.applyToAllActiveViewports">{{
            t('dialog.ucsManagerDlg.applyToAllViewports')
          }}</el-checkbox>
          <el-checkbox v-model="iconForm.allowSelectingIcon">{{
            t('dialog.ucsManagerDlg.allowSelectingIcon')
          }}</el-checkbox>
        </ml-fieldset-group>

        <ml-fieldset-group
          :title="t('dialog.ucsManagerDlg.ucsSettings')"
          class="ml-ucs-manager__fieldset"
        >
          <el-checkbox v-model="viewportForm.saveUcsWithViewport">{{
            t('dialog.ucsManagerDlg.saveWithViewport')
          }}</el-checkbox>
          <el-checkbox v-model="viewportForm.updateViewToPlan">{{
            t('dialog.ucsManagerDlg.updateViewToPlan')
          }}</el-checkbox>
        </ml-fieldset-group>
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <div class="ml-ucs-manager__footer">
        <el-button type="primary" @click="handleOk">{{
          t('dialog.baseDialog.ok')
        }}</el-button>
        <el-button @click="handleCancel">{{
          t('dialog.baseDialog.cancel')
        }}</el-button>
        <el-button @click="openHelp">{{
          t('dialog.ucsManagerDlg.help')
        }}</el-button>
      </div>
    </template>

    <ml-ucs-details-dlg
      v-model="detailsVisible"
      :ucs-name="selectedName || currentName"
    />

    <ul
      v-if="contextMenu.visible"
      class="ml-ucs-manager__menu"
      :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
    >
      <li @click="setCurrent">{{ t('dialog.ucsManagerDlg.setCurrent') }}</li>
      <li @click="detailsVisible = true; hideMenu()">
        {{ t('dialog.ucsManagerDlg.details') }}
      </li>
      <li :class="{ 'is-disabled': !canRename }" @click="renameSelected">
        {{ t('dialog.ucsManagerDlg.rename') }}
      </li>
      <li :class="{ 'is-disabled': !canDelete }" @click="deleteSelected">
        {{ t('dialog.ucsManagerDlg.delete') }}
      </li>
    </ul>
  </ml-base-dialog>
</template>

<script setup lang="ts">
import {
  AcApDocManager,
  type AcApUcsIconSettings,
  type AcApUcsListItem,
  AcApUcsService,
  type AcApUcsViewportSettings,
  UCS_PREVIOUS_NAME,
  UCS_UNNAMED_NAME,
  UCS_WORLD_NAME
} from '@mlightcad/cad-simple-viewer'
import {
  ElButton,
  ElCheckbox,
  ElMessage,
  ElMessageBox,
  ElTabPane,
  ElTabs
} from 'element-plus'
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import MlBaseDialog from '../common/MlBaseDialog.vue'
import MlFieldsetGroup from '../common/MlFieldsetGroup.vue'
import MlUcsDetailsDlg from './MlUcsDetailsDlg.vue'

const HELP_URL =
  'https://help.autodesk.com/view/ACD/2026/ENU/?guid=GUID-51CC776E-5ED6-46FC-A850-E3690B0275AF'

const { t } = useI18n()

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [boolean]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const activeTab = ref('named')
const listItems = ref<AcApUcsListItem[]>([])
const selectedName = ref(UCS_WORLD_NAME)
const currentName = ref(UCS_WORLD_NAME)
const detailsVisible = ref(false)
const initialCurrentName = ref(UCS_WORLD_NAME)
const pendingCurrent = ref<string | null>(null)
const pendingRenames = ref<Array<{ from: string; to: string }>>([])
const pendingDeletes = ref<string[]>([])

const iconForm = reactive<AcApUcsIconSettings>({
  on: true,
  atOrigin: true,
  applyToAllActiveViewports: false,
  allowSelectingIcon: false
})
const viewportForm = reactive<AcApUcsViewportSettings>({
  saveUcsWithViewport: true,
  updateViewToPlan: false
})

const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0
})

const canRename = computed(() => {
  const item = listItems.value.find(i => i.name === selectedName.value)
  return item?.kind === 'named'
})
const canDelete = computed(() => canRename.value)

function reload() {
  const db = AcApDocManager.instance.curDocument?.database
  listItems.value = AcApUcsService.listUcsNames(db)
  currentName.value = AcApUcsService.getCurrentName(db)
  initialCurrentName.value = currentName.value
  selectedName.value =
    listItems.value.find(i => i.isCurrent)?.name ?? UCS_WORLD_NAME
  pendingCurrent.value = null
  pendingRenames.value = []
  pendingDeletes.value = []
  Object.assign(iconForm, AcApUcsService.getIconSettings(db))
  Object.assign(viewportForm, AcApUcsService.getViewportSettings(db))
  hideMenu()
}

function setCurrent() {
  if (!selectedName.value) return
  pendingCurrent.value = selectedName.value
  currentName.value = selectedName.value
  listItems.value = listItems.value.map(item => ({
    ...item,
    isCurrent: item.name === selectedName.value
  }))
  hideMenu()
}

async function renameSelected() {
  if (!canRename.value) return
  hideMenu()
  try {
    const { value } = await ElMessageBox.prompt(
      t('dialog.ucsManagerDlg.renamePrompt'),
      t('dialog.ucsManagerDlg.rename'),
      {
        inputValue: selectedName.value,
        confirmButtonText: t('dialog.baseDialog.ok'),
        cancelButtonText: t('dialog.baseDialog.cancel')
      }
    )
    const next = value.trim()
    if (!next || next === selectedName.value) return
    if (
      listItems.value.some(
        i =>
          i.kind === 'named' &&
          i.name.toUpperCase() === next.toUpperCase() &&
          i.name !== selectedName.value
      )
    ) {
      ElMessage.warning(t('dialog.ucsManagerDlg.renameFailed'))
      return
    }
    const from = selectedName.value
    pendingRenames.value = [
      ...pendingRenames.value.filter(r => r.from !== from),
      { from, to: next }
    ]
    listItems.value = listItems.value.map(item =>
      item.name === from ? { ...item, name: next } : item
    )
    if (pendingCurrent.value === from) pendingCurrent.value = next
    if (currentName.value === from) currentName.value = next
    selectedName.value = next
  } catch {
    // cancelled
  }
}

function deleteSelected() {
  if (!canDelete.value) return
  hideMenu()
  const name = selectedName.value
  pendingDeletes.value = [...pendingDeletes.value.filter(n => n !== name), name]
  pendingRenames.value = pendingRenames.value.filter(
    r => r.from !== name && r.to !== name
  )
  if (pendingCurrent.value === name) pendingCurrent.value = null
  listItems.value = listItems.value.filter(item => item.name !== name)
  selectedName.value =
    listItems.value.find(i => i.isCurrent)?.name ??
    listItems.value[0]?.name ??
    UCS_WORLD_NAME
}

function handleOk() {
  const db = AcApDocManager.instance.curDocument?.database
  if (db) {
    for (const name of pendingDeletes.value) {
      AcApUcsService.deleteNamed(name, db)
    }
    for (const { from, to } of pendingRenames.value) {
      if (!pendingDeletes.value.includes(from)) {
        AcApUcsService.renameNamed(from, to, db)
      }
    }
    if (
      pendingCurrent.value &&
      pendingCurrent.value !== initialCurrentName.value
    ) {
      if (pendingCurrent.value === UCS_PREVIOUS_NAME) {
        AcApUcsService.restorePrevious(db)
      } else if (pendingCurrent.value !== UCS_UNNAMED_NAME) {
        AcApUcsService.setCurrent(pendingCurrent.value, db)
      }
    }
    AcApUcsService.setIconSettings({ ...iconForm }, db)
    AcApUcsService.setViewportSettings({ ...viewportForm }, db)
  }
  visible.value = false
}

function handleCancel() {
  visible.value = false
}

function openHelp() {
  window.open(HELP_URL, '_blank', 'noopener,noreferrer')
}

function onContextMenu(e: MouseEvent) {
  const target = (e.target as HTMLElement).closest('.ml-ucs-manager__item')
  if (!target) return
  const name = target.querySelector('.ml-ucs-manager__item-name')?.textContent
  if (name) selectedName.value = name
  contextMenu.visible = true
  contextMenu.x = e.clientX
  contextMenu.y = e.clientY
}

function hideMenu() {
  contextMenu.visible = false
}

function onDocClick() {
  hideMenu()
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
})
</script>

<style scoped>
.ml-ucs-manager__current {
  margin-bottom: 8px;
  font-size: 13px;
}
.ml-ucs-manager__named {
  display: grid;
  grid-template-columns: 1fr 120px;
  gap: 12px;
  min-height: 220px;
}
.ml-ucs-manager__list {
  list-style: none;
  margin: 0;
  padding: 4px;
  border: 1px solid var(--el-border-color);
  border-radius: 2px;
  overflow: auto;
  background: var(--el-bg-color);
}
.ml-ucs-manager__item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  cursor: default;
  user-select: none;
}
.ml-ucs-manager__item.is-selected {
  background: var(--el-color-primary-light-7);
}
.ml-ucs-manager__pointer {
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
}
.ml-ucs-manager__pointer.is-current {
  background: var(--el-color-primary);
  clip-path: polygon(0 0, 100% 50%, 0 100%);
}
.ml-ucs-manager__side {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ml-ucs-manager__side .el-button {
  margin: 0;
}
.ml-ucs-manager__fieldset {
  margin-bottom: 12px;
}
.ml-ucs-manager__fieldset :deep(.el-checkbox) {
  display: flex;
  margin: 6px 0;
}
.ml-ucs-manager__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.ml-ucs-manager__menu {
  position: fixed;
  z-index: 4000;
  margin: 0;
  padding: 4px 0;
  list-style: none;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color);
  box-shadow: var(--el-box-shadow-light);
  min-width: 140px;
}
.ml-ucs-manager__menu li {
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
}
.ml-ucs-manager__menu li:hover {
  background: var(--el-fill-color-light);
}
.ml-ucs-manager__menu li.is-disabled {
  opacity: 0.45;
  pointer-events: none;
}
</style>
