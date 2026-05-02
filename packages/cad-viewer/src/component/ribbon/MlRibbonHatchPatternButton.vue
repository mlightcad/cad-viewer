<template>
  <div class="ml-ribbon-hatch-pattern-large-dropdown">
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
          class="ml-ribbon-hatch-pattern-large-dropdown__button"
          :label="buttonLabel"
          :disabled="disabled"
          :aria-label="buttonLabel"
        >
          <template #icon>
            <span
              class="ml-ribbon-hatch-pattern-large-dropdown__swatch"
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
import { computed, ref } from 'vue'

import {
  DEFAULT_HATCH_PATTERN_OPTIONS,
  type HatchPatternOption,
  resolveHatchPatternSwatchStyle
} from '../common/hatchPatternPreview'
import MlHatchPatternPanel from '../common/MlHatchPatternPanel.vue'

/**
 * Props accepted by the ribbon large hatch pattern dropdown button.
 */
interface RibbonHatchPatternLargeDropdownProps {
  /** Full ribbon item model injected by the ribbon host for custom items. */
  item?: { id?: string; label?: string } | null
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

const props = withDefaults(
  defineProps<RibbonHatchPatternLargeDropdownProps>(),
  {
    item: null,
    modelValue: 'ANSI31',
    options: () => DEFAULT_HATCH_PATTERN_OPTIONS,
    itemIdPrefix: 'hatch-pattern:',
    label: undefined,
    disabled: false,
    emitItemClick: undefined
  }
)

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

const selectedSwatchStyle = computed(() =>
  resolveHatchPatternSwatchStyle(normalizedModelValue.value)
)

const buttonLabel = computed(
  () => props.label ?? props.item?.label ?? normalizedModelValue.value
)

const buttonId = computed(() => props.item?.id?.trim() || 'hatch-pattern')

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
}
</script>

<style scoped>
.ml-ribbon-hatch-pattern-large-dropdown {
  --ml-ribbon-hatch-pattern-scale: var(--ml-rb-scale, 1);
  display: inline-flex;
  align-self: stretch;
  height: 100%;
}

.ml-ribbon-hatch-pattern-large-dropdown :deep(.el-popover__reference-wrapper) {
  display: inline-flex;
  align-self: stretch;
  width: 100%;
  height: 100%;
}

.ml-ribbon-hatch-pattern-large-dropdown__swatch {
  display: inline-block;
  width: calc(30px * var(--ml-ribbon-hatch-pattern-scale));
  height: calc(30px * var(--ml-ribbon-hatch-pattern-scale));
  border: 1px solid var(--ml-rb-border-strong, #404a59);
  box-sizing: border-box;
}

:global(.ml-hatch-pattern-dropdown-popper) {
  padding: 0;
}

:global(.ml-hatch-pattern-dropdown-popper .el-popper__arrow) {
  display: none;
}
</style>
