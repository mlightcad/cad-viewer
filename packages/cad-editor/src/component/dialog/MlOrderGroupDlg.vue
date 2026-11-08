<template>
  <ml-base-dialog
    :title="t('dialog.orderGroupDlg.title')"
    :width="420"
    v-model="dialogVisible"
    name="OrderGroupDlg"
    @ok="handleOk"
  >
    <el-form label-position="top">
      <el-form-item :label="t('dialog.orderGroupDlg.groupName')">
        <el-input :model-value="groupName" disabled />
      </el-form-item>
      <el-form-item :label="t('dialog.orderGroupDlg.description')">
        <el-input :model-value="description" disabled />
      </el-form-item>
      <el-form-item :label="t('dialog.orderGroupDlg.removeFrom')">
        <el-input-number v-model="fromPos" :min="0" :max="maxIndex" />
      </el-form-item>
      <el-form-item :label="t('dialog.orderGroupDlg.newPosition')">
        <el-input-number v-model="toPos" :min="0" :max="maxIndex" />
      </el-form-item>
      <el-form-item :label="t('dialog.orderGroupDlg.numberOfObjects')">
        <el-input-number v-model="count" :min="1" :max="Math.max(1, maxIndex + 1)" />
      </el-form-item>
      <div class="order-actions">
        <el-button @click="handleReorder">
          {{ t('dialog.orderGroupDlg.reOrder') }}
        </el-button>
        <el-button @click="handleReverse">
          {{ t('dialog.orderGroupDlg.reverseOrder') }}
        </el-button>
        <el-button @click="handleHighlight">
          {{ t('dialog.orderGroupDlg.highlight') }}
        </el-button>
      </div>
    </el-form>
  </ml-base-dialog>
</template>

<script setup lang="ts">
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import type { AcDbGroup } from '@mlightcad/data-model'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import MlBaseDialog from '../common/MlBaseDialog.vue'

const props = defineProps<{
  group: AcDbGroup | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'changed'): void
}>()

const { t } = useI18n()
const dialogVisible = ref(true)
const fromPos = ref(0)
const toPos = ref(0)
const count = ref(1)

const groupName = computed(() => props.group?.name ?? '')
const description = computed(() => props.group?.description ?? '')
const maxIndex = computed(() =>
  Math.max(0, (props.group?.numEntities() ?? 1) - 1)
)

watch(
  () => props.group,
  () => {
    fromPos.value = 0
    toPos.value = 0
    count.value = 1
  },
  { immediate: true }
)

watch(dialogVisible, visible => {
  if (!visible) emit('close')
})

const resolveGroup = () => {
  const name = props.group?.name
  if (!name) return null
  return (
    AcApDocManager.instance.curDocument.database.objects.group.getAt(name) ??
    null
  )
}

const handleReorder = () => {
  const group = resolveGroup()
  if (!group) return
  group.transfer(fromPos.value, toPos.value, count.value)
  emit('changed')
}

const handleReverse = () => {
  const group = resolveGroup()
  if (!group) return
  group.reverse()
  emit('changed')
}

const handleHighlight = () => {
  const group = resolveGroup()
  if (!group) return
  const view = AcApDocManager.instance.curView
  const ids = [...group.entityIds]
  view.highlight(ids)
  window.setTimeout(() => view.unhighlight(ids), 800)
}

const handleOk = () => {
  dialogVisible.value = false
}
</script>

<style scoped>
.order-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
</style>
