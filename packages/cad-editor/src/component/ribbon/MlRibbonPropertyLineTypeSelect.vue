<template>
  <ml-ribbon-property-field
    :icon="lineStyleIcon"
    :disabled="disabled"
    variant="line-type"
  >
    <ml-line-type-select
      :model-value="modelValue"
      :options="options"
      :disabled="disabled"
      :placeholder="placeholder"
      @update:modelValue="emit('update:modelValue', $event)"
    />
  </ml-ribbon-property-field>
</template>

<script setup lang="ts">
import { lineStyle as lineStyleIcon } from '../../svg'
import { type LineTypeOption } from '../common/lineTypeOptions'
import MlLineTypeSelect from '../common/MlLineTypeSelect.vue'
import MlRibbonPropertyField from './MlRibbonPropertyField.vue'

/**
 * Props accepted by the ribbon line type property field.
 */
interface RibbonPropertyLineTypeSelectProps {
  /** Active `CELTYPE` value mirrored from the current drawing. */
  modelValue?: string
  /** Optional custom options used instead of querying the active database. */
  options?: LineTypeOption[]
  /** Disables interaction while document state cannot be edited. */
  disabled?: boolean
  /** Placeholder shown when no line type can be resolved. */
  placeholder?: string
}

defineProps<RibbonPropertyLineTypeSelectProps>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>
