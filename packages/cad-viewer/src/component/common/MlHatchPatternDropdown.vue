<template>
  <div class="ml-hatch-pattern-dropdown">
    <el-dropdown
      ref="dropdownRef"
      v-model:visible="isOpen"
      trigger="click"
      placement="bottom-start"
      popper-class="ml-hatch-pattern-dropdown-popper"
      :disabled="disabled"
    >
      <div
        class="ml-hatch-pattern-dropdown__trigger"
        :class="{ 'is-disabled': disabled }"
      >
        <button
          type="button"
          class="ml-hatch-pattern-dropdown__main-button"
          :disabled="disabled"
          @click.stop="handleMainButtonClick"
        >
          <span class="ml-hatch-pattern-dropdown__value">
            <span
              class="ml-hatch-pattern-dropdown__swatch"
              :style="selectedSwatchStyle"
              aria-hidden="true"
            />
            <span class="ml-hatch-pattern-dropdown__label">{{ currentLabel }}</span>
          </span>
        </button>
        <button
          type="button"
          class="ml-hatch-pattern-dropdown__caret-button"
          :disabled="disabled"
          aria-label="Open hatch pattern list"
        >
          <el-icon>
            <arrow-down />
          </el-icon>
        </button>
      </div>

      <template #dropdown>
        <ml-hatch-pattern-panel
          :model-value="normalizedModelValue"
          :options="resolvedOptions"
          :disabled="disabled"
          @select="handlePatternSelect"
        />
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
import { computed, ref } from 'vue'

import {
  DEFAULT_HATCH_PATTERN_OPTIONS,
  type HatchPatternOption,
  resolveHatchPatternSwatchStyle
} from './hatchPatternPreview'
import MlHatchPatternPanel from './MlHatchPatternPanel.vue'

/**
 * Props accepted by the hatch pattern dropdown button.
 */
interface HatchPatternDropdownProps {
  /** Current hatch pattern name. */
  modelValue?: string
  /** Candidate hatch patterns available in the picker panel. */
  options?: HatchPatternOption[]
  /** Optional value prefix applied before callback emission. */
  itemIdPrefix?: string
  /** Disables both trigger buttons and panel interactions. */
  disabled?: boolean
  /** Optional callback when the selected value changes. */
  emitItemClick?: (payload?: string | number | boolean) => void
}

const props = withDefaults(defineProps<HatchPatternDropdownProps>(), {
  modelValue: 'ANSI31',
  options: () => DEFAULT_HATCH_PATTERN_OPTIONS,
  itemIdPrefix: 'hatch-pattern:',
  disabled: false,
  emitItemClick: undefined
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'select', value: string): void
}>()

const isOpen = ref(false)
const dropdownRef = ref<{ handleClose?: () => void } | null>(null)

const normalizedModelValue = computed(() => props.modelValue.trim().toUpperCase())

const resolvedOptions = computed<HatchPatternOption[]>(() =>
  props.options.map(item => ({
    value: item.value.trim().toUpperCase(),
    label: item.label ?? item.value.trim().toUpperCase()
  }))
)

const selectedOption = computed(() =>
  resolvedOptions.value.find(item => item.value === normalizedModelValue.value)
)

const currentLabel = computed(
  () => selectedOption.value?.label ?? normalizedModelValue.value
)

const selectedSwatchStyle = computed(() =>
  resolveHatchPatternSwatchStyle(normalizedModelValue.value)
)

/**
 * Emits change payload for the selected hatch pattern.
 *
 * @param patternName Hatch pattern chosen by the user.
 */
function emitSelection(patternName: string) {
  const normalized = patternName.trim().toUpperCase()
  emit('update:modelValue', normalized)
  emit('select', normalized)
  props.emitItemClick?.(`${props.itemIdPrefix}${normalized}`)
}

/**
 * Re-applies the current pattern when the primary split-button area is clicked.
 */
function handleMainButtonClick() {
  if (props.disabled) return
  emitSelection(normalizedModelValue.value)
}

/**
 * Handles panel item selection and closes the dropdown popper.
 *
 * @param patternName Hatch pattern selected in the panel.
 */
function handlePatternSelect(patternName: string) {
  if (props.disabled) return
  emitSelection(patternName)
  isOpen.value = false
  dropdownRef.value?.handleClose?.()
}
</script>

<style scoped>
.ml-hatch-pattern-dropdown {
  display: flex;
  width: 100%;
  min-width: 152px;
  min-height: var(--el-component-size-small, 28px);
}

.ml-hatch-pattern-dropdown :deep(.el-dropdown) {
  width: 100%;
}

.ml-hatch-pattern-dropdown__trigger {
  display: flex;
  width: 100%;
  min-height: var(--el-component-size-small, 28px);
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  background: var(--el-fill-color-blank);
  overflow: hidden;
}

.ml-hatch-pattern-dropdown__trigger:hover {
  border-color: var(--el-border-color-hover);
}

.ml-hatch-pattern-dropdown__trigger.is-disabled {
  border-color: var(--el-border-color-light);
  background: var(--el-fill-color-light);
}

.ml-hatch-pattern-dropdown__main-button,
.ml-hatch-pattern-dropdown__caret-button {
  border: none;
  background: transparent;
  color: var(--el-text-color-regular);
  min-height: var(--el-component-size-small, 28px);
  cursor: pointer;
}

.ml-hatch-pattern-dropdown__main-button {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  flex: 1 1 auto;
  width: 100%;
  padding: 0 6px;
  min-width: 0;
}

.ml-hatch-pattern-dropdown__caret-button {
  flex: 0 0 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-left: 1px solid var(--el-border-color-light);
  font-size: 12px;
}

.ml-hatch-pattern-dropdown__main-button:hover,
.ml-hatch-pattern-dropdown__caret-button:hover {
  background: var(--el-fill-color);
}

.ml-hatch-pattern-dropdown__main-button:disabled,
.ml-hatch-pattern-dropdown__caret-button:disabled {
  color: var(--el-disabled-text-color);
  cursor: not-allowed;
}

.ml-hatch-pattern-dropdown__value {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  width: 100%;
}

.ml-hatch-pattern-dropdown__swatch {
  width: 18px;
  height: 18px;
  box-sizing: border-box;
  border: 1px solid #404a59;
  flex: 0 0 18px;
}

.ml-hatch-pattern-dropdown__label {
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:global(.ml-hatch-pattern-dropdown-popper) {
  padding: 0;
}
</style>
