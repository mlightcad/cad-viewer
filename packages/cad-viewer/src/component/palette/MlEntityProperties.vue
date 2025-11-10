<template>
  <div class="ml-entity-properties">
    <!-- Dropdown for multiple entities -->
    <div
      v-if="entityPropsList && entityPropsList.length > 1"
      class="ml-entity-selector"
    >
      <el-select
        v-model="selectedIndex"
        placeholder="Select Entity"
        size="small"
        style="width: 100%; margin-bottom: 0.5rem"
      >
        <el-option
          :label="t('main.toolPalette.entityProperties.propertyPanel.multipleEntitySelected', { count: entityPropsList.length})"
          :value="-1"
        />
        <el-option
          v-for="(item, idx) in entityPropsList"
          :key="idx"
          :label="item.type"
          :value="idx"
        />
      </el-select>
    </div>

    <!-- Properties Table -->
    <el-table
      v-if="tableRows.length"
      :data="tableRows"
      row-key="id"
      border
      size="small"
      default-expand-all
      :tree-props="{ children: 'children', hasChildren: 'children' }"
      :show-header="false"
      :span-method="spanMethod"
      class="ml-entity-properties-table"
    >
      <!-- Label / Group -->
      <el-table-column prop="label" width="100">
        <template #default="{ row }">
          <div class="ml-cell-container">
            <div :class="['ml-cell-label', { 'ml-group-row': row.isGroup }]">
              <strong v-if="row.isGroup">{{ entityProp(row.label) }}</strong>
              <span v-else>{{ entityProp(row.label) }}</span>
            </div>
          </div>
        </template>
      </el-table-column>

      <!-- Value -->
      <el-table-column>
        <template #default="{ row }">
          <div class="ml-cell-value" v-if="!row.isGroup">
            <!-- Enum -->
            <el-select
              v-if="row.type === 'enum'"
              :model-value="row.accessor.get()"
              :disabled="!row.editable || !editable"
              size="small"
              style="width: 100%"
              @change="(v: unknown) => onPropertyChange(row, v)"
            >
              <el-option
                v-for="opt in row.options || []"
                :key="opt.value"
                :label="opt.label"
                :value="opt.value"
              />
            </el-select>

            <!-- Color -->
            <el-color-picker
              v-else-if="row.type === 'color'"
              :model-value="row.accessor.get()"
              :disabled="!row.editable || !editable"
              size="small"
              @change="(v: unknown) => onPropertyChange(row, v)"
            />

            <!-- Boolean -->
            <el-switch
              v-else-if="row.type === 'boolean'"
              :model-value="row.accessor.get()"
              :disabled="!row.editable || !editable"
              @change="(v: boolean) => onPropertyChange(row, v)"
            />

            <!-- Int -->
            <el-input-number
              v-else-if="row.type === 'int'"
              :model-value="row.accessor.get()"
              :disabled="!row.editable || !editable"
              size="small"
              :step="1"
              :precision="0"
              @change="(v: number) => onPropertyChange(row, v)"
            />

            <!-- Float -->
            <el-input-number
              v-else-if="row.type === 'float'"
              :model-value="row.accessor.get()"
              :disabled="!row.editable || !editable"
              size="small"
              :step="0.1"
              :precision="3"
              @change="(v: number) => onPropertyChange(row, v)"
            />

            <!-- String -->
            <el-input
              v-else
              :model-value="row.accessor.get()"
              :disabled="!row.editable || !editable"
              size="small"
              @input="(v: string) => onPropertyChange(row, v)"
            />
          </div>
        </template>
      </el-table-column>
    </el-table>

    <div v-else class="ml-no-entity-selected">
      {{ t('main.toolPalette.entityProperties.propertyPanel.noEntitySelected') }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  AcDbEntityProperties,
  AcDbEntityPropertyGroup,
  AcDbEntityRuntimeProperty
} from '@mlightcad/data-model'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { entityProp } from '../../locale'

const { t } = useI18n()

/**
 * Props
 */
const props = defineProps<{
  entityPropsList?: AcDbEntityProperties[] | null
  editable?: boolean
}>()

/**
 * Emits event (optional)
 */
