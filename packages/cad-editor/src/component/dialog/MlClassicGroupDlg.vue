<template>
  <ml-base-dialog
    :title="t('dialog.classicGroupDlg.title')"
    :width="360"
    v-model="dialogVisible"
    name="ClassicGroupDlg"
    @open="refreshGroups"
    @ok="handleOk"
  >
    <div class="classic-group">
      <el-table
        :data="groupRows"
        height="140"
        size="small"
        highlight-current-row
        @current-change="onSelectRow"
      >
        <el-table-column
          prop="name"
          :label="t('dialog.classicGroupDlg.groupName')"
          min-width="160"
        />
        <el-table-column
          prop="selectableLabel"
          :label="t('dialog.classicGroupDlg.selectable')"
          width="88"
        />
      </el-table>

      <fieldset class="section">
        <legend>{{ t('dialog.classicGroupDlg.identification') }}</legend>
        <el-form label-position="left" label-width="72px" size="small">
          <el-form-item :label="t('dialog.classicGroupDlg.groupName')">
            <el-input v-model="formName" />
          </el-form-item>
          <el-form-item :label="t('dialog.classicGroupDlg.description')">
            <el-input v-model="formDescription" />
          </el-form-item>
          <div class="row-actions">
            <el-button size="small" @click="findName">
              {{ t('dialog.classicGroupDlg.findName') }}
            </el-button>
            <el-button
              size="small"
              :disabled="!selectedGroup"
              @click="highlightGroup"
            >
              {{ t('dialog.classicGroupDlg.highlight') }}
            </el-button>
            <el-checkbox v-model="includeUnnamed" @change="onIncludeUnnamedChange">
              {{ t('dialog.classicGroupDlg.includeUnnamed') }}
            </el-checkbox>
          </div>
        </el-form>
      </fieldset>

      <fieldset class="section">
        <legend>{{ t('dialog.classicGroupDlg.createGroup') }}</legend>
        <div class="row-actions">
          <el-button type="primary" size="small" @click="createGroup">
            {{ t('dialog.classicGroupDlg.new') }}
          </el-button>
          <el-checkbox v-model="createSelectable">
            {{ t('dialog.classicGroupDlg.selectable') }}
          </el-checkbox>
          <el-checkbox v-model="createUnnamed">
            {{ t('dialog.classicGroupDlg.unnamed') }}
          </el-checkbox>
        </div>
      </fieldset>

      <fieldset class="section">
        <legend>{{ t('dialog.classicGroupDlg.changeGroup') }}</legend>
        <div class="change-grid">
          <el-button
            size="small"
            :disabled="!selectedGroup"
            @click="removeMembers"
          >
            {{ t('dialog.classicGroupDlg.remove') }}
          </el-button>
          <el-button
            size="small"
            :disabled="!selectedGroup"
            @click="addMembers"
          >
            {{ t('dialog.classicGroupDlg.add') }}
          </el-button>
          <el-button
            size="small"
            :disabled="!selectedGroup"
            @click="renameGroup"
          >
            {{ t('dialog.classicGroupDlg.rename') }}
          </el-button>
          <el-button
            size="small"
            :disabled="!selectedGroup"
            @click="showOrderDlg = true"
          >
            {{ t('dialog.classicGroupDlg.reOrder') }}
          </el-button>
          <el-button
            size="small"
            :disabled="!selectedGroup"
            @click="updateDescription"
          >
            {{ t('dialog.classicGroupDlg.descriptionBtn') }}
          </el-button>
          <el-button
            size="small"
            :disabled="!selectedGroup"
            @click="explodeGroup"
          >
            {{ t('dialog.classicGroupDlg.explode') }}
          </el-button>
          <el-button
            size="small"
            :disabled="!selectedGroup"
            @click="toggleSelectable"
          >
            {{ t('dialog.classicGroupDlg.selectableBtn') }}
          </el-button>
        </div>
      </fieldset>
    </div>

    <MlOrderGroupDlg
      v-if="showOrderDlg && selectedGroup"
      :group="selectedGroup"
      @close="showOrderDlg = false"
      @changed="refreshGroups"
    />
  </ml-base-dialog>
</template>

