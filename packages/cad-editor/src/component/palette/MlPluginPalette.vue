<template>
  <div ref="host" class="ml-plugin-palette-host" />
</template>

<script setup lang="ts">
import type { AcApUiPalette } from '@mlightcad/cad-simple-viewer'
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps<{
  /** Palette contribution whose `mount` fills this tab. */
  palette: AcApUiPalette
}>()

const host = ref<HTMLElement | null>(null)
let dispose: (() => void) | undefined
let cancelled = false

onMounted(() => {
  void mountPalette()
})

onUnmounted(() => {
  cancelled = true
  dispose?.()
  dispose = undefined
})

/** Loads the plugin panel into the tab the first time it is shown. */
async function mountPalette() {
  const element = host.value
  if (!element) return
  const result = await props.palette.mount(element)
  if (typeof result !== 'function') return
  if (cancelled) {
    result()
    return
  }
  dispose = result
}
</script>

<style scoped>
.ml-plugin-palette-host {
  flex: 1;
  min-height: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.ml-plugin-palette-host :deep(.cad-agent-panel-root) {
  flex: 1;
  min-height: 0;
}
</style>