const emit = defineEmits<{
  (
    e: 'update-property',
    payload: {
      groupName: string
      propertyName: string
      newValue: unknown
    }
  ): void
}>()

/**
 * Dropdown selection index:
 * -1 → show common properties
 * >=0 → show the selected entity
 */
const selectedIndex = ref(-1)

/**
 * Display row types
 */
interface MlDisplayRowBase {
  id: string
  isGroup: boolean
  label: string
}

type MlDisplayPropertyRow = MlDisplayRowBase & AcDbEntityRuntimeProperty
type MlDisplayGroupRow = MlDisplayRowBase & {
  isGroup: true
  children: MlDisplayPropertyRow[]
}
type MlDisplayRow = MlDisplayGroupRow | MlDisplayPropertyRow

/**
 * Compute table rows
 */
const tableRows = computed<MlDisplayRow[]>(() => {
  const list = props.entityPropsList
  if (!list || list.length === 0) return []

  // Only one entity → show all
  if (list.length === 1) return toRows(list[0])

  // Multiple entities
  if (selectedIndex.value >= 0) {
    // Specific entity selected
    const selected = list[selectedIndex.value]
    return toRows(selected)
  } else {
    // Show common properties across all
    const commonProps = findCommonProperties(list)
    return toRows(commonProps)
  }
})

/**
 * Convert entityProps to table rows
 */
function toRows(entityProps: AcDbEntityProperties): MlDisplayRow[] {
  return entityProps.groups.map((group, gi) => ({
    id: `group-${gi}`,
    label: group.groupName,
    isGroup: true,
    children: group.properties.map((p, pi) => ({
      ...p,
      id: `group-${gi}-prop-${pi}`,
      isGroup: false
    }))
  }))
}

/**
 * Find properties that have identical values across all entities
 */
 function findCommonProperties(list: AcDbEntityProperties[]): AcDbEntityProperties {
  if (!list.length) return { type: '', groups: [] }

  // Start from the first entity's groups
  const first = list[0]
  const commonGroups: AcDbEntityPropertyGroup[] = []

  for (const group of first.groups) {
    const commonProps: AcDbEntityRuntimeProperty[] = []

    for (const prop of group.properties) {
      const hasSameValueInAll = list.every(ent => {
        const g = ent.groups.find(g2 => g2.groupName === group.groupName)
        const p = g?.properties.find(p2 => p2.name === prop.name)
        return p && p.accessor.get() === prop.accessor.get()
      })

      if (hasSameValueInAll) {
        commonProps.push(prop)
      }
    }

    if (commonProps.length) {
      commonGroups.push({
        groupName: group.groupName,
        properties: commonProps
      })
    }
  }

  return {
    type: first.type,
    groups: commonGroups
  }
}

/**
 * span-method for group rows
 */
const spanMethod = ({
  row,
  columnIndex
}: {
  row: MlDisplayRow
  columnIndex: number
}) => {
  if (row.isGroup) {
    return columnIndex === 0 ? [1, 2] : [0, 0]
  }
  return [1, 1]
}

/**
 * Handle property change (direct call to accessor.set)
 */
function onPropertyChange(row: MlDisplayPropertyRow, newValue: unknown) {
  if (!props.editable || !props.entityPropsList?.length) return

  const current =
    selectedIndex.value >= 0
      ? props.entityPropsList[selectedIndex.value]
      : props.entityPropsList[0]

  const group = current.groups.find(g =>
    g.properties.some(p => p.name === row.name)
  )
  if (!group) return

  emit('update-property', {
    groupName: group.groupName,
    propertyName: row.label,
    newValue
  })
}
</script>

<style scoped>
::v-deep(.el-table__placeholder) {
  width: 0px;
}

::v-deep(.el-table .cell) {
  display: flex;
}

.ml-entity-properties {
  padding: 5px;
}

.ml-entity-properties-table {
  width: 100%;
}


.ml-cell-container {
  display: flex;
  align-items: center;
  line-height: 1;
}

.ml-cell-label {
  font-weight: normal;
}

.ml-group-row {
  font-weight: 600;
}

.ml-cell-value {
  width: 100%;
}

.ml-no-entity-selected {
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  font-style: italic;
  font-size: 0.875rem;
  padding: 0.5rem;
}
</style>
