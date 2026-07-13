<template>
  <el-dropdown
    v-if="features.isShowMainMenu"
    aria-hidden="false"
    class="ml-main-menu-container"
    popper-class="ml-main-menu-popper"
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
        <el-dropdown-item class="ml-main-menu-export-item">
          <el-dropdown
            placement="right-start"
            popper-class="ml-main-menu-export-submenu"
            trigger="hover"
            @command="handleCommand"
          >
            <span class="ml-main-menu-export-trigger">
              {{ t('main.mainMenu.exportMenu') }}
              <el-icon><ArrowRight /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="Convert">{{
                  t('main.mainMenu.export')
                }}</el-dropdown-item>
                <el-dropdown-item command="ExportHtml">{{
                  t('main.mainMenu.exportHtml')
                }}</el-dropdown-item>
                <el-dropdown-item command="ExportPdf">{{
                  t('main.mainMenu.exportPdf')
                }}</el-dropdown-item>
                <el-dropdown-item command="ExportSvg">{{
                  t('main.mainMenu.exportSvg')
                }}</el-dropdown-item>
                <el-dropdown-item command="PngOut">{{
                  t('main.mainMenu.exportImage')
                }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { ArrowRight, Menu as ElMenu } from '@element-plus/icons-vue'
import {
  AcApConvertToDxfCmd,
  AcApDocManager,
  AcApOpenCmd,
  AcApQNewCmd
} from '@mlightcad/cad-simple-viewer'
import {
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElIcon
} from 'element-plus'
import { useI18n } from 'vue-i18n'

import { useSettings } from '../../composable'

const { t } = useI18n()
const features = useSettings()

const handleCommand = async (command: string) => {
  if (command === 'Convert') {
    const cmd = new AcApConvertToDxfCmd()
    cmd.trigger(AcApDocManager.instance.context)
  } else if (command === 'ExportHtml') {
    AcApDocManager.instance.sendStringToExecute('chtml')
  } else if (command === 'ExportPdf') {
    await AcApDocManager.instance.pluginManager.loadByTrigger('cpdf')
    AcApDocManager.instance.sendStringToExecute('cpdf')
  } else if (command === 'ExportSvg') {
    AcApDocManager.instance.sendStringToExecute('csvg')
  } else if (command === 'PngOut') {
    AcApDocManager.instance.sendStringToExecute('pngout')
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

.ml-main-menu-export-item {
  padding: 0;
}

.ml-main-menu-export-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 5px 16px;
  line-height: 22px;
  box-sizing: border-box;
  text-align: left;
}

:global(.ml-main-menu-popper .el-dropdown-menu__item) {
  justify-content: flex-start;
  text-align: left;
}

:global(.ml-main-menu-popper .ml-main-menu-export-item) {
  display: flex;
  align-items: stretch;
  justify-content: flex-start;
  padding: 0;
}

:global(.ml-main-menu-popper .ml-main-menu-export-item > .el-dropdown) {
  display: flex;
  flex: 1 1 auto;
  width: 100%;
  justify-content: flex-start;
}

:global(.ml-main-menu-popper .ml-main-menu-export-item .el-tooltip__trigger) {
  display: flex;
  flex: 1 1 auto;
  width: 100%;
  justify-content: flex-start;
}

:global(.ml-main-menu-export-submenu .el-dropdown-menu__item) {
  justify-content: flex-start;
  text-align: left;
}
</style>
