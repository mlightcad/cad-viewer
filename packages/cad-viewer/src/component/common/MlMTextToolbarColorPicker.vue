<template>
  <div class="ml-mtext-toolbar-aci-picker">
    <ElPopover
      placement="bottom"
      trigger="click"
      width="320"
      v-model:visible="colorPopoverVisible"
    >
      <MlColorIndexPicker
        :model-value="effectiveModelValue"
        @update:modelValue="onAciChange"
      />

      <template #reference>
        <ElButton class="ml-mtext-toolbar-aci-trigger">
          <span
            class="ml-mtext-toolbar-aci-indicator"
            :style="{ background: cssColor || 'transparent' }"
          />
        </ElButton>
      </template>
    </ElPopover>
  </div>
</template>

<script setup lang="ts">
import { AcCmColor } from '@mlightcad/data-model'
import { ElButton, ElPopover } from 'element-plus'
import { computed, ref } from 'vue'

import MlColorIndexPicker from './MlColorIndexPicker.vue'

const props = defineProps<{
  modelValue: number | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

/** MlColorIndexPicker expects number (default 256), not null. */
const effectiveModelValue = computed(() => props.modelValue ?? 256)

const colorPopoverVisible = ref(false)

const cssColor = computed(() => {
  const color = new AcCmColor()
  color.colorIndex = effectiveModelValue.value
  return color.cssColor || '#ffffff'
})

function onAciChange(aci: number | null) {
  emit('update:modelValue', aci)
  colorPopoverVisible.value = false
}
</script>

<style scoped>
.ml-mtext-toolbar-aci-picker {
  min-width: 40px;
}

.ml-mtext-toolbar-aci-trigger {
  width: 100%;
}

.ml-mtext-toolbar-aci-indicator {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid #666;
  display: inline-block;
}
</style>
