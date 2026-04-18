<template>
  <ml-toggle-button
    v-model="isFullscreenMode"
    :data="fullScreenBtnData"
    @click="toggleFullScreen"
  />
</template>

<script lang="ts" setup>
import { useFullscreen } from '@vueuse/core'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { markComponentConfigRaw } from '../../composable/markComponentConfigRaw'
import { fullScreen } from '../../svg'
import { MlToggleButton } from '../common'

const { t } = useI18n()
const { isFullscreen, toggle: toggleFullScreen } = useFullscreen()

const fullScreenBtnData = computed(() => {
  return markComponentConfigRaw({
    onIcon: fullScreen,
    offIcon: fullScreen,
    onTooltip: t('main.statusBar.fullScreen.on'),
    offTooltip: t('main.statusBar.fullScreen.off')
  })
})

const isFullscreenMode = computed(() => {
  return isFullscreen.value
})
</script>
