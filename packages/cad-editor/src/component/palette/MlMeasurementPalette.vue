<template>
  <div
    ref="host"
    class="ml-dom-palette-host"
    data-testid="measurement-palette"
  />
</template>

<script setup lang="ts">
import {
  AcApDocManager,
  AcApI18n,
  AcUiI18n,
  AcUiMeasurementPaletteView,
  acuiRegisterSimpleUiI18n
} from '@mlightcad/cad-simple-viewer'
import { onMounted, onUnmounted, ref } from 'vue'

acuiRegisterSimpleUiI18n()

const host = ref<HTMLElement | null>(null)
let view: AcUiMeasurementPaletteView | undefined
const i18n = new AcUiI18n()

const handleLocaleChanged = () => {
  view?.refreshLocale()
}

onMounted(() => {
  view = new AcUiMeasurementPaletteView({
    editor: AcApDocManager.instance,
    i18n
  })
  host.value?.append(view.element)
  AcApI18n.events.localeChanged.addEventListener(handleLocaleChanged)
})

onUnmounted(() => {
  AcApI18n.events.localeChanged.removeEventListener(handleLocaleChanged)
  view?.destroy()
  view?.element.remove()
  view = undefined
})
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

.ml-dom-palette-host :deep(.ml-ex-ui-measure-palette) {
  flex: 1;
  min-height: 0;
}
</style>
