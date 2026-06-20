<template>
  <div id="app-root">
    <!-- Upload screen when no file is selected -->
    <div v-if="!store.selectedFile" class="upload-screen">
      <FileUpload @file-select="handleFileSelect" />
    </div>

    <!-- CAD viewer when file is selected -->
    <div v-else>
      <MlCadViewer
        locale="en"
        :local-file="store.selectedFile"
        :mode="selectedMode"
        :use-main-thread-draw="useMainThreadDraw"
        :draw-no-plot-layers="drawNoPlotLayers"
        :progressive-rendering="progressiveRendering"
        :open-view-mode="openViewMode"
        @create="initialize"
        base-url="https://cdn.jsdelivr.net/gh/mlightcad/cad-data@main/"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// import { AcApSettingManager } from '@mlightcad/cad-simple-viewer'
import {
  AcApDocManager,
  AcApOpenViewMode,
  AcEdCommandStack,
  AcEdOpenMode
} from '@mlightcad/cad-simple-viewer'
import { MlCadViewer } from '@mlightcad/cad-viewer'
import { ref } from 'vue'

import { AcApQuitCmd } from './commands'
import FileUpload from './components/FileUpload.vue'
import { initializeLocale } from './locale'
import { store } from './store'

const initialize = () => {
  initializeLocale()
  if (import.meta.env.DEV) {
    ;(
      window as Window & { AcApDocManager?: typeof AcApDocManager }
    ).AcApDocManager = AcApDocManager
  }
  const register = AcApDocManager.instance.commandManager
  register.addCommand(
    AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
    'quit',
    'quit',
    new AcApQuitCmd()
  )
  register.addCommand(
    AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
    'exit',
    'exit',
    new AcApQuitCmd()
  )
}

// Decide whether to show command line vertical toolbar at the right side,
// performance stats, coordinates in status bar, etc.
// AcApSettingManager.instance.isShowCommandLine = false
// AcApSettingManager.instance.isShowToolbar = false
// AcApSettingManager.instance.isShowStats = false
// AcApSettingManager.instance.isShowCoordinate = false

const selectedMode = ref<AcEdOpenMode>(AcEdOpenMode.Write)
const useMainThreadDraw = ref(false)
const drawNoPlotLayers = ref(false)
const progressiveRendering = ref(false)
const openViewMode = ref<AcApOpenViewMode | undefined>(undefined)

// Handle file selection from upload component
const handleFileSelect = (
  file: File,
  mode: AcEdOpenMode,
  mainThreadDraw: boolean,
  showNoPlotLayers: boolean,
  enableProgressiveRendering: boolean,
  viewMode: AcApOpenViewMode | undefined
) => {
  store.selectedFile = file
  selectedMode.value = mode
  useMainThreadDraw.value = mainThreadDraw
  drawNoPlotLayers.value = showNoPlotLayers
  progressiveRendering.value = enableProgressiveRendering
  openViewMode.value = viewMode
}
</script>

<style scoped>
#app-root {
  height: 100vh;
  position: fixed;
}

.upload-screen {
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: safe center;
  overflow-y: auto;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  margin: 0;
  padding: 24px;
  box-sizing: border-box;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1000;
  pointer-events: auto; /* Allow clicks on upload screen */
}
</style>
