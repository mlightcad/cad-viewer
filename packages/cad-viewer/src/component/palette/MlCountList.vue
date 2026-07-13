<template>
  <div class="ml-count-list">
    <div class="ml-count-list-toolbar">
      <div class="ml-count-list-search-row">
        <el-input
          v-model="search"
          clearable
          size="small"
          class="ml-count-list-search"
          :placeholder="t('main.toolPalette.countList.searchPlaceholder')"
        />
        <el-button
          size="small"
          :type="hasCountArea ? 'primary' : 'default'"
          :title="t('main.toolPalette.countList.countInArea')"
          :aria-label="t('main.toolPalette.countList.countInArea')"
          @click="handleCountArea"
        >
          <el-icon><Crop /></el-icon>
        </el-button>
      </div>
    </div>

    <el-table
      :data="groups"
      class="ml-count-list-table"
      size="small"
      highlight-current-row
      table-layout="fixed"
      :empty-text="t('main.toolPalette.countList.empty')"
      @row-click="handleRowClick"
    >
      <el-table-column
        prop="label"
        :label="t('main.toolPalette.countList.blockName')"
        min-width="80"
        sortable
        :show-overflow-tooltip="{ showAfter: 2000 }"
      />
      <el-table-column
        prop="count"
        :label="t('main.toolPalette.countList.count')"
        width="88"
        align="right"
        header-align="right"
        sortable
      />
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { Crop } from '@element-plus/icons-vue'
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { AcGeBox2d } from '@mlightcad/data-model'
import {
  ElButton,
  ElIcon,
  ElInput,
  ElMessage,
  ElTable,
  ElTableColumn
} from 'element-plus'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  buildCountListGroups,
  collectCountListInstances,
  type MlCountListGroup,
  promptCountListArea,
  selectCountListInstances,
  zoomToCountListInstances
} from '../../composable/useCountList'
import { useDocument } from '../../composable/useDocument'

const { t } = useI18n()
const { fileName, docTitle } = useDocument()

const search = ref('')
const countArea = ref<AcGeBox2d | null>(null)
const hasCountArea = ref(false)
const groups = ref<MlCountListGroup[]>([])
let refreshTimer: ReturnType<typeof setTimeout> | null = null

const refresh = () => {
  const instances = collectCountListInstances(
    hasCountArea.value ? countArea.value : null
  )
  groups.value = buildCountListGroups(instances, search.value)
}

const scheduleRefresh = () => {
  if (refreshTimer) clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    refresh()
    refreshTimer = null
  }, 50)
}

const handleRowClick = (row: MlCountListGroup) => {
  const ids = row.instances.map(item => item.id)
  selectCountListInstances(ids)
  zoomToCountListInstances(
    ids,
    row.instances.map(item => ({ x: item.position.x, y: item.position.y }))
  )
}

const handleCountArea = async () => {
  const area = await promptCountListArea(
    t('main.toolPalette.countList.prompt.firstCorner'),
    t('main.toolPalette.countList.prompt.secondCorner')
  )
  if (area === undefined) return

  if (area === null) {
    countArea.value = null
    hasCountArea.value = false
  } else {
    countArea.value = area
    hasCountArea.value = true
  }
  refresh()
  ElMessage({
    message: hasCountArea.value
      ? t('main.toolPalette.countList.areaSet')
      : t('main.toolPalette.countList.areaCleared'),
    type: 'success',
    grouping: true
  })
}

watch(search, () => {
  scheduleRefresh()
})

watch([fileName, docTitle], () => {
  hasCountArea.value = false
  countArea.value = null
  scheduleRefresh()
})

onMounted(() => {
  refresh()
  const events = AcApDocManager.instance.events
  events.documentActivated.addEventListener(scheduleRefresh)
})

onUnmounted(() => {
  if (refreshTimer) clearTimeout(refreshTimer)
  const events = AcApDocManager.instance.events
  events.documentActivated.removeEventListener(scheduleRefresh)
})
</script>

<style scoped>
.ml-count-list {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  gap: 8px;
  padding: 8px;
  box-sizing: border-box;
}

.ml-count-list-toolbar {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

.ml-count-list-search-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ml-count-list-search {
  flex: 1;
  min-width: 0;
}

.ml-count-list-table {
  flex: 1;
  min-height: 0;
  width: 100%;
}

.ml-count-list-table :deep(.el-table__inner-wrapper) {
  height: 100%;
}

.ml-count-list-table :deep(.el-table__header .cell) {
  display: flex;
  align-items: center;
  white-space: nowrap;
  line-height: 1.2;
}

.ml-count-list-table :deep(.el-table__header th.is-right .cell) {
  justify-content: flex-end;
}

.ml-count-list-table :deep(.el-table__header .cell .caret-wrapper) {
  flex-shrink: 0;
  height: 14px;
  width: 14px;
}

/* Keep Count column visible; Block absorbs width reduction. */
.ml-count-list-table :deep(.el-table__body .el-table__cell:first-child .cell) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
