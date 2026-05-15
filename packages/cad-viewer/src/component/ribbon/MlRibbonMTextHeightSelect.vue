<template>
  <ml-ribbon-property-field
    :icon="mtextIcon"
    :disabled="disabled"
    :control-width="controlWidth"
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

interface RibbonMTextHeightSelectProps {
  modelValue?: number
  options?: number[]
  disabled?: boolean
  placeholder?: string
  controlWidth?: string
}

const props = withDefaults(defineProps<RibbonMTextHeightSelectProps>(), {
  modelValue: undefined,
  options: () => [1, 2.5, 3.5, 5, 7, 10, 12, 24],
  disabled: false,
  placeholder: '',
  controlWidth: '108px'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

const normalizedOptions = computed(() =>
  Array.from(
    new Set(
      props.options
        .filter(value => Number.isFinite(value) && value > 0)
        .map(value => formatHeight(value))
    )
  )
)

const selectedValue = computed(() =>
  props.modelValue != null && Number.isFinite(props.modelValue)
    ? formatHeight(props.modelValue)
    : ''
)

function formatHeight(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(4)))
}

function handleChange(value: string | number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return
  emit('update:modelValue', parsed)
}
</script>
