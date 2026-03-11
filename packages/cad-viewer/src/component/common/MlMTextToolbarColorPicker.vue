<template>
  <div class="ml-mtext-toolbar-aci-picker">
    <ElPopover
      placement="bottom"
      trigger="click"
      width="320"
      v-model:visible="colorPopoverVisible"
      :teleported="false"
      :popper-class="`ml-mtext-toolbar-aci-popper ml-theme-${props.theme}`"
    >
      <MlColorIndexPicker
        :model-value="effectiveModelValue"
        @update:modelValue="onAciChange"
      />

      <template #reference>
        <button type="button" class="ml-mtext-toolbar-aci-trigger">
          <span
            class="ml-mtext-toolbar-aci-indicator"
            :style="{ background: cssColor || 'transparent' }"
          />
        </button>
      </template>
    </ElPopover>
  </div>
</template>

<script setup lang="ts">
import { AcCmColor } from '@mlightcad/data-model'
import { ElPopover } from 'element-plus'
import { computed, ref } from 'vue'

import MlColorIndexPicker from './MlColorIndexPicker.vue'

const props = defineProps<{
  modelValue: number | null
  theme: 'light' | 'dark'
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
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}

.ml-mtext-toolbar-aci-popper {
  padding: 0;
}

.ml-mtext-toolbar-aci-trigger {
  width: 100%;
  min-height: 100%;
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

.ml-mtext-toolbar-aci-indicator {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid #666;
  display: block;
}
</style>
