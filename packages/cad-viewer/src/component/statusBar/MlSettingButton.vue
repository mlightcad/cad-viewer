<template>
  <el-tooltip :content="t('main.statusBar.setting.tooltip')" :hide-after="0">
    <el-dropdown trigger="click" @command="handleCommand">
      <el-button class="ml-setting-button" :icon="Setting" />
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            :icon="features.isShowStats ? Check : ''"
            command="isShowStats"
          >
            {{ t('main.statusBar.setting.stats') }}
          </el-dropdown-item>
          <el-dropdown-item
            :icon="features.isShowCommandLine ? Check : ''"
            command="isShowCommandLine"
          >
            {{ t('main.statusBar.setting.commandLine') }}
          </el-dropdown-item>
          <el-dropdown-item
            :icon="features.isShowEntityInfo ? Check : ''"
            command="isShowEntityInfo"
          >
            {{ t('main.statusBar.setting.entityInfo') }}
          </el-dropdown-item>
          <el-dropdown-item
            :icon="features.isShowMainMenu ? Check : ''"
            command="isShowMainMenu"
          >
            {{ t('main.statusBar.setting.mainMenu') }}
          </el-dropdown-item>
          <el-dropdown-item
            :icon="features.isShowLanguageSelector ? Check : ''"
            command="isShowLanguageSelector"
          >
            {{ t('main.statusBar.setting.languageSelector') }}
          </el-dropdown-item>
          <el-dropdown-item
            :icon="features.isShowCoordinate ? Check : ''"
            command="isShowCoordinate"
          >
            {{ t('main.statusBar.setting.coordinate') }}
          </el-dropdown-item>
          <el-dropdown-item
            :icon="features.isShowToolbar ? Check : ''"
            command="isShowToolbar"
          >
            {{ t('main.statusBar.setting.toolbar') }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </el-tooltip>
</template>

<script lang="ts" setup>
import { Check, Setting } from '@element-plus/icons-vue'
import { AcApSettingManager, AcApSettings } from '@mlightcad/cad-simple-viewer'
import { useI18n } from 'vue-i18n'

import { useSettings } from '../../composable'

const { t } = useI18n()
const features = useSettings()

const handleCommand = (command: keyof AcApSettings) => {
  if (command == 'isShowCoordinate') {
    features.isShowCoordinate = !features.isShowCoordinate
    AcApSettingManager.instance.isShowCoordinate = features.isShowCoordinate
  } else if (command == 'isShowCommandLine') {
    features.isShowCommandLine = !features.isShowCommandLine
    AcApSettingManager.instance.isShowCommandLine = features.isShowCommandLine
  } else if (command == 'isShowEntityInfo') {
    features.isShowEntityInfo = !features.isShowEntityInfo
    AcApSettingManager.instance.isShowEntityInfo = features.isShowEntityInfo
  } else if (command == 'isShowMainMenu') {
    features.isShowMainMenu = !features.isShowMainMenu
    AcApSettingManager.instance.isShowMainMenu = features.isShowMainMenu
  } else if (command == 'isShowLanguageSelector') {
    features.isShowLanguageSelector = !features.isShowLanguageSelector
    AcApSettingManager.instance.isShowLanguageSelector = features.isShowLanguageSelector
  } else if (command == 'isShowToolbar') {
    features.isShowToolbar = !features.isShowToolbar
    AcApSettingManager.instance.isShowToolbar = features.isShowToolbar
  } else if (command == 'isShowStats') {
    features.isShowStats = !features.isShowStats
    AcApSettingManager.instance.isShowStats = features.isShowStats
  }
}
</script>

<style scoped>
.ml-setting-button {
  border: none;
  padding: 0px;
  cursor: pointer;
  width: 30px;
}
</style>
