<template>
  <div class="ml-color-dropdown">
    <el-select
      v-model="selectedKey"
      :disabled="props.disabled"
      popper-class="ml-color-dropdown-popper"
      class="ml-color-dropdown-select"
      style="width: 100%"
      @change="onChange"
    >
      <template #label>
        <div
          class="ml-color-dropdown-color-item ml-color-dropdown-color-item--selected"
        >
          <span
            v-if="props.leadingIcon"
            class="ml-color-dropdown-leading-icon"
            aria-hidden="true"
          >
            <component :is="props.leadingIcon" />
          </span>
          <span
            class="ml-color-dropdown-color-preview"
            :style="{ backgroundColor: selectedDisplayColor }"
          />
          <span class="ml-color-dropdown-color-name">
            {{ keyToDisplayName(selectedKey) || props.placeholder }}
          </span>
        </div>
      </template>

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
          />
          <span class="ml-color-dropdown-color-name">
            {{ item.i18nName }}
          </span>
        </div>
      </el-option>

      <el-option
        key="custom-trigger"
        :value="'custom-trigger'"
        :label="t('main.colorDropdown.custom')"
        :disabled="props.disabled"
      >
        <div class="ml-color-dropdown-color-item">
          <span class="ml-color-dropdown-custom-icon" aria-hidden="true" />
          <span class="ml-color-dropdown-color-name">
            {{ t('main.colorDropdown.custom') }}
          </span>
        </div>
      </el-option>
    </el-select>

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
import { type Component, computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { colorName } from '../../locale'
import { MlColorPickerDlg } from '../dialog'

defineOptions({
  inheritAttrs: false
})

const props = defineProps<{
  modelValue: AcCmColor | undefined
  disabled?: boolean
  displayColor?: string
  leadingIcon?: string | Component
  placeholder?: string
  onCustomColorSelected?: (
    oldColor: AcCmColor | undefined
  ) => AcCmColor | undefined | Promise<AcCmColor | undefined>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: AcCmColor | undefined): void
}>()

const { t } = useI18n()

const dlgVisible = ref<boolean>(false)
const selectedKey = ref<string>(colorToKey(props.modelValue))
const selectedColor = computed<string | undefined>(() =>
  props.modelValue?.toString()
)
const selectedDisplayColor = computed<string>(
  () => props.displayColor || keyToDisplayColor(selectedKey.value)
)

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

watch(
  () => props.modelValue?.toString(),
  () => {
    selectedKey.value = colorToKey(props.modelValue)
  }
)

async function onChange(key: string) {
  if (props.disabled) {
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

function handleDialogOk(c: AcCmColor) {
  if (props.disabled) return
  emit('update:modelValue', c)
  selectedKey.value = colorToKey(c)
}

function handleDialogCancel() {
  selectedKey.value = colorToKey(props.modelValue)
}

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
  if (key === 'bylayer') return '#7b8794'
  if (key === 'byblock') return '#a0a8b8'
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
  if (key.startsWith('rgb-')) return t('main.colorDropdown.custom')
  return ''
}
</script>

<style scoped>
.ml-color-dropdown {
  display: flex;
  width: 100%;
}

.ml-color-dropdown-select {
  width: 100%;
  min-width: 100%;
}

.ml-color-dropdown :deep(.el-select__wrapper),
.ml-color-dropdown :deep(.el-select__selection),
.ml-color-dropdown :deep(.el-select__selected-item),
.ml-color-dropdown :deep(.el-select__placeholder) {
  width: 100%;
  min-width: 0;
}

.ml-color-dropdown-color-item {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.ml-color-dropdown-color-item--selected {
  width: 100%;
}

.ml-color-dropdown-leading-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  color: var(--el-text-color-secondary);
}

.ml-color-dropdown-color-preview {
  width: 14px;
  height: 14px;
  border: 1px solid #aaa;
  border-radius: 2px;
  flex: 0 0 14px;
}

.ml-color-dropdown-custom-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border: 1px dashed var(--el-border-color);
  border-radius: 2px;
  font-size: 12px;
  line-height: 1;
}

.ml-color-dropdown-custom-icon::before {
  content: '+';
}

.ml-color-dropdown-color-name {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.ml-color-dropdown-popper .el-select-dropdown__wrap) {
  max-height: none;
  overflow-y: visible;
}

:global(.ml-color-dropdown-popper .el-scrollbar__bar.is-vertical) {
  display: none;
}
</style>
