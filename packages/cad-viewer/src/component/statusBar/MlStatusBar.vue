<template>
  <ml-status-bar
    :class="{ 'is-disabled': isStatusBarDisabled }"
    :aria-disabled="isStatusBarDisabled"
    class="ml-status-bar"
  >
    <!-- Left Slot Content -->
    <template #left>
      <ml-layout-tabs
        :disabled="isStatusBarDisabled"
        :reserved-width="layoutTabsReservedWidth"
      />
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
        <ml-osnap-button />
        <ml-sys-var-toggle-button
          :sys-var-name="AcDbSystemVariables.ORTHOMODE"
          :on-icon="orthoMode"
          :off-icon="orthoMode"
          :on-tooltip="t('main.statusBar.orthoMode.on')"
          :off-tooltip="t('main.statusBar.orthoMode.off')"
          on-color="var(--el-color-primary)"
          off-color="var(--el-text-color-regular)"
        />
        <ml-polar-tracking-button />
        <ml-sys-var-toggle-button
          :sys-var-name="AcDbSystemVariables.LWDISPLAY"
          :on-icon="lineWidth"
          :off-icon="lineWidth"
          :on-tooltip="t('main.statusBar.lineWidth.on')"
          :off-tooltip="t('main.statusBar.lineWidth.off')"
          on-color="var(--el-color-primary)"
          off-color="var(--el-text-color-regular)"
        />
        <ml-sys-var-toggle-button
          :sys-var-name="AcDbSystemVariables.DYNMODE"
          :on-icon="dynamicInput"
          :off-icon="dynamicInput"
          :on-tooltip="t('main.statusBar.dynamicInput.on')"
          :off-tooltip="t('main.statusBar.dynamicInput.off')"
          on-color="var(--el-color-primary)"
          off-color="var(--el-text-color-regular)"
          remember-last-enabled
        />
        <ml-setting-button />
      </el-button-group>
    </template>
  </ml-status-bar>
</template>

<script setup lang="ts">
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { AcDbSystemVariables } from '@mlightcad/data-model'
import { MlStatusBar } from '@mlightcad/ui-components'
import { ElButton, ElButtonGroup } from 'element-plus'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useCurrentPos, useDocument, useIsMobile, useSettings } from '../../composable'
import { dynamicInput, lineWidth, orthoMode } from '../../svg'
import { MlSysVarToggleButton } from '../common'
import MlFullScreenButton from './MlFullScreenButton.vue'
import MlLayoutTabs from './MlLayoutTabs.vue'
import MlNotificationButton from './MlNotificationButton.vue'
import MlOsnapButton from './MlOsnapButton.vue'
import MlPointStyleButton from './MlPointStyleButton.vue'
import MlPolarTrackingButton from './MlPolarTrackingButton.vue'
import MlProgress from './MlProgress.vue'
import MlSettingButton from './MlSettingButton.vue'
import MlThemeButton from './MlThemeButton.vue'
import MlWarningButton from './MlWarningButton.vue'

/** Room kept free for longer coordinates while the mouse moves. */
const COORDINATE_RESERVED_WIDTH = 220

const props = defineProps<{
  isDark: boolean
  toggleDark: () => void
}>()

const { text: posText } = useCurrentPos(AcApDocManager.instance.curView)
const features = useSettings()
const { isDocumentOpening } = useDocument()
const { isMobile } = useIsMobile()
const { t } = useI18n()
const isStatusBarDisabled = computed(() => isDocumentOpening.value)

const layoutTabsReservedWidth = computed(() =>
  features.isShowCoordinate && !isMobile.value ? COORDINATE_RESERVED_WIDTH : 0
)

const emit = defineEmits<{
  toggleNotificationCenter: []
}>()

const toggleNotificationCenter = () => {
  if (isStatusBarDisabled.value) return
  emit('toggleNotificationCenter')
}
</script>

<style scoped>
.ml-status-bar {
  box-sizing: border-box;
}

.ml-status-bar.is-disabled {
  opacity: 0.6;
  pointer-events: none;
  user-select: none;
}

.ml-status-bar :deep(.ml-status-bar-left) {
  flex: 1 1 0;
  min-width: 0;
  overflow: hidden;
}

.ml-status-bar :deep(.ml-status-bar-right) {
  flex: 0 0 auto;
}

.ml-status-bar-right-button-group {
  border: none;
  padding: 0px;
  height: var(--ml-status-bar-height);
}

.ml-status-bar-current-pos {
  border: none;
  height: 100%;
  /*
   * Hold a baseline slot for coordinates. Layout tabs reserve up to 220px;
   * min-width covers the common short-value case so that slot is not released.
   */
  min-width: 180px;
  box-sizing: border-box;
  font-variant-numeric: tabular-nums;
  justify-content: flex-start;
}
</style>
