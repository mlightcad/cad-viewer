<template>
  <ml-base-dialog
    v-model:modelValue="visible"
    :title="t('dialog.ucsDetailsDlg.title')"
    :width="420"
    :z-index="2300"
    @ok="visible = false"
  >
    <div class="ml-ucs-details">
      <div class="ml-ucs-details__row">
        <span class="ml-ucs-details__label">{{
          t('dialog.ucsDetailsDlg.name')
        }}</span>
        <span>{{ name }}</span>
      </div>
      <div class="ml-ucs-details__row">
        <span class="ml-ucs-details__label">{{
          t('dialog.ucsDetailsDlg.origin')
        }}</span>
        <span>{{ formatPoint(origin) }}</span>
      </div>
      <div class="ml-ucs-details__row">
        <span class="ml-ucs-details__label">{{
          t('dialog.ucsDetailsDlg.xAxis')
        }}</span>
        <span>{{ formatPoint(xAxis) }}</span>
      </div>
      <div class="ml-ucs-details__row">
        <span class="ml-ucs-details__label">{{
          t('dialog.ucsDetailsDlg.yAxis')
        }}</span>
        <span>{{ formatPoint(yAxis) }}</span>
      </div>
      <div class="ml-ucs-details__row">
        <span class="ml-ucs-details__label">{{
          t('dialog.ucsDetailsDlg.zAxis')
        }}</span>
        <span>{{ formatPoint(zAxis) }}</span>
      </div>
      <el-form label-position="top" class="ml-ucs-details__form">
        <el-form-item :label="t('dialog.ucsDetailsDlg.relativeTo')">
          <el-select v-model="relativeTo" class="ml-ucs-details__select">
            <el-option
              v-for="opt in relativeOptions"
              :key="opt"
              :label="opt"
              :value="opt"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </div>
  </ml-base-dialog>
</template>

<script setup lang="ts">
import {
  type AcApUcsFrame,
  AcApUcsService,
  UCS_WORLD_NAME
} from '@mlightcad/cad-simple-viewer'
import { ElForm, ElFormItem, ElOption, ElSelect } from 'element-plus'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import MlBaseDialog from '../common/MlBaseDialog.vue'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  ucsName: string
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const relativeTo = ref(UCS_WORLD_NAME)
const relativeOptions = ref<string[]>([UCS_WORLD_NAME])
const frame = ref<AcApUcsFrame | null>(null)

const name = computed(() => props.ucsName)

const origin = computed(() => relativePoint(frame.value?.origin))
const xAxis = computed(() => relativeAxis(frame.value?.xAxis))
const yAxis = computed(() => relativeAxis(frame.value?.yAxis))
const zAxis = computed(() => {
  const f = frame.value
  if (!f) return { x: 0, y: 0, z: 1 }
  const x = f.xAxis
  const y = f.yAxis
  return relativeAxis({
    x: x.y * y.z - x.z * y.y,
    y: x.z * y.x - x.x * y.z,
    z: x.x * y.y - x.y * y.x
  })
})

watch(
  () => [props.modelValue, props.ucsName] as const,
  ([open]) => {
    if (!open) return
    reload()
  }
)

function reload() {
  const items = AcApUcsService.listUcsNames()
  relativeOptions.value = [
    UCS_WORLD_NAME,
    ...items.filter(i => i.kind === 'named').map(i => i.name)
  ]
  relativeTo.value = UCS_WORLD_NAME
  frame.value =
    AcApUcsService.getFrameByName(props.ucsName) ??
    AcApUcsService.getActiveFrame()
}

function baseFrame(): AcApUcsFrame {
  return (
    AcApUcsService.getFrameByName(relativeTo.value) ??
    AcApUcsService.getFrameByName(UCS_WORLD_NAME)!
  )
}

function relativePoint(point?: { x: number; y: number; z: number }) {
  if (!point) return { x: 0, y: 0, z: 0 }
  const u = AcApUcsService.wcsToUcs(point, baseFrame())
  return { x: u.x, y: u.y, z: u.z }
}

function relativeAxis(axis?: { x: number; y: number; z: number }) {
  if (!axis) return { x: 1, y: 0, z: 0 }
  const base = baseFrame()
  // Express axis direction in the Relative To frame (no translation).
  const tip = AcApUcsService.wcsToUcs(
    {
      x: base.origin.x + axis.x,
      y: base.origin.y + axis.y,
      z: base.origin.z + axis.z
    },
    base
  )
  const originU = AcApUcsService.wcsToUcs(base.origin, base)
  return {
    x: tip.x - originU.x,
    y: tip.y - originU.y,
    z: tip.z - originU.z
  }
}

function formatPoint(p: { x: number; y: number; z: number }) {
  return `${p.x.toFixed(4)}, ${p.y.toFixed(4)}, ${p.z.toFixed(4)}`
}
</script>

<style scoped>
.ml-ucs-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ml-ucs-details__row {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 8px;
  font-size: 13px;
}
.ml-ucs-details__label {
  color: var(--el-text-color-secondary);
}
.ml-ucs-details__select {
  width: 100%;
}
</style>
