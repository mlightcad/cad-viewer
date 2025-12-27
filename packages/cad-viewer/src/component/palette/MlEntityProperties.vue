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
        style="width: 100%; margin-bottom: 0.5rem"
      >
        <el-option
          :label="
            t(
              'main.toolPalette.entityProperties.propertyPanel.multipleEntitySelected',
              { count: entityPropsList.length }
            )
          "
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
      default-expand-all
      :tree-props="{ children: 'children', hasChildren: 'children' }"
      :show-header="false"
      :span-method="spanMethod"
      class="ml-entity-properties-table"
    >
      <!-- Label -->
      <el-table-column prop="name">
        <template #default="{ row }">
          <div class="ml-cell-container">
            <div :class="['ml-cell-label', { 'ml-group-row': row.isGroup }]">
              <strong v-if="row.isGroup">{{ entityPropName(row.name) }}</strong>
              <span v-else>{{ entityPropName(row.name) }}</span>
            </div>
          </div>
        </template>
      </el-table-column>

      <!-- Value -->
      <el-table-column>
        <template #default="{ row }">
          <div class="ml-cell-value" v-if="!row.isGroup">
            <!-- ===== Readonly ===== -->
            <template
              v-if="!row.__isArrayIndex && (!editable || !row.editable)"
            >
              <ml-color-dropdown
                v-if="row.type === 'color'"
                :model-value="row.accessor.get()"
                disabled
              />
              <span
                v-else
                :title="formatDisplayValue(row)"
                class="ml-readonly-value"
                @dblclick="copyReadonlyValue(row)"
              >
                {{ formatDisplayValue(row) }}
              </span>
            </template>

            <!-- ===== Editable ===== -->
            <template v-else>
              <el-select
                v-if="row.type === 'enum'"
                :model-value="row.accessor.get()"
                @change="(v: string | number) => onPropertyChange(row, v)"
              >
                <el-option
                  v-for="opt in row.options || []"
                  :key="opt.value"
                  :label="entityPropEnum(opt.label)"
                  :value="opt.value"
                />
              </el-select>

              <ml-color-dropdown
                v-else-if="row.type === 'color'"
                :model-value="row.accessor.get()"
                @color-change="(v: AcCmColor) => onPropertyChange(row, v)"
              />

              <el-switch
                v-else-if="row.type === 'boolean'"
                :model-value="row.accessor.get()"
                @change="(v: boolean) => onPropertyChange(row, v)"
              />

              <el-input-number
                v-else-if="row.type === 'int'"
                controls-position="right"
                :model-value="row.accessor.get()"
                :min="row.__min"
                :max="row.__max"
                :step="1"
                :precision="0"
                @change="
                  (v: number) => {
                    if (row.__isArrayIndex) {
                      row.accessor.set?.(v)
                    } else {
                      onPropertyChange(row, v)
                    }
                  }
                "
              />

              <el-input-number
                v-else-if="row.type === 'float'"
                controls-position="right"
                :model-value="row.accessor.get()"
                :step="0.1"
                :precision="3"
                @change="(v: number) => onPropertyChange(row, v)"
              />

              <el-input
                v-else
                :model-value="row.accessor.get()"
                @input="(v: string) => onPropertyChange(row, v)"
              />
            </template>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <div v-else class="ml-no-entity-selected">
      {{
        t('main.toolPalette.entityProperties.propertyPanel.noEntitySelected')
      }}
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  AcCmColor,
  AcCmTransparency,
  AcDbEntityProperties,
  AcDbEntityPropertyGroup,
  AcDbEntityRuntimeProperty,
  AcGiLineWeight
} from '@mlightcad/data-model'
import { ElMessage } from 'element-plus'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { entityPropEnum, entityPropName } from '../../locale'
import { MlColorDropdown } from '../common'

const { t } = useI18n()

/* ================= props / emits ================= */

const props = defineProps<{
  entityPropsList?: AcDbEntityProperties[] | null
  editable?: boolean
}>()

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

/* ================= state ================= */

const selectedIndex = ref(-1)
const arrayIndexMap = ref<Record<string, number>>({})

/**
 * 🔑 Forces rebuild of array property rows
 */
const arrayRebuildVersion = ref(0)

/* ================= row types ================= */

interface MlDisplayRowBase {
  id: string
  name: string
  isGroup: boolean
}

type MlDisplayPropertyRow = MlDisplayRowBase &
  AcDbEntityRuntimeProperty & {
    __groupName?: string
    __min?: number
    __max?: number
    __isArrayIndex?: boolean
  }

type MlDisplayGroupRow = MlDisplayRowBase & {
  isGroup: true
  children: MlDisplayPropertyRow[]
}

type MlDisplayRow = MlDisplayGroupRow | MlDisplayPropertyRow

/* ================= helpers ================= */

function isArrayProperty(p: AcDbEntityRuntimeProperty): boolean {
  return p.type === 'array' && !!p.itemSchema
}

