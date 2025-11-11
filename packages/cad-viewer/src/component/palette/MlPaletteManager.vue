<template>
  <ml-tool-palette
    class="ml-layer-manager"
    v-model="store.dialogs.layerManager"
    v-model:active-tab="activeTab"
    :tabs="tabs"
    :bottom-offset="30"
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
</template>

<script setup lang="ts">
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { AcDbEntityProperties } from '@mlightcad/data-model'
import { MlToolPalette, MlToolPaletteTab } from '@mlightcad/ui-components'
import { computed, ref } from 'vue'

import { store } from '../../app'
import { useSelectionSet } from '../../composable'
import { toolPaletteTabName, toolPaletteTitle } from '../../locale'
import MlEntityProperties from './MlEntityProperties.vue'
import MlLayerList from './MlLayerList.vue'

/**
 * Properties of MlLayerList component
 */
interface Props {
  /**
   * Current editor
   */
  editor: AcApDocManager
}

const props = defineProps<Props>()

const tabNames = ['layerManager', 'entityProperties']
const activeTab = ref<string>(tabNames[0])
const tabs = computed<MlToolPaletteTab[]>(() => {
  return tabNames.map(name => {
    return {
      name,
      label: toolPaletteTabName(name),
      title: toolPaletteTitle(name)
    }
  })
})

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
  left: 2px;
  top: 55px;
  width: 400px;
  height: 500px;
}

.ml-layer-list-wrapper {
  overflow: auto;
  width: 100%;
  display: flex;
  align-items: flex-start; /* Align items at the top */
  justify-content: flex-start; /* Align items to the left */
}
</style>
