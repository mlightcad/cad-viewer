<template>
  <div class="ml-measurement-palette">
    <div class="ml-measurement-palette-toolbar">
      <el-select
        v-model="activeFilter"
        class="ml-measurement-palette-filter"
        size="small"
      >
        <el-option
          :label="t('main.toolPalette.measurements.filterAll')"
          value=""
        />
        <el-option
          v-for="type in filterTypes"
          :key="type"
          :label="typeLabel(type)"
          :value="type"
        />
      </el-select>
      <el-button
        size="small"
        :disabled="measurements.length === 0"
        @click="clearAll"
      >
        {{ t('main.toolPalette.measurements.clear') }}
      </el-button>
    </div>

    <el-table
      :data="filtered"
      class="ml-measurement-palette-table"
      size="small"
      highlight-current-row
      table-layout="fixed"
      :current-row-key="selectedId"
      row-key="id"
      :empty-text="t('main.toolPalette.measurements.empty')"
      @row-click="handleRowClick"
    >
      <el-table-column
        prop="type"
        :label="t('main.toolPalette.measurements.type')"
        width="96"
      >
        <template #default="{ row }">
          {{ typeLabel(row.type) }}
        </template>
      </el-table-column>
      <el-table-column
        :label="t('main.toolPalette.measurements.value')"
        min-width="120"
        :show-overflow-tooltip="{ showAfter: 1000 }"
      >
        <template #default="{ row }">
          {{ valueById[row.id] || '—' }}
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import type {
  AcApMeasurementRecord,
  AcApMeasurementType
} from '@mlightcad/cad-simple-viewer'
import {
  ElButton,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn
} from 'element-plus'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useMeasurement } from '../../composable/useMeasurement'

const FILTER_TYPES: readonly AcApMeasurementType[] = [
  'distance',
  'angle',
  'area',
  'arc',
  'point'
]

const { t } = useI18n()
const activeFilter = ref<AcApMeasurementType | ''>('')
const { measurements, selectedId, valueById, focus, clearAll } =
  useMeasurement()

const filterTypes = FILTER_TYPES

const filtered = computed(() => {
  if (!activeFilter.value) return measurements.value
  return measurements.value.filter(record => record.type === activeFilter.value)
})

const handleRowClick = (row: AcApMeasurementRecord) => {
  focus(row)
}

const typeLabel = (type: AcApMeasurementType) => {
  switch (type) {
    case 'distance':
      return t('main.toolPalette.measurements.typeValues.distance')
    case 'angle':
      return t('main.toolPalette.measurements.typeValues.angle')
    case 'area':
      return t('main.toolPalette.measurements.typeValues.area')
    case 'arc':
      return t('main.toolPalette.measurements.typeValues.arc')
    case 'point':
      return t('main.toolPalette.measurements.typeValues.point')
  }
}
</script>

<style scoped>
.ml-measurement-palette {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 8px;
  padding: 8px;
  box-sizing: border-box;
}

.ml-measurement-palette-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
}

.ml-measurement-palette-filter {
  flex: 1;
  min-width: 0;
}

.ml-measurement-palette-table {
  flex: 1;
  min-height: 120px;
}
</style>
