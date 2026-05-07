<template>
  <ml-ribbon-property-color-dropdown
    :model-value="modelValue"
    :disabled="disabled || fillType === 'solid'"
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
  backgroundColorValue?: AcCmColor
  gradient2ColorValue?: AcCmColor
  disabled?: boolean
  controlWidth?: string
  fillType: 'solid' | 'pattern' | 'gradient'
}

const props = defineProps<Props>()

const modelValue = computed(() => {
  // Show backgroundColor for pattern, gradient2Color for gradient, undefined for solid
  switch (props.fillType) {
    case 'pattern':
      return props.backgroundColorValue
    case 'gradient':
      return props.gradient2ColorValue
    default: // solid
      return undefined
  }
})

const handleColorChange = (color: AcCmColor | undefined) => {
  if (color === undefined) return

  const colorString = color.toString()
  // Call different methods based on fillType
  switch (props.fillType) {
    case 'pattern':
      hatchRibbonCommand.setBackgroundColor(colorString)
      break
    case 'gradient':
      hatchRibbonCommand.setGradient2Color(colorString)
      break
    // For solid, we don't update anything in row 3
  }
}
</script>
