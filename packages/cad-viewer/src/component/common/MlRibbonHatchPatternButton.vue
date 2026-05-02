<template>
  <div class="ml-ribbon-hatch-pattern-large-dropdown">
    <el-dropdown
      ref="dropdownRef"
      v-model:visible="isOpen"
      trigger="click"
      placement="bottom-start"
      popper-class="ml-hatch-pattern-dropdown-popper"
      :disabled="disabled"
    >
      <el-button class="ml-ribbon-hatch-pattern-large-dropdown__button" :disabled="disabled">
        <span
          class="ml-ribbon-hatch-pattern-large-dropdown__swatch"
          :style="selectedSwatchStyle"
          aria-hidden="true"
        />
        <span class="ml-ribbon-hatch-pattern-large-dropdown__label">{{ buttonLabel }}</span>
        <el-icon class="ml-ribbon-hatch-pattern-large-dropdown__caret" aria-hidden="true">
          <arrow-down />
        </el-icon>
      </el-button>

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
 * Props accepted by the ribbon large hatch pattern dropdown button.
 */
interface RibbonHatchPatternLargeDropdownProps {
  /** Full ribbon item model injected by the ribbon host for custom items. */
  item?: { label?: string } | null
  /** Current hatch pattern name stored in ribbon state. */
  modelValue?: string
  /** Candidate hatch patterns available in the picker panel. */
  options?: HatchPatternOption[]
  /** Optional item id prefix emitted back to the ribbon host. */
  itemIdPrefix?: string
  /** Optional label shown below the swatch icon. */
  label?: string
  /** Disables trigger button and panel interactions. */
  disabled?: boolean
  /** Callback injected by `@mlightcad/ribbon` custom item bindings. */
  emitItemClick?: (payload?: string | number | boolean) => void
}

const props = withDefaults(defineProps<RibbonHatchPatternLargeDropdownProps>(), {
  item: null,
  modelValue: 'ANSI31',
  options: () => DEFAULT_HATCH_PATTERN_OPTIONS,
  itemIdPrefix: 'hatch-pattern:',
  label: undefined,
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

const selectedSwatchStyle = computed(() =>
  resolveHatchPatternSwatchStyle(normalizedModelValue.value)
)

const buttonLabel = computed(
  () => props.label ?? props.item?.label ?? normalizedModelValue.value
)

/**
 * Emits a ribbon item-click payload for the selected hatch pattern.
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
  dropdownRef.value?.handleClose?.()
}
</script>

<style scoped>
.ml-ribbon-hatch-pattern-large-dropdown {
  display: inline-flex;
  align-self: stretch;
  min-width: 62px;
  height: 100%;
}

.ml-ribbon-hatch-pattern-large-dropdown :deep(.el-dropdown) {
  display: inline-flex;
  align-self: stretch;
  width: 100%;
  height: 100%;
}

.ml-ribbon-hatch-pattern-large-dropdown__button {
  min-width: 68px;
  width: 68px;
  height: 100%;
  min-height: 0;
  padding: 8px 6px;
}

.ml-ribbon-hatch-pattern-large-dropdown__button :deep(> span) {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
}

.ml-ribbon-hatch-pattern-large-dropdown__swatch {
  width: 30px;
  height: 30px;
  border: 1px solid #404a59;
  box-sizing: border-box;
}

.ml-ribbon-hatch-pattern-large-dropdown__label {
  font-size: 11px;
  line-height: 1.15;
  text-align: center;
  max-width: 100%;
  white-space: normal;
  overflow-wrap: anywhere;
}

.ml-ribbon-hatch-pattern-large-dropdown__caret {
  font-size: 10px;
  line-height: 1;
  opacity: 0.85;
}

:global(.ml-hatch-pattern-dropdown-popper) {
  padding: 0;
}
</style>