<script setup lang="ts">
import {
  acapCreateGroup,
  AcApDocManager,
  acapExplodeGroup,
  acapFindGroupsContaining,
  acapIsUnnamedGroup,
  acapListGroups,
  acapValidateGroupName,
  AcEdPromptEntityOptions,
  AcEdPromptSelectionOptions,
  AcEdPromptStatus
} from '@mlightcad/cad-simple-viewer'
import type { AcDbGroup } from '@mlightcad/data-model'
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'

import { useDialogManager } from '../../composable'
import MlBaseDialog from '../common/MlBaseDialog.vue'
import MlOrderGroupDlg from './MlOrderGroupDlg.vue'

const { t } = useI18n()
const { toggleDialog } = useDialogManager()
const dialogVisible = ref(true)

/** Default on: ribbon GROUP creates anonymous `*An` groups. */
const includeUnnamed = ref(true)
const createSelectable = ref(true)
const createUnnamed = ref(true)
const formName = ref('')
const formDescription = ref('')
const selectedGroup = shallowRef<AcDbGroup | null>(null)
const showOrderDlg = ref(false)
/** Full dictionary snapshot; list filtering is reactive via {@link includeUnnamed}. */
const allGroups = shallowRef<AcDbGroup[]>([])

const visibleGroups = computed(() => {
  if (includeUnnamed.value) return allGroups.value
  return allGroups.value.filter(g => !acapIsUnnamedGroup(g))
})

const groupRows = computed(() =>
  visibleGroups.value.map(g => ({
    name: g.name,
    selectableLabel: g.selectable
      ? t('dialog.classicGroupDlg.yes')
      : t('dialog.classicGroupDlg.no'),
    group: g
  }))
)

const refreshGroups = () => {
  const db = AcApDocManager.instance.curDocument?.database
  if (!db) {
    allGroups.value = []
    selectedGroup.value = null
    return
  }
  // Always load the full set; includeUnnamed filters in the computed.
  allGroups.value = acapListGroups(db, true)
  if (selectedGroup.value) {
    const still = visibleGroups.value.find(
      g => g.name === selectedGroup.value!.name
    )
    selectedGroup.value = still ?? null
  }
}

const onIncludeUnnamedChange = () => {
  if (
    selectedGroup.value &&
    !visibleGroups.value.some(g => g.name === selectedGroup.value!.name)
  ) {
    selectedGroup.value = null
  }
}

onMounted(refreshGroups)

const onSelectRow = (row: { group: AcDbGroup } | null) => {
  selectedGroup.value = row?.group ?? null
  if (selectedGroup.value) {
    formName.value = acapIsUnnamedGroup(selectedGroup.value)
      ? ''
      : selectedGroup.value.name
    formDescription.value = selectedGroup.value.description
  }
}

const withDialogHidden = async <T,>(
  fn: () => Promise<T>
): Promise<T> => {
  toggleDialog('ClassicGroupDlg', false)
  try {
    return await fn()
  } finally {
    toggleDialog('ClassicGroupDlg', true)
    refreshGroups()
  }
}

const findName = async () => {
  await withDialogHidden(async () => {
    const editor = AcApDocManager.instance.editor
    const picked = await editor.getEntity(
      new AcEdPromptEntityOptions(t('dialog.classicGroupDlg.pickObject'))
    )
    if (picked.status !== AcEdPromptStatus.OK || !picked.objectId) return
    const db = AcApDocManager.instance.curDocument.database
    const found = acapFindGroupsContaining(db, picked.objectId)
    if (found.length === 0) {
      ElMessage.info(t('dialog.classicGroupDlg.notInGroup'))
      return
    }
    ElMessage.info(found.map(g => g.name).join(', '))
    includeUnnamed.value = true
    selectedGroup.value = found[0]
    formName.value = acapIsUnnamedGroup(found[0]) ? '' : found[0].name
    formDescription.value = found[0].description
  })
}

const highlightGroup = () => {
  if (!selectedGroup.value) return
  const view = AcApDocManager.instance.curView
  const ids = [...selectedGroup.value.entityIds]
  view.highlight(ids)
  window.setTimeout(() => view.unhighlight(ids), 1000)
}

