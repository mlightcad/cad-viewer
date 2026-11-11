<template>
  <div ref="host" class="ml-hosted-panel" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

/**
 * Mounts a framework-free command panel (from `AcApPaletteService`) in a
 * palette tab. The panel element belongs to its command: it is only moved
 * in and out of the tab, never destroyed here.
 */
const props = defineProps<{ element: HTMLElement }>()

const host = ref<HTMLElement | null>(null)

onMounted(() => {
  host.value?.append(props.element)
})

onUnmounted(() => {
  props.element.remove()
})
</script>

<style scoped>
.ml-hosted-panel {
  flex: 1;
  min-height: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
