<template>
  <el-tooltip :content="tooltip" :hide-after="0">
    <el-button class="ml-toggle-button" :icon="icon" @click="handleClicked" />
  </el-tooltip>
</template>

<script lang="ts" setup>
import { Component, computed, DefineComponent } from 'vue'

type MlIconType = (() => DefineComponent) | Component

/**
 * Data to descibe toggle button
 */
export interface MlToggleButtonData {
  /**
   * Icon used when button is 'on'
   */
  onIcon: MlIconType
  /**
   * Icon used when button is 'off'.
   */
  offIcon: MlIconType
  /**
   * Tooltip when button is 'on'
   */
  onTooltip: string
  /**
   * Tooltip when button is 'off'
   */
  offTooltip: string
}

/**
 * Properties of MlToggleButton component
 */
interface Props {
  /**
   * Button size
   */
  size?: number | string
  /**
   * Data to descibe toggle button
   */
  data: MlToggleButtonData
}

interface Events {
  /**
   * Trigger this event when toggle button is clicked.
   * @param state New state of toggle button
   */
  (e: 'click', state: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  size: 30
})
const on = defineModel({ default: false })
const emit = defineEmits<Events>()

const icon = computed(() => {
  return on.value ? props.data.onIcon : props.data.offIcon
})

const size = computed(() => {
  return props.size + 'px'
})

const tooltip = computed(() => {
  return on.value ? props.data.onTooltip : props.data.offTooltip
})

const handleClicked = () => {
  emit('click', on.value)
}
</script>

<style scoped>
.ml-toggle-button {
  border: none;
  padding: 0px;
  cursor: pointer;
  width: v-bind(size);
  height: v-bind(size);
  color: var(--el-text-color-regular);
}
</style>
