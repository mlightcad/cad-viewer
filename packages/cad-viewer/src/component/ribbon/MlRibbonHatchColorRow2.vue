<template>
  <ml-ribbon-property-color-dropdown
    :model-value="modelValue"
    :disabled="disabled"
    :control-width="controlWidth"
    @update:modelValue="handleColorChange"
  />
</template>

<script setup lang="ts">
import type { AcCmColor } from '@mlightcad/data-model'
import { computed } from 'vue'

import { hatchRibbonCommand } from '../../command'
import MlRibbonPropertyColorDropdown from './MlRibbonPropertyColorDropdown.vue'

interface Props {
  modelValue?: AcCmColor
  disabled?: boolean
  controlWidth?: string
  fillType: 'solid' | 'pattern' | 'gradient'
}

const props = defineProps<Props>()

const modelValue = computed(() => {
  // Row 2 always shows fillColor (used for solid/pattern/gradient fill color)
  return props.modelValue
})

const handleColorChange = (color: AcCmColor | undefined) => {
  // Row 2 color is always fillColor regardless of fillType
  if (color !== undefined) {
    hatchRibbonCommand.setFillColor(color.toString())
  }
}
</script>
