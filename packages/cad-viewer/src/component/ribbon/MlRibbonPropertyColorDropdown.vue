<template>
  <ml-ribbon-property-field
    :icon="colorIcon"
    :disabled="disabled"
    :control-width="controlWidth"
    variant="color"
  >
    <ml-color-dropdown
      :model-value="modelValue"
      :disabled="disabled"
      :display-color="displayColor"
      :placeholder="placeholder"
      @update:modelValue="emit('update:modelValue', $event)"
    />
  </ml-ribbon-property-field>
</template>

<script setup lang="ts">
import { AcCmColor } from '@mlightcad/data-model'

import { color as colorIcon } from '../../svg'
import MlColorDropdown from '../common/MlColorDropdown.vue'
import MlRibbonPropertyField from './MlRibbonPropertyField.vue'

/**
 * Props accepted by the ribbon color property field.
 */
interface RibbonPropertyColorDropdownProps {
  /** Active entity color mirrored from the current document state. */
  modelValue?: AcCmColor
  /** Disables edits when the ribbon or current document is unavailable. */
  disabled?: boolean
  /** Resolved swatch color used when symbolic CAD colors need a concrete preview. */
  displayColor?: string
  /** Fallback label shown when no explicit color can be displayed. */
  placeholder?: string
  /** Optional fixed width for the embedded color dropdown. */
  controlWidth?: string
}

defineProps<RibbonPropertyColorDropdownProps>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: AcCmColor | undefined): void
}>()
</script>
