<template>
  <div class="ml-color-picker-tabs">
    <el-tabs v-model="activeTab" :tab-position="tabPosition">
      <el-tab-pane :label="t('dialog.colorPickerDlg.aciTabTitle')" name="aci">
        <div class="ml-color-picker-tabs-panel-body">
          <MlColorIndexPicker
            :model-value="aciIndex"
            @update:modelValue="onAciChange"
          />
        </div>
      </el-tab-pane>
      <el-tab-pane :label="t('dialog.colorPickerDlg.rgbTabTitle')" name="rgb">
        <div class="ml-color-picker-tabs-panel-body">
          <ElColorPickerPanel v-model="hexColor" />
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import 'element-plus/es/components/color-picker-panel/style/css'

import { AcCmColor } from '@mlightcad/data-model'
import { ElTabPane, ElTabs } from 'element-plus'
import ElColorPickerPanel from 'element-plus/es/components/color-picker-panel/index'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import MlColorIndexPicker from './MlColorIndexPicker.vue'

type TabName = 'aci' | 'rgb'
type TabPosition = 'top' | 'right' | 'bottom' | 'left'

const props = withDefaults(
  defineProps<{
    modelValue?: AcCmColor
    tabPosition?: TabPosition
  }>(),
  {
    modelValue: undefined,
    tabPosition: 'top'
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: AcCmColor | undefined]
  change: [value: AcCmColor | undefined]
}>()

const { t } = useI18n()

const activeTab = ref<TabName>('aci')
const aciIndex = ref<number>(256)
const hexColor = ref('#ffffff')
const syncingFromProps = ref(false)

watch(
  () => props.modelValue,
  value => {
    syncingFromProps.value = true
    updateFromColor(value)
    syncingFromProps.value = false
  },
  { immediate: true }
)

watch(hexColor, nextHexRaw => {
  if (syncingFromProps.value || activeTab.value !== 'rgb') return
  const color = new AcCmColor()
  color.setRGBFromCss(nextHexRaw)
  emitColor(color)
})

function onAciChange(value: number | null) {
  const index = value ?? 256
  aciIndex.value = index
  activeTab.value = 'aci'
  const color = new AcCmColor()
  if (index === 256) color.setByLayer()
  else if (index === 0) color.setByBlock()
  else color.colorIndex = index
  emitColor(color)
}

function emitColor(color: AcCmColor | undefined) {
  emit('update:modelValue', color)
  emit('change', color)
}

function updateFromColor(color: AcCmColor | undefined) {
  if (!color) {
    activeTab.value = 'aci'
    aciIndex.value = 256
    return
  }

  activeTab.value = color.isByColor ? 'rgb' : 'aci'
  if (color.isByLayer) aciIndex.value = 256
  else if (color.isByBlock) aciIndex.value = 0
  else if (color.isByACI) aciIndex.value = color.colorIndex ?? 256
  else aciIndex.value = 256

  // Do not let ACI selection overwrite the true-color gamut.
  if (color.isByColor) {
    hexColor.value = color.cssColor ?? '#ffffff'
  }
}
</script>

<style scoped>
.ml-color-picker-tabs-panel-body {
  display: flex;
  flex-direction: column;
  margin-top: 12px;
}
</style>
