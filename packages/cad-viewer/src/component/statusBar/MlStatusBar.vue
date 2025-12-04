<template>
  <ml-status-bar class="ml-status-bar">
    <!-- Left Slot Content -->
    <template #left>
      <el-button-group class="ml-status-bar-left-button-group">
        <el-button
          v-for="layout in layouts"
          class="ml-status-bar-layout-button"
          :key="layout.name"
          :type="layout.isActive ? 'primary' : ''"
          @click="handleSelectLayout(layout)"
        >
          {{ layout.name }}
        </el-button>
      </el-button-group>
    </template>

    <!-- Right Slot Content -->
    <template #right>
      <ml-progress />
      <el-button-group class="ml-status-bar-right-button-group">
        <el-button
          v-if="features.isShowCoordinate && !isMobile"
          class="ml-status-bar-current-pos"
          >{{ posText }}</el-button
        >
        <ml-warning-button />
        <ml-notification-button @click="toggleNotificationCenter" />
        <ml-theme-button
          :is-dark="props.isDark"
          :toggle-dark="props.toggleDark"
        />
        <ml-full-screen-button />
        <ml-point-style-button />
        <ml-setting-button />
      </el-button-group>
    </template>
  </ml-status-bar>
</template>

<script setup lang="ts">
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { acdbHostApplicationServices } from '@mlightcad/data-model'
import { MlStatusBar } from '@mlightcad/ui-components'

import {
  LayoutInfo,
  useCurrentPos,
  useIsMobile,
  useLayouts,
  useSettings
} from '../../composable'
import MlFullScreenButton from './MlFullScreenButton.vue'
import MlNotificationButton from './MlNotificationButton.vue'
import MlPointStyleButton from './MlPointStyleButton.vue'
import MlProgress from './MlProgress.vue'
import MlSettingButton from './MlSettingButton.vue'
import MlThemeButton from './MlThemeButton.vue'
import MlWarningButton from './MlWarningButton.vue'

const props = defineProps<{
  isDark: boolean
  toggleDark: () => void
}>()

const { text: posText } = useCurrentPos(AcApDocManager.instance.curView)
const layouts = useLayouts(AcApDocManager.instance)
const features = useSettings()
const { isMobile } = useIsMobile()

const handleSelectLayout = (layout: LayoutInfo) => {
  acdbHostApplicationServices().layoutManager.setCurrentLayoutBtrId(
    layout.blockTableRecordId
  )
}

const emit = defineEmits<{
  toggleNotificationCenter: []
}>()

const toggleNotificationCenter = () => {
  emit('toggleNotificationCenter')
}
</script>

<style scoped>
.ml-status-bar {
  box-sizing: border-box;
}

.ml-status-bar-left-button-group {
  border: none;
  box-sizing: border-box;
  height: var(--ml-status-bar-height);
}

.ml-status-bar-layout-button {
  box-sizing: border-box;
}

.ml-status-bar-right-button-group {
  border: none;
  padding: 0px;
  height: var(--ml-status-bar-height);
}

.ml-status-bar-current-pos {
  border: none;
  height: 100%;
}
</style>
