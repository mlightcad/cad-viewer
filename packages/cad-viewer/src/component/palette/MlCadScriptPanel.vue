<template>
  <div ref="host" class="ml-cad-script-host" />
</template>

<script setup lang="ts">
import type { CadScriptPanel } from '@mlightcad/cad-script-plugin'
import { onMounted, onUnmounted, ref } from 'vue'

const host = ref<HTMLElement | null>(null)
let panel: CadScriptPanel | undefined
let disposed = false

onMounted(() => {
  void mountPanel()
})

onUnmounted(() => {
  disposed = true
  panel?.destroy()
  panel = undefined
})

/**
 * Loads the DOM script console into this palette tab.
 */
async function mountPanel() {
  await import('@mlightcad/cad-script-plugin/style.css')
  const { CadScriptPanel: Panel } = await import('@mlightcad/cad-script-plugin')
  if (disposed || !host.value) return
  const created = new Panel()
  if (disposed || !host.value) {
    created.destroy()
    return
  }
  panel = created
  host.value.append(created.element)
}
</script>

<style scoped>
.ml-cad-script-host {
  flex: 1;
  min-height: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
