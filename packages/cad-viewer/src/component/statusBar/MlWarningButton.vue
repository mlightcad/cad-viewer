<template>
  <el-button
    v-if="dialogVisible"
    class="ml-warning-button"
    type="warning"
    :icon="Warning"
    @click="click()"
  />
</template>

<script lang="ts" setup>
import { Warning } from '@element-plus/icons-vue'
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { ElButton } from 'element-plus'
import { computed } from 'vue'

import { useMissedData } from '../../composable'

const click = () => {
  AcApDocManager.instance.sendStringToExecute('md')
}

const { fonts, images } = useMissedData()
const dialogVisible = computed(() => {
  return images.size > 0 || fonts.size > 0
})
</script>

<style scoped>
.ml-warning-button {
  border: none;
  padding: 0px;
  cursor: pointer;
  width: 30px;
}
</style>
