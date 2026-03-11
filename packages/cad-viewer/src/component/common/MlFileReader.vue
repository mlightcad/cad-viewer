<template>
  <!-- Hidden file input -->
  <input
    type="file"
    ref="fileInput"
    :accept="accept"
    style="display: none"
    @change="handleFileChange"
  />
</template>

<script setup lang="ts">
import { eventBus } from '@mlightcad/cad-simple-viewer'
import { log } from '@mlightcad/data-model'
import { computed, onMounted, ref } from 'vue'

import { useFileTypes } from '../../composable/useFileTypes'

// Define the types for the events we emit
const emit = defineEmits<{
  (e: 'file-read', fileName: string, fileContent: string | ArrayBuffer): void
}>()

// Type reference for the input element
const fileInput = ref<HTMLInputElement | null>(null)

const supportedFileTypes = useFileTypes()

const accept = computed(() => {
  const fileTypes = Array.from(supportedFileTypes.value)
  let result = ''
  for (let index = 0, size = fileTypes.length; index < size; ++index) {
    if (index == size - 1) {
      result += `.${fileTypes[index]}`
    } else {
      result += `.${fileTypes[index]}, `
    }
  }
  return result
})

onMounted(() => {
  // Listen for the event to open the file dialog
  eventBus.on('open-file', () => {
    fileInput.value?.click() // Trigger the file input
  })
})

// Handle file input change and emit file content
const handleFileChange = (event: Event): void => {
  const target = event.target as HTMLInputElement
  const selectedFile = target.files?.[0]

  if (selectedFile && selectedFile.name) {
    const reader = new FileReader()
    reader.readAsArrayBuffer(selectedFile)

    reader.onload = (event: ProgressEvent<FileReader>) => {
      const fileContent = event.target?.result
      if (fileContent) {
        // Emit the file content
        emit('file-read', selectedFile.name, fileContent)
      }
    }

    reader.onerror = () => {
      log.error('Failed to read the file.')
    }
  }
}
</script>
