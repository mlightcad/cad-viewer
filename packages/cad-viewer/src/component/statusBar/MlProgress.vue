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
import { eventBus } from '@mlightcad/cad-simple-viewer'
import {
  AcDbParsingTaskStats,
  AcDbProgressdEventArgs
} from '@mlightcad/data-model'
import { ElProgress } from 'element-plus'
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useNotificationCenter } from '../../composable'

const { t } = useI18n()
const percentage = ref(0)
const visible = ref(false)
const { warning } = useNotificationCenter()

const updateProgress = (data: AcDbProgressdEventArgs) => {
  if (data.stage === 'CONVERSION') {
    if (data.subStage) {
      if (
        data.subStage === 'PARSE' &&
        data.subStageStatus === 'END' &&
        data.data
      ) {
        const stats = data.data as AcDbParsingTaskStats
        if (stats.unknownEntityCount > 0) {
          warning(
            t('main.notification.title.parsingWarning'),
            t('main.message.unknownEntities', {
              count: stats.unknownEntityCount
            })
          )
        }
      }
    }
  }
  percentage.value = data.percentage
  if (percentage.value < 100) {
    visible.value = true
  } else {
    visible.value = false
  }
}

const format = (percentage: number) => {
  return `${percentage.toFixed(0)}%`
}

onMounted(() => {
  eventBus.on('open-file-progress', updateProgress)
})

onUnmounted(() => {
  eventBus.off('open-file-progress', updateProgress)
})
</script>

<style scoped>
.ml-progress {
  width: 100px;
}
</style>
