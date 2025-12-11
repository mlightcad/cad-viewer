<template>
  <ml-base-dialog
    v-model:modelValue="visible"
    :title="title"
    :width="500"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <!-- ===================== Tabs ===================== -->
    <el-tabs v-model="activeTab">
      <!-- ACI Picker Tab -->
      <el-tab-pane :label="t('dialog.colorPickerDlg.aciTabTitle')" name="aci">
        <div class="ml-color-picker-dlg-panel-body">
          <ml-color-index-picker v-model="aciIndex" />
        </div>
      </el-tab-pane>

      <!-- Color Picker Tab -->
      <el-tab-pane :label="t('dialog.colorPickerDlg.rgbTabTitle')" name="rgb">
        <div class="ml-color-picker-dlg-panel-body">
          <el-color-picker-panel v-model="hexColor" />
        </div>
      </el-tab-pane>
    </el-tabs>
  </ml-base-dialog>
</template>

<script setup lang="ts">
import { AcCmColor } from '@mlightcad/data-model'
import ElColorPickerPanel from 'element-plus/es/components/color-picker-panel/index'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { MlBaseDialog, MlColorIndexPicker } from '../common'

const { t } = useI18n()

/**
 * Define Tab name to gurantee type-safe for tab names
 */
type TabName = 'aci' | 'rgb'

/**
 * Props
 */
const props = defineProps<{
  modelValue: boolean
  color?: string
  title: string
}>()

/**
 * Emits
 */
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'ok', v: AcCmColor): void
  (e: 'cancel', v: undefined): void
}>()

/**
 * Dialog visibility
 */
const visible = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

/**
 * Tabs, ACI index, and hex color
 */
const activeTab = ref<TabName>('aci')
const aciIndex = ref<number | undefined>(undefined)
const hexColor = ref('#ffffff')

/**
 * Helper: update internal state from props.color
 */
function updateFromColor(colorString: string | undefined) {
  if (!colorString) return

  const color = AcCmColor.fromString(colorString)
  if (!color) return

  // Set active tab
  activeTab.value = color.isByColor ? 'rgb' : 'aci'

  // Set ACI index
  if (color.isByLayer) aciIndex.value = 256
  else if (color.isByBlock) aciIndex.value = 0
  else if (color.isByACI) aciIndex.value = color.colorIndex
  else aciIndex.value = undefined

  // Set hex color
  hexColor.value = color.cssColor ?? '#ffffff'
}

// Initialize on first load
updateFromColor(props.color)

// Watch for changes to color
watch(
  () => props.color,
  newColor => {
    updateFromColor(newColor)
  }
)

/**
 * Confirm
 */
function handleOk() {
  const col = new AcCmColor()

  // Priority: if ACI selected, use ACI
  if (activeTab.value === 'aci') {
    if (aciIndex.value === 256) col.setByLayer()
    else if (aciIndex.value === 0) col.setByBlock()
    else col.colorIndex = aciIndex.value
  } else if (activeTab.value === 'rgb') {
    // Otherwise use hexColor
    const hex = hexColor.value.replace(/^#/, '')
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16)
      const g = parseInt(hex.substring(2, 4), 16)
      const b = parseInt(hex.substring(4, 6), 16)
      col.setRGB(r, g, b)
    }
  }

  emit('ok', col)
}

/**
 * Cancel
 */
function handleCancel() {
  emit('cancel', undefined)
}
</script>

<style scoped>
.ml-color-picker-dlg-panel-body {
  display: flex;
  flex-direction: column;
  margin-top: 12px;
}
</style>
