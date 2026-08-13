<template>
  <ml-ribbon-property-field
    :icon="mtextIcon"
    :disabled="disabled"
    :control-width="controlWidth"
    variant="line-weight"
  >
    <el-select
      :model-value="selectedValue"
      :disabled="disabled"
      :placeholder="placeholder"
      allow-create
      default-first-option
      filterable
      size="small"
      @change="handleChange"
    >
      <el-option
        v-for="option in normalizedOptions"
        :key="option"
        :label="option"
        :value="option"
      />
    </el-select>
  </ml-ribbon-property-field>
</template>

<script setup lang="ts">
import { ElOption, ElSelect } from 'element-plus'
import { computed } from 'vue'

import { mtext as mtextIcon } from '../../svg'
import MlRibbonPropertyField from './MlRibbonPropertyField.vue'

/**
 * Markup font-size control for the Review ribbon (screen CSS pixels).
 * Same shell as color / lineweight: icon on the left + dropdown.
 */
interface RibbonMarkupFontSizeSelectProps {
  modelValue?: number
  options?: number[]
  disabled?: boolean
  placeholder?: string
  controlWidth?: string
}

const props = withDefaults(defineProps<RibbonMarkupFontSizeSelectProps>(), {
  modelValue: undefined,
  options: () => [10, 12, 14, 16, 18, 20, 24, 28, 32],
  disabled: false,
  placeholder: '',
  // Match lineweight control width so the left icon stays visible.
  controlWidth: undefined
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

const normalizedOptions = computed(() =>
  Array.from(
    new Set(
      props.options
        .filter(value => Number.isFinite(value) && value > 0)
        .map(value => formatSize(value))
    )
  )
)

const selectedValue = computed(() =>
  props.modelValue != null && Number.isFinite(props.modelValue)
    ? formatSize(props.modelValue)
    : ''
)

function formatSize(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(2)))
}

function handleChange(value: string | number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return
  emit('update:modelValue', parsed)
}
</script>
