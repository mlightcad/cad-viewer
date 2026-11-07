<template>
  <ml-base-dialog
    v-model:modelValue="visible"
    :title="t('dialog.newViewDlg.title')"
    :width="420"
    :auto-close="false"
    @open="handleOpen"
    @ok="handleOk"
  >
    <el-form label-position="top">
      <el-form-item :label="t('dialog.newViewDlg.name')">
        <el-input v-model="name" maxlength="255" />
      </el-form-item>
      <el-form-item :label="t('dialog.newViewDlg.boundary')">
        <el-radio-group v-model="boundary">
          <el-radio value="current">
            {{ t('dialog.newViewDlg.currentDisplay') }}
          </el-radio>
          <el-radio value="window">
            {{ t('dialog.newViewDlg.defineWindow') }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item>
        <el-checkbox v-model="saveLayerSnapshot">
          {{ t('dialog.newViewDlg.saveLayerSnapshot') }}
        </el-checkbox>
      </el-form-item>
    </el-form>
  </ml-base-dialog>
</template>

<script setup lang="ts">
import {
  AcApDocManager,
  AcApNamedViewService,
  AcEdOpenMode,
  AcEdPromptBoxOptions,
  AcEdPromptStatus
} from '@mlightcad/cad-simple-viewer'
import {
  ElCheckbox,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElRadio,
  ElRadioGroup
} from 'element-plus'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { bumpNamedViewsRevision } from '../../composable/namedViewsRevision'
import MlBaseDialog from '../common/MlBaseDialog.vue'

const { t } = useI18n()
const visible = defineModel<boolean>('modelValue', { default: false })

const name = ref('')
const boundary = ref<'current' | 'window'>('current')
const saveLayerSnapshot = ref(true)

const handleOpen = () => {
  name.value = ''
  boundary.value = 'current'
  saveLayerSnapshot.value = true
}

const handleOk = async () => {
  const trimmed = name.value.trim()
  if (!trimmed) {
    ElMessage.warning(t('dialog.newViewDlg.nameRequired'))
    return
  }
  if (!AcApNamedViewService.isValidViewName(trimmed)) {
    ElMessage.warning(t('dialog.newViewDlg.nameInvalid'))
    return
  }

  const docManager = AcApDocManager.instance
  if (docManager.curDocument.openMode < AcEdOpenMode.Write) {
    ElMessage.warning(t('dialog.newViewDlg.writeRequired'))
    return
  }

  const db = docManager.curDocument.database
  const view = docManager.curView

  if (db.tables.viewTable.has(trimmed)) {
    ElMessage.warning(t('dialog.newViewDlg.nameExists', { name: trimmed }))
    return
  }

  if (boundary.value === 'window') {
    visible.value = false
    const boxOptions = new AcEdPromptBoxOptions(
      t('dialog.newViewDlg.firstCorner'),
      t('dialog.newViewDlg.secondCorner')
    )
    const boxResult = await docManager.editor.getBox(boxOptions)
    if (boxResult.status !== AcEdPromptStatus.OK || !boxResult.value) {
      return
    }
    const created = AcApNamedViewService.createView(db, view, {
      name: trimmed,
      box: boxResult.value,
      saveLayerSnapshot: saveLayerSnapshot.value
    })
    if (!created) {
      ElMessage.warning(t('dialog.newViewDlg.createFailed'))
      return
    }
    bumpNamedViewsRevision()
    ElMessage.success(t('dialog.newViewDlg.created', { name: trimmed }))
    return
  }

  const created = AcApNamedViewService.createView(db, view, {
    name: trimmed,
    saveLayerSnapshot: saveLayerSnapshot.value
  })
  if (!created) {
    ElMessage.warning(t('dialog.newViewDlg.createFailed'))
    return
  }
  bumpNamedViewsRevision()
  visible.value = false
  ElMessage.success(t('dialog.newViewDlg.created', { name: trimmed }))
}
</script>
