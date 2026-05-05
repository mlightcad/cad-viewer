<template>
  <div class="ml-hatch-fill-type-panel">
    <!-- Row 1: Fill Type Selection -->
    <div class="ml-hatch-fill-type-panel__row">
      <label class="ml-hatch-fill-type-panel__label">
        {{ label }}
      </label>
      <ElSelect
        :model-value="modelValue"
        :disabled="disabled"
        @update:model-value="handleFillTypeChange"
      >
        <ElOption label="Solid" value="solid" />
        <ElOption label="Pattern" value="pattern" />
        <ElOption label="Gradient" value="gradient" />
      </ElSelect>
    </div>

    <!-- Row 2: Fill Color -->
    <div class="ml-hatch-fill-type-panel__row">
      <label class="ml-hatch-fill-type-panel__label">
        {{ colorLabel }}
      </label>
      <input
        type="color"
        :value="fillColor"
        :disabled="disabled"
        class="ml-hatch-fill-type-panel__color-input"
        @input="handleFillColorChange"
      />
    </div>

    <!-- Row 3: Secondary Color (depends on fill type) -->
    <div v-if="modelValue === 'pattern'" class="ml-hatch-fill-type-panel__row">
      <label class="ml-hatch-fill-type-panel__label">
        {{ backgroundColorLabel }}
      </label>
      <input
        type="color"
        :value="backgroundColor"
        :disabled="disabled"
        class="ml-hatch-fill-type-panel__color-input"
        @input="handleBackgroundColorChange"
      />
    </div>
    <div v-else-if="modelValue === 'gradient'" class="ml-hatch-fill-type-panel__row">
      <label class="ml-hatch-fill-type-panel__label">
        {{ gradient2ColorLabel }}
      </label>
      <input
        type="color"
        :value="gradient2Color"
        :disabled="disabled"
        class="ml-hatch-fill-type-panel__color-input"
        @input="handleGradient2ColorChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElSelect, ElOption } from 'element-plus'

interface MlHatchFillTypePanelProps {
  modelValue?: string
  fillColor?: string
  backgroundColor?: string
  gradient2Color?: string
  disabled?: boolean
  label?: string
  colorLabel?: string
  backgroundColorLabel?: string
  gradient2ColorLabel?: string
}

const { modelValue, fillColor, backgroundColor, gradient2Color, disabled, label, colorLabel, backgroundColorLabel, gradient2ColorLabel } = withDefaults(
  defineProps<MlHatchFillTypePanelProps>(),
  {
    modelValue: 'solid',
    fillColor: '#000000',
    backgroundColor: '#FFFFFF',
    gradient2Color: '#FFFFFF',
    disabled: false,
    label: 'Fill Type',
    colorLabel: 'Color',
    backgroundColorLabel: 'Background Color',
    gradient2ColorLabel: 'Gradient Color 2'
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'update:fillColor', value: string): void
  (e: 'update:backgroundColor', value: string): void
  (e: 'update:gradient2Color', value: string): void
}>()

const handleFillTypeChange = (val: string) => {
  emit('update:modelValue', val)
}

const handleFillColorChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:fillColor', target.value)
}

const handleBackgroundColorChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:backgroundColor', target.value)
}

const handleGradient2ColorChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:gradient2Color', target.value)
}
</script>

<style scoped>
.ml-hatch-fill-type-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
}

.ml-hatch-fill-type-panel__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ml-hatch-fill-type-panel__label {
  min-width: 120px;
  font-size: 12px;
  font-weight: 500;
}

.ml-hatch-fill-type-panel__color-input {
  flex: 1;
  height: 28px;
  border: 1px solid var(--el-border-color);
  border-radius: 2px;
  cursor: pointer;
}

:deep(.el-select) {
  flex: 1;
}

:deep(.el-select .el-select__wrapper) {
  height: 28px;
}
</style>
