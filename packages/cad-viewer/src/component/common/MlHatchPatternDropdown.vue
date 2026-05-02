<template>
  <div class="ml-hatch-pattern-dropdown">
    <ElPopover
      v-model:visible="isOpen"
      trigger="click"
      placement="bottom-start"
      popper-class="ml-hatch-pattern-dropdown-popper"
      :disabled="disabled"
      :offset="6"
      :show-arrow="false"
      persistent
    >
      <template #reference>
        <MlRibbonButton
          :id="buttonId"
          class="ml-hatch-pattern-dropdown__button"
          :label="currentLabel"
          :disabled="disabled"
          :aria-label="accessibleLabel"
        >
          <template #icon>
            <span
              class="ml-hatch-pattern-dropdown__swatch"
              :style="selectedSwatchStyle"
              aria-hidden="true"
            />
          </template>
        </MlRibbonButton>
      </template>

      <MlHatchPatternPanel
        :model-value="normalizedModelValue"
        :options="resolvedOptions"
        :disabled="disabled"
        @select="handlePatternSelect"
      />
    </ElPopover>
  </div>
</template>

<script setup lang="ts">
import { MlRibbonButton } from '@mlightcad/ribbon'
import { ElPopover } from 'element-plus'
import { computed, ref, watch } from 'vue'

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
  /** Optional stable id applied to the ribbon button. */
  id?: string
  /** Current hatch pattern name. */
  modelValue?: string
  /** Candidate hatch patterns available in the picker panel. */
  options?: HatchPatternOption[]
  /** Optional value prefix applied before callback emission. */
  itemIdPrefix?: string
  /** Disables both trigger button and panel interactions. */
  disabled?: boolean
  /** Optional callback when the selected value changes. */
  emitItemClick?: (payload?: string | number | boolean) => void
}

const props = withDefaults(defineProps<HatchPatternDropdownProps>(), {
  id: 'hatch-pattern',
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

const normalizedModelValue = computed(() =>
  props.modelValue.trim().toUpperCase()
)

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

const buttonId = computed(() => props.id.trim() || 'hatch-pattern')
const accessibleLabel = computed(() => currentLabel.value || buttonId.value)

watch(
  () => props.disabled,
  value => {
    if (value) isOpen.value = false
  }
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
 * Handles panel item selection and closes the dropdown popper.
 *
 * @param patternName Hatch pattern selected in the panel.
 */
function handlePatternSelect(patternName: string) {
  if (props.disabled) return
  emitSelection(patternName)
  isOpen.value = false
}
</script>

<style scoped>
.ml-hatch-pattern-dropdown {
  --ml-hatch-pattern-scale: var(--ml-rb-scale, 1);
  display: inline-flex;
  width: 100%;
  min-width: 152px;
}

.ml-hatch-pattern-dropdown :deep(.el-popover__reference-wrapper) {
  display: inline-flex;
  width: 100%;
}

.ml-hatch-pattern-dropdown__button {
  width: 100%;
  min-width: 0;
}

.ml-hatch-pattern-dropdown__swatch {
  display: inline-block;
  width: calc(18px * var(--ml-hatch-pattern-scale));
  height: calc(18px * var(--ml-hatch-pattern-scale));
  box-sizing: border-box;
  border: 1px solid var(--ml-rb-border-strong, #404a59);
  flex: 0 0 calc(18px * var(--ml-hatch-pattern-scale));
}

:global(.ml-hatch-pattern-dropdown-popper) {
  padding: 0;
}

:global(.ml-hatch-pattern-dropdown-popper .el-popper__arrow) {
  display: none;
}
</style>
