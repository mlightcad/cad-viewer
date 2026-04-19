<template>
  <ml-ribbon-property-field
    :icon="lineWeightIcon"
    :disabled="disabled"
    variant="line-weight"
  >
    <ml-line-weight-select
      :model-value="modelValue"
      :disabled="disabled"
      @update:modelValue="emit('update:modelValue', $event)"
    />
  </ml-ribbon-property-field>
</template>

<script setup lang="ts">
import { AcGiLineWeight } from '@mlightcad/data-model'

import { lineWeight as lineWeightIcon } from '../../svg'
import MlLineWeightSelect from './MlLineWeightSelect.vue'
import MlRibbonPropertyField from './MlRibbonPropertyField.vue'

/**
 * Props accepted by the ribbon line weight property field.
 */
interface RibbonPropertyLineWeightSelectProps {
  /** Active `CELWEIGHT` value mirrored from the current drawing. */
  modelValue: AcGiLineWeight
  /** Disables interaction while ribbon actions are unavailable. */
  disabled?: boolean
}

defineProps<RibbonPropertyLineWeightSelectProps>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: AcGiLineWeight): void
}>()
</script>
