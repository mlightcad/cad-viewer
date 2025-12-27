<template>
  <div>
    <el-select
      v-model="selectedKey"
      @change="onChange"
      :disabled="props.disabled"
    >
      <!-- SELECTED VALUE -->
      <template #label>
        <div class="ml-color-dropdown-color-item">
          <span
            class="ml-color-dropdown-color-preview"
            :style="{ backgroundColor: selectedDisplayColor }"
          ></span>
          <span class="ml-color-dropdown-color-name">
            {{ keyToDisplayName(selectedKey) }}
          </span>
        </div>
      </template>

      <!-- DEFAULT ITEMS -->
      <el-option
        v-for="item in mergedColorItems"
        :key="item.key"
        :label="item.i18nName"
        :value="item.key"
      >
        <div class="ml-color-dropdown-color-item">
          <span
            class="ml-color-dropdown-color-preview"
            :style="{ backgroundColor: keyToDisplayColor(item.key) }"
          ></span>
          <span class="ml-color-dropdown-color-name">
            {{ item.i18nName }}
          </span>
        </div>
      </el-option>

      <!-- CUSTOM COLOR TRIGGER -->
      <el-option
        key="custom-trigger"
        :value="'custom-trigger'"
        :label="t('main.colorDropdown.custom')"
        :disabled="props.disabled"
      >
        <div class="ml-color-dropdown-color-item">
          <span class="ml-color-dropdown-custom-icon">🎨</span>
          <span class="ml-color-dropdown-color-name">
            {{ t('main.colorDropdown.custom') }}
          </span>
        </div>
      </el-option>
    </el-select>

    <!-- COLOR PICKER DIALOG -->
    <ml-color-picker-dlg
      v-model="dlgVisible"
      :title="t('dialog.colorPickerDlg.title')"
      :color="selectedColor"
      @ok="handleDialogOk"
      @cancel="handleDialogCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { AcCmColor, AcCmColorMethod } from '@mlightcad/data-model'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { colorName } from '../../locale'
import { MlColorPickerDlg } from '../dialog'

const props = defineProps<{
  modelValue: AcCmColor | undefined
  disabled?: boolean
  onCustomColorSelected?: (
    oldColor: AcCmColor | undefined
  ) => AcCmColor | undefined | Promise<AcCmColor | undefined>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: AcCmColor | undefined): void
}>()

const { t } = useI18n()

// -------------------------------
// State
// -------------------------------
const dlgVisible = ref<boolean>(false)
const selectedKey = ref<string>(colorToKey(props.modelValue))
const selectedColor = computed<string | undefined>(() =>
  props.modelValue?.toString()
)
const selectedDisplayColor = computed<string>(() =>
  keyToDisplayColor(selectedKey.value)
)

// -------------------------------
// Default color items
// -------------------------------
const defaultItems = [
  { key: 'bylayer', name: 'ByLayer' },
  { key: 'byblock', name: 'ByBlock' },
  { key: 'aci-1', name: 'Red' },
  { key: 'aci-2', name: 'Yellow' },
  { key: 'aci-3', name: 'Green' },
  { key: 'aci-4', name: 'Cyan' },
  { key: 'aci-5', name: 'Blue' },
  { key: 'aci-6', name: 'Magenta' }
]

const mergedColorItems = computed(() =>
  defaultItems.map(i => ({
    ...i,
    i18nName: colorName(i.name)
  }))
)

// -------------------------------
// Handle selection
// -------------------------------
async function onChange(key: string) {
  if (props.disabled) {
    // restore state
    selectedKey.value = colorToKey(props.modelValue)
    return
  }

  if (key === 'custom-trigger') {
    if (props.onCustomColorSelected) {
      const res = await props.onCustomColorSelected(props.modelValue)
      if (res) {
        emit('update:modelValue', res)
        selectedKey.value = colorToKey(res)
      } else {
        selectedKey.value = colorToKey(props.modelValue)
      }
      return
    }

    dlgVisible.value = true
    return
  }

  const c = keyToColor(key)
  emit('update:modelValue', c)
}

// -------------------------------
// Dialog callbacks
// -------------------------------
function handleDialogOk(c: AcCmColor) {
  if (props.disabled) return
  emit('update:modelValue', c)
  selectedKey.value = colorToKey(c)
}

function handleDialogCancel() {
  selectedKey.value = colorToKey(props.modelValue)
}

// -------------------------------
// Utils
// -------------------------------
function colorToKey(c?: AcCmColor): string {
  if (!c) return ''
  if (c.isByLayer) return 'bylayer'
  if (c.isByBlock) return 'byblock'
  if (c.isByACI) return `aci-${c.colorIndex}`
  if (c.isByColor) return `rgb-${c.red}-${c.green}-${c.blue}`
  return ''
}

function keyToColor(key: string): AcCmColor {
  const c = new AcCmColor()
  if (key === 'bylayer') c.setByLayer()
  else if (key === 'byblock') c.setByBlock()
  else if (key.startsWith('aci-')) c.colorIndex = Number(key.substring(4))
  else if (key.startsWith('rgb-')) {
    const [_, r, g, b] = key.split('-')
    c.setRGB(Number(r), Number(g), Number(b))
  }
  return c
}

function keyToDisplayColor(key: string) {
  if (!key) return ''
  if (key.startsWith('aci-')) {
    const cm = new AcCmColor(AcCmColorMethod.ByACI, Number(key.substring(4)))
    return cm.cssColor ?? ''
  }
  if (key.startsWith('rgb-')) {
    const [_, r, g, b] = key.split('-')
    return `rgb(${r}, ${g}, ${b})`
  }
  return '#FFFFFF'
}

function keyToDisplayName(key: string) {
  const found = mergedColorItems.value.find(i => i.key === key)
  if (found) return found.i18nName
  if (key.startsWith('rgb-')) return t('main.colors.CustomColor')
  return ''
}
</script>

<style scoped>
.ml-color-dropdown-color-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ml-color-dropdown-color-preview {
  width: 14px;
  height: 14px;
  border: 1px solid #aaa;
}
.ml-color-dropdown-custom-icon {
  font-size: 16px;
}
.ml-color-dropdown-color-name {
  font-size: 13px;
}
</style>
