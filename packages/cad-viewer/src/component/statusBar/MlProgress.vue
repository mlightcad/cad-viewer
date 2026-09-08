<template>
  <div v-if="visible" class="ml-progress">
    <el-progress
      :text-inside="true"
      :stroke-width="20"
      :percentage="percentage"
      :format="format"
    />
  </div>
</template>

<script lang="ts" setup>
import {
  AcApDocManager,
  eventBus,
  isOpenFileProgressComplete
} from '@mlightcad/cad-simple-viewer'
import { AcDbProgressdEventArgs } from '@mlightcad/data-model'
import { ElProgress } from 'element-plus'
import { onMounted, onUnmounted, ref } from 'vue'

const percentage = ref(0)
const visible = ref(false)

const resetProgress = () => {
  percentage.value = 0
  visible.value = false
}

const updateProgress = (data: AcDbProgressdEventArgs) => {
  percentage.value = data.percentage
  visible.value = !isOpenFileProgressComplete(data)
}

const format = (percentage: number) => {
  return `${percentage.toFixed(0)}%`
}

onMounted(() => {
  eventBus.on('open-file-progress', updateProgress)
  eventBus.on('failed-to-open-file', resetProgress)
  AcApDocManager.instance.events.documentToBeOpened.addEventListener(
    resetProgress
  )
})

onUnmounted(() => {
  eventBus.off('open-file-progress', updateProgress)
  eventBus.off('failed-to-open-file', resetProgress)
  AcApDocManager.instance.events.documentToBeOpened.removeEventListener(
    resetProgress
  )
})
</script>

<style scoped>
.ml-progress {
  width: 100px;
}
</style>
