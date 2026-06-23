<template>
  <Teleport v-if="headerEl && displayName" :to="headerEl">
    <div class="ml-ribbon-file-name" :style="overlayStyle">
      {{ displayName }}
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { type CSSProperties, onUnmounted, ref, watchEffect } from 'vue'

import { useDocument } from '../../composable'

interface Props {
  containerEl?: HTMLElement | null
}

const props = defineProps<Props>()

const { displayName } = useDocument()

const headerEl = ref<HTMLElement>()
const overlayStyle = ref<CSSProperties>()

const updatePosition = () => {
  const container = props.containerEl
  if (!container) {
    headerEl.value = undefined
    overlayStyle.value = undefined
    return
  }

  const header = container.querySelector('.ml-ribbon__header')
  const headLeft = container.querySelector('.ml-ribbon__head-left')
  const headRight = container.querySelector('.ml-ribbon__head-right')
  if (
    !(header instanceof HTMLElement) ||
    !(headLeft instanceof HTMLElement) ||
    !(headRight instanceof HTMLElement)
  ) {
    headerEl.value = undefined
    overlayStyle.value = undefined
    return
  }

  headerEl.value = header

  const headerRect = header.getBoundingClientRect()
  const leftRect = headLeft.getBoundingClientRect()
  const rightRect = headRight.getBoundingClientRect()
  const gapLeft = leftRect.right - headerRect.left
  const gapWidth = Math.max(0, rightRect.left - leftRect.right)

  overlayStyle.value = {
    left: `${gapLeft}px`,
    width: `${gapWidth}px`,
    height: `${headerRect.height}px`
  }
}

let resizeObserver: ResizeObserver | undefined
let rafId = 0

const scheduleUpdate = () => {
  cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(updatePosition)
}

watchEffect(onCleanup => {
  const container = props.containerEl
  if (!container) {
    headerEl.value = undefined
    overlayStyle.value = undefined
    return
  }

  scheduleUpdate()

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(scheduleUpdate)
    resizeObserver.observe(container)
    for (const selector of [
      '.ml-ribbon__header',
      '.ml-ribbon__head-left',
      '.ml-ribbon__head-right'
    ]) {
      const element = container.querySelector(selector)
      if (element) resizeObserver.observe(element)
    }
  }

  onCleanup(() => {
    cancelAnimationFrame(rafId)
    resizeObserver?.disconnect()
    resizeObserver = undefined
  })
})

watchEffect(() => {
  displayName.value
  scheduleUpdate()
})

onUnmounted(() => {
  cancelAnimationFrame(rafId)
  resizeObserver?.disconnect()
})
</script>

<style scoped>
.ml-ribbon-file-name {
  position: absolute;
  top: 0;
  z-index: 11;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 0 8px;
  color: var(--el-text-color-regular);
  font-size: var(--el-font-size-small);
  line-height: 1.2;
  text-align: center;
  pointer-events: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
