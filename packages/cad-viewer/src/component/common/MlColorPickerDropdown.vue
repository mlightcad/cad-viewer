<template>
  <div class="ml-color-picker-dropdown">
    <ElPopover
      placement="bottom"
      trigger="click"
      width="360"
      v-model:visible="colorPopoverVisible"
      :teleported="teleported"
      :disabled="disabled"
      :popper-class="resolvedPopperClass"
    >
      <MlColorPickerTabs
        :model-value="modelValue"
        @update:modelValue="onColorChange"
      />

      <template #reference>
        <slot name="reference">
          <button
            type="button"
            class="ml-color-picker-dropdown-trigger"
            :disabled="disabled"
          >
            <span
              class="ml-color-picker-dropdown-indicator"
              :style="{ background: cssColor || 'transparent' }"
            />
          </button>
        </slot>
      </template>
    </ElPopover>
  </div>
</template>

<script setup lang="ts">
import { AcCmColor } from '@mlightcad/data-model'
import { ElPopover } from 'element-plus'
import { computed, ref, watch } from 'vue'

import MlColorPickerTabs from './MlColorPickerTabs.vue'

const props = withDefaults(
  defineProps<{
    modelValue?: AcCmColor
    displayColor?: string
    disabled?: boolean
    teleported?: boolean
    popperClass?: string
    closeOnChange?: boolean
  }>(),
  {
    modelValue: undefined,
    displayColor: undefined,
    disabled: false,
    teleported: false,
    popperClass: undefined,
    closeOnChange: true
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: AcCmColor | undefined]
  change: [value: AcCmColor | undefined]
  close: []
}>()

const colorPopoverVisible = ref(false)

const cssColor = computed(() => {
  if (props.displayColor) return props.displayColor
  if (props.modelValue?.cssColor) return props.modelValue.cssColor
  const color = new AcCmColor()
  color.setByLayer()
  return color.cssColor || '#ffffff'
})

const resolvedPopperClass = computed(() => {
  return ['ml-color-picker-dropdown-popper', props.popperClass]
    .filter(Boolean)
    .join(' ')
})

function onColorChange(color: AcCmColor | undefined) {
  emit('update:modelValue', color)
  emit('change', color)
  if (props.closeOnChange) {
    colorPopoverVisible.value = false
  }
}

watch(colorPopoverVisible, visible => {
  if (!visible) emit('close')
})
</script>

<style scoped>
.ml-color-picker-dropdown {
  min-width: 40px;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}

.ml-color-picker-dropdown-popper {
  padding: 0;
}

.ml-color-picker-dropdown-trigger {
  width: 100%;
  height: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  padding: 0;
  margin: 0;
  appearance: none;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  cursor: pointer;
}

.ml-color-picker-dropdown-trigger:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.ml-color-picker-dropdown-indicator {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid #666;
  display: block;
}
</style>
