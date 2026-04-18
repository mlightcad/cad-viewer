<template>
  <el-config-provider :size="'small'">
    <ml-tool-palette
      class="ml-layer-manager"
      :style="paletteStyle"
      v-model="store.dialogs.layerManager"
      v-model:active-tab="store.dialogs.activePaletteTab"
      :tabs="tabs"
      :left-offset="paletteOffsets.left"
      :right-offset="paletteOffsets.right"
      :top-offset="paletteOffsets.top"
      :bottom-offset="paletteOffsets.bottom"
    >
      <template #tab-layerManager>
        <div class="ml-layer-list-wrapper">
          <ml-layer-list :editor="props.editor" />
        </div>
      </template>
      <template #tab-entityProperties>
        <ml-entity-properties :entity-props-list="properties" />
      </template>
    </ml-tool-palette>
  </el-config-provider>
</template>

<script setup lang="ts">
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { AcDbEntityProperties } from '@mlightcad/data-model'
import { MlToolPalette, MlToolPaletteTab } from '@mlightcad/ui-components'
import { computed, nextTick, watch } from 'vue'

import { store } from '../../app'
import { useSelectionSet, useViewerRect } from '../../composable'
import { toolPaletteTabName, toolPaletteTitle } from '../../locale'
import MlEntityProperties from './MlEntityProperties.vue'
import MlLayerList from './MlLayerList.vue'

/**
 * Properties of palette manager component
 */
interface Props {
  /**
   * Current editor
   */
  editor: AcApDocManager
}

const props = defineProps<Props>()
const containerRect = useViewerRect()

const DEFAULT_WIDTH = 400
const DEFAULT_HEIGHT = 500
const FLOATING_LEFT_OFFSET = 2
const FLOATING_TOP_OFFSET = 2

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max)
}

const paletteOffsets = computed(() => {
  const { top, left, width, height } = containerRect.value
  const right = left + width
  const bottom = top + height

  return {
    top,
    left,
    right: Math.max(0, window.innerWidth - right),
    bottom: Math.max(0, window.innerHeight - bottom)
  }
})

const paletteStyle = computed(() => {
  const { top, left, width, height } = containerRect.value
  return {
    '--ml-palette-left': `${left + FLOATING_LEFT_OFFSET}px`,
    '--ml-palette-top': `${top + FLOATING_TOP_OFFSET}px`,
    '--ml-palette-width': `${Math.min(DEFAULT_WIDTH, width)}px`,
    '--ml-palette-height': `${Math.min(DEFAULT_HEIGHT, height)}px`,
    '--ml-palette-max-width': `${width}px`,
    '--ml-palette-max-height': `${height}px`
  }
})

const syncPaletteToContainer = () => {
  if (!store.dialogs.layerManager) return

  const paletteElement =
    document.querySelector<HTMLElement>('.ml-layer-manager')
  if (!paletteElement) return

  const {
    top,
    left,
    width: containerWidth,
    height: containerHeight
  } = containerRect.value
  const right = left + containerWidth
  const bottom = top + containerHeight
  const rect = paletteElement.getBoundingClientRect()
  const width = Math.min(rect.width || DEFAULT_WIDTH, containerWidth)
  const height = Math.min(rect.height || DEFAULT_HEIGHT, containerHeight)
  const isDockedLeft = rect.left <= left + 1
  const isDockedRight = rect.right >= right - 1

  const nextLeft = isDockedLeft
    ? left
    : isDockedRight
      ? Math.max(left, right - width)
      : clamp(rect.left, left, right - width)
  const nextTop =
    isDockedLeft || isDockedRight ? top : clamp(rect.top, top, bottom - height)
  const nextHeight = isDockedLeft || isDockedRight ? containerHeight : height

  paletteElement.style.left = `${nextLeft}px`
  paletteElement.style.top = `${nextTop}px`
  paletteElement.style.width = `${width}px`
  paletteElement.style.height = `${nextHeight}px`
  paletteElement.style.maxHeight = `${containerHeight}px`
  paletteElement.style.maxWidth = `${containerWidth}px`
}

const tabNames = ['layerManager', 'entityProperties']
const tabs = computed<MlToolPaletteTab[]>(() => {
  return tabNames.map(name => {
    return {
      name,
      label: toolPaletteTabName(name),
      title: toolPaletteTitle(name)
    }
  })
})

watch(
  () => store.dialogs.activePaletteTab,
  activeTab => {
    if (!tabNames.includes(activeTab)) {
      store.dialogs.activePaletteTab = tabNames[0]
    }
  },
  { immediate: true }
)

watch(
  () => [containerRect.value, store.dialogs.layerManager],
  async () => {
    await nextTick()
    syncPaletteToContainer()
  },
  { immediate: true, deep: true }
)

const { selectionSet } = useSelectionSet()
const properties = computed(() => {
  const list: AcDbEntityProperties[] = []
  const db = AcApDocManager.instance.curDocument.database
  selectionSet.value.forEach(id => {
    const entity = db.tables.blockTable.modelSpace.getIdAt(id)
    if (entity) list.push(entity.properties)
  })
  return list
})
</script>

<style scoped>
.ml-layer-manager {
  left: var(--ml-palette-left);
  top: var(--ml-palette-top);
  width: var(--ml-palette-width);
  height: var(--ml-palette-height);
  max-width: var(--ml-palette-max-width);
  max-height: var(--ml-palette-max-height);
  z-index: 7;
}

.ml-layer-list-wrapper {
  overflow: auto;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: flex-start; /* Align items at the top */
  justify-content: flex-start; /* Align items to the left */
}
</style>