function arrayKey(group: string, prop: string) {
  return `${group}.${prop}`
}

/* ================= formatting ================= */

function formatDisplayValue(row: MlDisplayPropertyRow): string {
  const v = row.accessor.get()
  switch (row.type) {
    case 'boolean':
      return v ? 'True' : 'False'
    case 'enum':
      return entityPropEnum(row.options?.find(o => o.value === v)?.label ?? '')
    case 'color':
      return (v as AcCmColor).toString()
    case 'lineweight':
      return AcGiLineWeight[v as number]
    case 'transparency':
      return (v as AcCmTransparency).toString()
    default:
      return v != null ? String(v) : ''
  }
}

async function copyReadonlyValue(row: MlDisplayPropertyRow) {
  const value = formatDisplayValue(row)

  try {
    await navigator.clipboard.writeText(value)
    ElMessage({
      message: t(
        'main.toolPalette.entityProperties.propertyPanel.propValCopied'
      ),
      grouping: true,
      type: 'success'
    })
  } catch (e) {
    console.error(e)
    ElMessage({
      message: t(
        'main.toolPalette.entityProperties.propertyPanel.failedToCopyPropVal'
      ),
      grouping: true,
      type: 'error'
    })
  }
}

/* ================= rows ================= */

const tableRows = computed<MlDisplayRow[]>(() => {
  // 🔑 dependency to force rebuild when array index changes
  arrayRebuildVersion.value

  const list = props.entityPropsList
  if (!list?.length) return []

  const entity =
    list.length === 1
      ? list[0]
      : selectedIndex.value >= 0
        ? list[selectedIndex.value]
        : findCommonProperties(list)

  return expandEntity(entity)
})

function expandEntity(entity: AcDbEntityProperties): MlDisplayRow[] {
  return entity.groups.map((group, gi) => {
    const children: MlDisplayPropertyRow[] = []

    group.properties.forEach((prop, pi) => {
      if (!isArrayProperty(prop)) {
        children.push({
          ...prop,
          id: `g-${gi}-p-${pi}`,
          isGroup: false,
          __groupName: group.groupName
        })
        return
      }

      const arr = prop.accessor.get() as unknown[]
      const key = arrayKey(group.groupName, prop.name)

      if (!arrayIndexMap.value[key]) arrayIndexMap.value[key] = 1

      arrayIndexMap.value[key] = Math.min(
        Math.max(1, arrayIndexMap.value[key]),
        arr.length
      )

      /* ===== index row (always editable) ===== */
      children.push({
        id: `g-${gi}-p-${pi}-index`,
        name: prop.name,
        type: 'int',
        editable: true,
        isGroup: false,
        __groupName: group.groupName,
        __isArrayIndex: true,
        __min: 1,
        __max: arr.length,
        accessor: {
          get: () => arrayIndexMap.value[key],
          set: (v: number) => {
            const newIndex = Math.min(Math.max(1, v), arr.length)
            if (arrayIndexMap.value[key] !== newIndex) {
              arrayIndexMap.value[key] = newIndex
              arrayRebuildVersion.value++ // 🔥 force rebuild
            }
          }
        }
      } as MlDisplayPropertyRow)

      const element = arr[arrayIndexMap.value[key] - 1] as Record<string, unknown>
      if (!element) return

      /* ===== element property rows ===== */
      if (prop.itemSchema) {
        for (const itemProp of prop.itemSchema.properties) {
          children.push({
            id: `g-${gi}-p-${pi}-${itemProp.name}`,
            name: itemProp.name,
            type: itemProp.type,
            editable: itemProp.editable,
            isGroup: false,
            __groupName: group.groupName,
            accessor: {
              get: () => element[itemProp.name],
              set: (v: unknown) => {
                element[itemProp.name] = v
              }
            }
          })
        }        
      }
    })

    return {
      id: `group-${gi}`,
      name: group.groupName,
      isGroup: true,
      children
    }
  })
}

/* ================= common props ================= */

function findCommonProperties(
  list: AcDbEntityProperties[]
): AcDbEntityProperties {
  const first = list[0]
  const groups: AcDbEntityPropertyGroup[] = []

  for (const g of first.groups) {
    const props: AcDbEntityRuntimeProperty[] = []

    for (const p of g.properties) {
      if (
        list.every(ent => {
          const gp = ent.groups
            .find(x => x.groupName === g.groupName)
            ?.properties.find(x => x.name === p.name)
          return gp && gp.accessor.get() === p.accessor.get()
        })
      ) {
        props.push(p)
      }
    }

    if (props.length) groups.push({ groupName: g.groupName, properties: props })
  }

  return { type: first.type, groups }
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
  if (row.__isArrayIndex) return

  emit('update-property', {
    groupName: row.__groupName ?? '',
    propertyName: row.name,
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

::v-deep(.ml-cell-value > *) {
  width: 100%;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ml-group-row {
  font-weight: 600;
}

.ml-cell-value {
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ml-readonly-value {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
