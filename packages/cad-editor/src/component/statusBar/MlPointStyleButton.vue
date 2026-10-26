<template>
  <el-tooltip :content="t('main.statusBar.pointStyle.tooltip')" :hide-after="0">
    <el-button
      class="ml-point-style-button"
      :icon="Operation"
      @click="click()"
    />
  </el-tooltip>
</template>

<script lang="ts" setup>
import { Operation } from '@element-plus/icons-vue'
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { ElButton, ElTooltip } from 'element-plus'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const click = () => {
  AcApDocManager.instance.sendStringToExecute('pttype')
}
</script>

<style scoped>
.ml-point-style-button {
  border: none;
  padding: 0px;
  cursor: pointer;
  width: 30px;
}
</style>
