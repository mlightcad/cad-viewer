<template>
  <div class="ml-linetype-select">
    <el-select
      :model-value="resolvedModelValue"
      :disabled="props.disabled || !resolvedOptions.length"
      :placeholder="props.placeholder"
      class="ml-linetype-select__control"
      style="width: 100%"
      @change="onSelect"
    >
      <template #label>
        <div
          v-if="selectedOption"
          class="ml-linetype-item ml-linetype-item--selected"
        >
          <span
            v-if="props.leadingIcon"
            class="ml-linetype-leading-icon"
            aria-hidden="true"
          >
            <component :is="props.leadingIcon" />
          </span>
          <span
            class="ml-linetype-preview"
            :class="{ 'ml-linetype-preview--svg': !!selectedPreviewSvg }"
            :style="{ '--ml-linetype-bg': selectedPreviewBackground }"
          >
            <span
              class="ml-linetype-preview-svg"
              aria-hidden="true"
              v-html="selectedPreviewSvg ?? ''"
            />
          </span>
          <span class="ml-linetype-text">{{ currentLabel }}</span>
        </div>
      </template>

      <el-option
        v-for="item in resolvedOptions"
        :key="item.value"
        :label="item.label"
        :value="item.value"
      >
        <div class="ml-linetype-item">
          <span
            class="ml-linetype-preview"
            :class="{ 'ml-linetype-preview--svg': !!item.previewSvgString }"
            :style="{ '--ml-linetype-bg': resolveLineTypeBackground(item) }"
          >
            <span
              class="ml-linetype-preview-svg"
              aria-hidden="true"
              v-html="item.previewSvgString ?? ''"
            />
          </span>
          <span class="ml-linetype-text">{{ item.label }}</span>
        </div>
      </el-option>
    </el-select>
  </div>
</template>

<script setup lang="ts">
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import {
  type Component,
  computed,
  onMounted,
  onUnmounted,
  shallowRef
} from 'vue'

import {
  buildLineTypeOptions,
  type LineTypeOption,
  resolveLineTypeBackground,
  resolveLineTypePreviewSvg
} from './lineTypeOptions'

defineOptions({
  inheritAttrs: false
})

/**
 * Props accepted by the line type select component.
 */
interface LineTypeSelectProps {
  /** Currently selected line type name. */
  modelValue?: string
  /** Optional caller-provided options. Falls back to the active drawing database. */
  options?: LineTypeOption[]
  /** Disables interaction when the owning command context is read-only. */
  disabled?: boolean
  /** Optional leading icon rendered inside the selected-value slot. */
  leadingIcon?: string | Component
  /** Placeholder shown when no option can be resolved. */
  placeholder?: string
}

const props = defineProps<LineTypeSelectProps>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}>()

const activeDatabase = shallowRef(
  AcApDocManager.instance?.curDocument?.database
)

const resolvedOptions = computed(() =>
  (props.options ?? buildLineTypeOptions(activeDatabase.value)).map(item => ({
    ...item,
    previewSvgString: resolveLineTypePreviewSvg(item)
  }))
)
const selectedOption = computed(() =>
  resolvedOptions.value.find(item => item.value === props.modelValue)
)
const currentLabel = computed(
  () => selectedOption.value?.label ?? props.placeholder ?? ''
)
const selectedPreviewBackground = computed(() =>
  resolveLineTypeBackground(selectedOption.value)
)
const selectedPreviewSvg = computed(() =>
  resolveLineTypePreviewSvg(selectedOption.value)
)
const resolvedModelValue = computed(() => selectedOption.value?.value)

/**
 * Refreshes the database-backed option list after the active document changes.
 */
function handleDocumentActivated() {
  activeDatabase.value = AcApDocManager.instance?.curDocument?.database
}

/**
 * Emits the newly selected line type to both `v-model` and change listeners.
 *
 * @param value Line type name chosen in the dropdown.
 */
function onSelect(value: string) {
  emit('update:modelValue', value)
  emit('change', value)
}

onMounted(() => {
  AcApDocManager.instance?.events.documentActivated.addEventListener(
    handleDocumentActivated
  )
  handleDocumentActivated()
})

onUnmounted(() => {
  AcApDocManager.instance?.events.documentActivated.removeEventListener(
    handleDocumentActivated
  )
})
</script>

<style scoped>
.ml-linetype-select {
  display: flex;
  width: 100%;
  min-width: 0;
}

.ml-linetype-leading-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  color: var(--el-text-color-secondary);
}

.ml-linetype-select__control {
  width: 100%;
  min-width: 0;
}

.ml-linetype-select :deep(.el-select__wrapper),
.ml-linetype-select :deep(.el-select__selection),
.ml-linetype-select :deep(.el-select__selected-item),
.ml-linetype-select :deep(.el-select__placeholder) {
  width: 100%;
  min-width: 0;
}

.ml-linetype-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.ml-linetype-item--selected {
  width: 100%;
}

.ml-linetype-preview {
  position: relative;
  width: 52px;
  height: 14px;
  flex: 0 0 52px;
}

.ml-linetype-preview::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 2px;
  transform: translateY(-50%);
  background: var(--ml-linetype-bg);
}

.ml-linetype-preview--svg::before {
  content: none;
}

.ml-linetype-preview-svg {
  display: block;
  width: 100%;
  height: 100%;
}

.ml-linetype-preview-svg :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}

.ml-linetype-text {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
