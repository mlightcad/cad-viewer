<template>
  <div
    ref="host"
    class="ml-dom-palette-host"
    data-testid="find-palette"
  />
</template>

<script setup lang="ts">
import {
  AcApDocManager,
  AcApI18n,
  AcUiFindPaletteView,
  AcUiI18n,
  acuiRegisterSimpleUiI18n
} from '@mlightcad/cad-simple-viewer'
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

import { store } from '../../app'

acuiRegisterSimpleUiI18n()

const host = ref<HTMLElement | null>(null)
let view: AcUiFindPaletteView | undefined
const i18n = new AcUiI18n()

const handleLocaleChanged = () => {
  view?.refreshLocale()
}

const focusInput = () => {
  nextTick(() => view?.focus())
}

onMounted(() => {
  view = new AcUiFindPaletteView({
    editor: AcApDocManager.instance,
    i18n
  })
  host.value?.append(view.element)
  AcApI18n.events.localeChanged.addEventListener(handleLocaleChanged)
  focusInput()
})

onUnmounted(() => {
  AcApI18n.events.localeChanged.removeEventListener(handleLocaleChanged)
  view?.destroy()
  view?.element.remove()
  view = undefined
})

watch(() => store.dialogs.findFocusTick, focusInput)
</script>

<style scoped>
.ml-dom-palette-host {
  flex: 1;
  min-height: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.ml-dom-palette-host :deep(.ml-ex-ui-find-palette) {
  flex: 1;
  min-height: 0;
}
</style>
