<template>
  <el-tooltip :content="t('main.statusBar.export.tooltip')" :hide-after="0">
    <el-button class="ml-export-button" @click="exportImage">
      <component :is="downloadIcon" />
    </el-button>
  </el-tooltip>
</template>

<script lang="ts" setup>
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { useI18n } from 'vue-i18n'

import { download as downloadIcon } from '../../svg'

const { t } = useI18n()

const exportImage = () => {
  const view = AcApDocManager.instance.curView
  const canvas = view.renderer.domElement
  const dataURL = canvas.toDataURL('image/png')

  const link = document.createElement('a')
  link.download = `cad-export-${Date.now()}.png`
  link.href = dataURL
  link.click()
}
</script>

<style scoped>
.ml-export-button {
  border: none;
  padding: 0px;
  cursor: pointer;
  width: 30px;
}
</style>
