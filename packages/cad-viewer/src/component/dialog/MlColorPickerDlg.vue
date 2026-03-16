<template>
  <ml-base-dialog
    v-model:modelValue="visible"
    :title="title"
    :width="500"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <MlColorPickerTabs v-model="selectedColor" />
  </ml-base-dialog>
</template>

<script setup lang="ts">
import { AcCmColor } from '@mlightcad/data-model'
import { computed, shallowRef, watch } from 'vue'

import { MlBaseDialog, MlColorPickerTabs } from '../common'

/**
 * Props
 */
const props = defineProps<{
  modelValue: boolean
  color?: string
  title: string
}>()

/**
 * Emits
 */
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'ok', v: AcCmColor): void
  (e: 'cancel', v: undefined): void
}>()

/**
 * Dialog visibility
 */
const visible = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const selectedColor = shallowRef<AcCmColor | undefined>(
  props.color ? (AcCmColor.fromString(props.color) ?? undefined) : undefined
)

// Watch for changes to color
watch(
  () => props.color,
  newColor => {
    selectedColor.value = newColor
      ? (AcCmColor.fromString(newColor) ?? undefined)
      : undefined
  }
)

/**
 * Confirm
 */
function handleOk() {
  if (selectedColor.value) {
    emit('ok', selectedColor.value)
    return
  }
  const fallback = new AcCmColor()
  fallback.setByLayer()
  emit('ok', fallback)
}

/**
 * Cancel
 */
function handleCancel() {
  emit('cancel', undefined)
}
</script>
