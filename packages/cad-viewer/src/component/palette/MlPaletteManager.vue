<template>
  <el-config-provider :size="'small'">
    <ml-tool-palette
      class="ml-layer-manager"
      :style="paletteStyle"
      v-model="store.dialogs.layerManager"
      :title="activeTabTitle"
      :left-offset="paletteOffsets.left"
      :right-offset="paletteOffsets.right"
      :top-offset="paletteOffsets.top"
      :bottom-offset="paletteOffsets.bottom"
    >
      <ml-overflow-tabs
        v-model="store.dialogs.activePaletteTab"
        :tabs="tabs"
        :more-tabs-label="t('main.toolPalette.moreTabs')"
      >
        <div
          v-if="store.dialogs.activePaletteTab === 'layerManager'"
          class="ml-layer-list-wrapper"
        >
          <ml-layer-list :editor="props.editor" />
        </div>
        <ml-entity-properties
          v-else-if="store.dialogs.activePaletteTab === 'entityProperties'"
          :entity-props-list="properties"
        />
        <div
          v-else-if="store.dialogs.activePaletteTab === 'countList'"
          class="ml-count-list-wrapper"
        >
          <ml-count-list />
        </div>
        <div
          v-else-if="store.dialogs.activePaletteTab === 'missingResources'"
          class="ml-missing-resources-wrapper"
        >
          <ml-missing-resources />
        </div>
        <div
          v-else-if="store.dialogs.activePaletteTab === 'memoryProfile'"
          class="ml-memory-profile-wrapper"
        >
          <ml-memory-profile />
        </div>
        <div
          v-else-if="store.dialogs.activePaletteTab === 'blocks'"
          class="ml-blocks-palette-wrapper"
        >
          <ml-blocks-palette />
        </div>
        <div
          v-else-if="
            store.features.agentPlugin &&
            store.dialogs.activePaletteTab === 'agent'
          "
          class="ml-agent-palette-wrapper"
        >
          <agent-chat-panel embedded />
        </div>
      </ml-overflow-tabs>
    </ml-tool-palette>
  </el-config-provider>
</template>

<script setup lang="ts">
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { AcDbEntityProperties } from '@mlightcad/data-model'
import {
  type MlOverflowTab,
  MlOverflowTabs,
  MlToolPalette
} from '@mlightcad/ui-components'
import { ElConfigProvider } from 'element-plus'
import { computed, defineAsyncComponent, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { store } from '../../app'
import { useSelectionSet, useViewerRect } from '../../composable'
import { toolPaletteTabName, toolPaletteTitle } from '../../locale'
import MlBlocksPalette from './MlBlocksPalette.vue'
import MlCountList from './MlCountList.vue'
import MlEntityProperties from './MlEntityProperties.vue'
import MlLayerList from './MlLayerList.vue'
import MlMemoryProfile from './MlMemoryProfile.vue'
import MlMissingResources from './MlMissingResources.vue'

const AgentChatPanel = defineAsyncComponent(() =>
  Promise.all([
    import('@mlightcad/cad-agent-plugin/style.css'),
    import('@mlightcad/cad-agent-plugin')
  ]).then(([, module]) => module.AgentChatPanel)
)

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
const { t } = useI18n()
const containerRect = useViewerRect()

const DEFAULT_WIDTH = 520
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
  const safeWidth = width > 0 ? width : DEFAULT_WIDTH
  const safeHeight = height > 0 ? height : DEFAULT_HEIGHT
  return {
    '--ml-palette-left': `${left + FLOATING_LEFT_OFFSET}px`,
    '--ml-palette-top': `${top + FLOATING_TOP_OFFSET}px`,
    '--ml-palette-width': `${Math.min(DEFAULT_WIDTH, safeWidth)}px`,
    '--ml-palette-height': `${Math.min(DEFAULT_HEIGHT, safeHeight)}px`,
    '--ml-palette-max-width': `${safeWidth}px`,
    '--ml-palette-max-height': `${safeHeight}px`
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
  if (containerWidth <= 0 || containerHeight <= 0) return

  const right = left + containerWidth
  const bottom = top + containerHeight
  const rect = paletteElement.getBoundingClientRect()
  const width = Math.min(rect.width || DEFAULT_WIDTH, containerWidth)
  const height = Math.min(rect.height || DEFAULT_HEIGHT, containerHeight)
  const isDockedLeft = rect.left <= left + 1
  const isDockedRight = rect.right >= right - 1
  // Geometric proximity alone is not enough: a floating palette sits only a
  // couple of pixels inside the viewer edge. Only stretch when already at
  // docked (full) height so Undock cannot be overwritten back to full-size.
  const isSideDocked =
    (isDockedLeft || isDockedRight) && height >= containerHeight - 1

  const nextLeft = isDockedLeft
    ? left
    : isDockedRight
      ? Math.max(left, right - width)
      : clamp(rect.left, left, Math.max(left, right - width))
  const nextTop = isSideDocked
    ? top
    : clamp(rect.top, top, Math.max(top, bottom - height))
  const nextHeight = isSideDocked ? containerHeight : height

  paletteElement.style.left = `${nextLeft}px`
  paletteElement.style.top = `${nextTop}px`
  paletteElement.style.width = `${width}px`
  paletteElement.style.height = `${nextHeight}px`
  paletteElement.style.maxHeight = `${containerHeight}px`
  paletteElement.style.maxWidth = `${containerWidth}px`
}

const baseTabNames = [
  'layerManager',
  'entityProperties',
  'countList',
  'blocks',
  'missingResources',
  'memoryProfile'
] as const
const tabNames = computed((): readonly string[] => {
  if (store.features.agentPlugin) {
    return [...baseTabNames, 'agent']
  }
  return baseTabNames
})

const tabs = computed<MlOverflowTab[]>(() => {
  return tabNames.value.map(name => {
    return {
      name,
      label: toolPaletteTabName(name)
    }
  })
})

const activeTabTitle = computed(() => {
  return toolPaletteTitle(store.dialogs.activePaletteTab)
})

watch(
  [() => store.dialogs.activePaletteTab, tabNames],
  ([activeTab, names]) => {
    if (!names.includes(activeTab)) {
      store.dialogs.activePaletteTab = names[0]
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
  overflow: hidden;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.ml-count-list-wrapper {
  overflow: hidden;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.ml-missing-resources-wrapper {
  overflow: hidden;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.ml-memory-profile-wrapper {
  overflow: hidden;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.ml-blocks-palette-wrapper {
  overflow: hidden;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.ml-agent-palette-wrapper {
  overflow: hidden;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.ml-agent-palette-wrapper :deep(.cad-agent-panel-root) {
  flex: 1;
  min-height: 0;
}
</style>
