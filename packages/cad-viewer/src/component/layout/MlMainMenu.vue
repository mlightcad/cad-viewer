<template>
  <el-dropdown
    v-if="features.isShowMainMenu"
    aria-hidden="false"
    class="ml-main-menu-container"
    @command="handleCommand"
  >
    <el-icon class="ml-main-menu-icon" size="30">
      <ElMenu />
    </el-icon>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="QNew">{{
          t('main.mainMenu.new')
        }}</el-dropdown-item>
        <el-dropdown-item command="Open">{{
          t('main.mainMenu.open')
        }}</el-dropdown-item>
        <!-- <el-dropdown-item command="Convert">{{
          t('main.mainMenu.export')
        }}</el-dropdown-item> -->
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { Menu as ElMenu } from '@element-plus/icons-vue'
import {
  AcApConvertToSvgCmd,
  AcApDocManager,
  AcApOpenCmd,
  AcApQNewCmd
} from '@mlightcad/cad-simple-viewer'
import { useI18n } from 'vue-i18n'

import { useSettings } from '../../composable'

const { t } = useI18n()
const features = useSettings()

const handleCommand = (command: string) => {
  if (command === 'Convert') {
    const cmd = new AcApConvertToSvgCmd()
    cmd.trigger(AcApDocManager.instance.context)
  } else if (command === 'QNew') {
    const cmd = new AcApQNewCmd()
    cmd.trigger(AcApDocManager.instance.context)
  } else if (command === 'Open') {
    const cmd = new AcApOpenCmd()
    cmd.trigger(AcApDocManager.instance.context)
  }
}
</script>

<style scoped>
.ml-main-menu-container {
  position: fixed;
  left: 40px;
  top: 20px;
  z-index: 1000;
}

.ml-main-menu-icon {
  outline: none;
  border: none;
}

.ml-main-menu-icon:hover {
  outline: none;
  border: none;
}
</style>