const createGroup = async () => {
  await withDialogHidden(async () => {
    const editor = AcApDocManager.instance.editor
    const db = AcApDocManager.instance.curDocument.database
    let ids = [...AcApDocManager.instance.curView.selectionSet.ids]
    if (ids.length === 0) {
      const sel = await editor.getSelection(
        new AcEdPromptSelectionOptions(
          t('dialog.classicGroupDlg.selectObjects')
        )
      )
      if (sel.status !== AcEdPromptStatus.OK || !sel.value?.count) return
      ids = [...sel.value.ids]
    }
    const unnamed = createUnnamed.value || !formName.value.trim()
    let name: string | undefined
    if (!unnamed) {
      const validated = acapValidateGroupName(formName.value)
      if (!validated) {
        ElMessage.warning(t('dialog.classicGroupDlg.invalidName'))
        return
      }
      if (db.objects.group.getAt(validated)) {
        ElMessage.warning(t('dialog.classicGroupDlg.nameExists'))
        return
      }
      name = validated
    }
    try {
      const group = acapCreateGroup(db, {
        name,
        unnamed,
        description: formDescription.value,
        selectable: createSelectable.value,
        entityIds: ids
      })
      ElMessage.success(
        t('dialog.classicGroupDlg.created').replace('{name}', group.name)
      )
      if (acapIsUnnamedGroup(group)) includeUnnamed.value = true
      selectedGroup.value = group
    } catch {
      ElMessage.warning(t('dialog.classicGroupDlg.invalidName'))
    }
  })
}

const addMembers = async () => {
  if (!selectedGroup.value) return
  await withDialogHidden(async () => {
    const editor = AcApDocManager.instance.editor
    const sel = await editor.getSelection(
      new AcEdPromptSelectionOptions(t('dialog.classicGroupDlg.selectToAdd'))
    )
    if (sel.status !== AcEdPromptStatus.OK || !sel.value) return
    selectedGroup.value!.append([...sel.value.ids])
  })
}

const removeMembers = async () => {
  if (!selectedGroup.value) return
  if (selectedGroup.value.selectable) {
    ElMessage.warning(t('dialog.classicGroupDlg.clearSelectableFirst'))
    return
  }
  await withDialogHidden(async () => {
    const editor = AcApDocManager.instance.editor
    const removePrompt = new AcEdPromptSelectionOptions(
      t('dialog.classicGroupDlg.selectToRemove')
    )
    removePrompt.allowGroupSelection = false
    const sel = await editor.getSelection(removePrompt)
    if (sel.status !== AcEdPromptStatus.OK || !sel.value) return
    const memberIds = [...sel.value.ids].filter(id =>
      selectedGroup.value!.has(id)
    )
    if (memberIds.length > 0) selectedGroup.value!.remove(memberIds)
  })
}

const renameGroup = () => {
  if (!selectedGroup.value) return
  const validated = acapValidateGroupName(formName.value)
  if (!validated) {
    ElMessage.warning(t('dialog.classicGroupDlg.invalidName'))
    return
  }
  const db = AcApDocManager.instance.curDocument.database
  if (
    db.objects.group.getAt(validated) &&
    validated !== selectedGroup.value.name
  ) {
    ElMessage.warning(t('dialog.classicGroupDlg.nameExists'))
    return
  }
  selectedGroup.value.setName(validated)
  selectedGroup.value.anonymous = false
  refreshGroups()
}

const updateDescription = () => {
  if (!selectedGroup.value) return
  selectedGroup.value.description = formDescription.value.slice(0, 64)
  refreshGroups()
}

const explodeGroup = () => {
  if (!selectedGroup.value) return
  const db = AcApDocManager.instance.curDocument.database
  acapExplodeGroup(db, selectedGroup.value)
  selectedGroup.value = null
  refreshGroups()
}

const toggleSelectable = () => {
  if (!selectedGroup.value) return
  selectedGroup.value.selectable = !selectedGroup.value.selectable
  refreshGroups()
}

const handleOk = () => {
  dialogVisible.value = false
}
</script>

<style scoped>
.classic-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.section {
  border: 1px solid var(--el-border-color, #dcdfe6);
  border-radius: 2px;
  padding: 4px 8px 8px;
  margin: 0;
}
.section legend {
  padding: 0 4px;
  font-size: 12px;
  color: var(--el-text-color-regular, #606266);
}
.row-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  align-items: center;
}
.change-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}
.classic-group :deep(.el-form-item) {
  margin-bottom: 6px;
}
.classic-group :deep(.el-checkbox) {
  height: auto;
  margin-right: 0;
}
</style>
