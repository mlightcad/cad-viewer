<template>
  <div
    class="ml-hatch-pattern-panel"
    role="listbox"
    :aria-label="panelAriaLabel"
  >
    <button
      v-for="option in normalizedOptions"
      :key="option.value"
      type="button"
      class="ml-hatch-pattern-panel__item"
      :class="{ 'is-active': option.value === normalizedModelValue }"
      :disabled="disabled"
      role="option"
      :aria-selected="option.value === normalizedModelValue"
      @click="handleSelect(option.value)"
    >
      <span
        class="ml-hatch-pattern-panel__swatch"
        :style="resolveHatchPatternSwatchStyle(option.value)"
        aria-hidden="true"
      />
      <span class="ml-hatch-pattern-panel__label">{{ option.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import {
  DEFAULT_HATCH_PATTERN_OPTIONS,
  type HatchPatternOption,
  resolveHatchPatternSwatchStyle
} from './hatchPatternPreview'

/**
 * Props accepted by the hatch pattern panel.
 */
interface HatchPatternPanelProps {
  /** Currently selected hatch pattern name. */
  modelValue?: string
  /** Patterns displayed inside the grid panel. */
  options?: HatchPatternOption[]
  /** Disables selection interactions. */
  disabled?: boolean
  /** Accessibility label announced for the picker listbox. */
  ariaLabel?: string
}

const props = withDefaults(defineProps<HatchPatternPanelProps>(), {
  modelValue: '',
  options: () => DEFAULT_HATCH_PATTERN_OPTIONS,
  disabled: false,
  ariaLabel: 'Hatch pattern list'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'select', value: string): void
}>()

const normalizedModelValue = computed(() =>
  props.modelValue.trim().toUpperCase()
)

const normalizedOptions = computed<HatchPatternOption[]>(() =>
  props.options.map(item => ({
    value: item.value,
    label: item.label ?? item.value
  }))
)

const panelAriaLabel = computed(() => props.ariaLabel)

/**
 * Emits both model and select events when a hatch pattern is chosen.
 *
 * @param value Hatch pattern name selected in the panel.
 */
function handleSelect(value: string) {
  if (props.disabled) return
  emit('update:modelValue', value)
  emit('select', value)
}
</script>

<style scoped>
.ml-hatch-pattern-panel {
  width: 320px;
  max-height: 360px;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 10px;
  border: 1px solid var(--ml-rb-border, var(--el-border-color));
  border-radius: 2px;
  background: var(--ml-rb-panel-bg, var(--el-fill-color-lighter));

  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.ml-hatch-pattern-panel__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-height: 98px;
  padding: 8px 4px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--ml-rb-tab-text, var(--el-text-color-primary));
  cursor: pointer;
}

.ml-hatch-pattern-panel__item:hover {
  background: var(--ml-rb-hover-bg, var(--el-fill-color));
}

.ml-hatch-pattern-panel__item.is-active {
  border-color: var(--ml-rb-active-border, var(--el-border-color-darker));
  background: var(--ml-rb-active-bg, var(--el-fill-color-dark));
}

.ml-hatch-pattern-panel__item:focus-visible {
  outline: 1px solid var(--ml-rb-active, var(--el-color-primary));
  outline-offset: 1px;
}

.ml-hatch-pattern-panel__item:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ml-hatch-pattern-panel__swatch {
  width: 52px;
  height: 52px;
  box-sizing: border-box;
  border: 1px solid var(--ml-rb-border-strong, var(--el-border-color-dark));
  background-color: #f6f8fb;
}

.ml-hatch-pattern-panel__label {
  font-size: 11px;
  line-height: 1.2;
  text-align: center;
  letter-spacing: 0.2px;
}

@media (max-width: 768px) {
  .ml-hatch-pattern-panel {
    width: 286px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
