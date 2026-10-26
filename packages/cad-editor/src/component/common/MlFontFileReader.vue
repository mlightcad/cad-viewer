<template>
  <input
    type="file"
    ref="fontFileInput"
    accept=".shx,.ttf,.otf,.woff"
    style="display: none"
    @change="handleFileChange"
  />
</template>

<script setup lang="ts">
import { eventBus } from '@mlightcad/cad-simple-viewer'
import { onMounted, onUnmounted, ref } from 'vue'

const fontFileInput = ref<HTMLInputElement | null>(null)

const openFontFileDialog = () => {
  fontFileInput.value?.click()
}

onMounted(() => {
  eventBus.on('cache-font', openFontFileDialog)
})

onUnmounted(() => {
  eventBus.off('cache-font', openFontFileDialog)
})

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  eventBus.emit('font-file-selected', { file })
  target.value = ''
}
</script>
