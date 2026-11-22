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
      <el-table-column
        prop="name"
        :show-overflow-tooltip="{ placement: 'top-start', showAfter: 2000 }"
      >
        <template #default="{ row }">
          <div class="ml-cell-container">
            <div :class="['ml-cell-label', { 'ml-group-row': row.isGroup }]">
              <strong v-if="row.isGroup">{{ entityPropName(row.name) }}</strong>
              <span v-else>{{ getPropertyName(row) }}</span>
            </div>
          </div>
        </template>
      </el-table-column>

      <!-- Value -->
      <el-table-column>
        <template #default="{ row }">
          <div
            class="ml-cell-value"
            v-if="!row.isGroup"
            :key="`${row.id}:${commitVersion}`"
          >
            <!-- ===== Readonly ===== -->
            <!-- Plain text only: no dropdown/editors (incl. disabled color). -->
            <template v-if="!isRowEditable(row)">
              <span
                :title="formatDisplayValue(row)"
                class="ml-readonly-value"
                @dblclick="copyReadonlyValue(row)"
              >
                {{ formatDisplayValue(row) }}
              </span>
            </template>

            <!-- ===== Editable ===== -->
            <template v-else>
              <ml-hatch-pattern-dropdown
                v-if="isHatchPatternField(row)"
                :model-value="String(row.accessor.get() ?? '')"
                @update:modelValue="(v: string) => onPropertyChange(row, v)"
              />

              <el-select
                v-else-if="row.type === 'enum'"
                :model-value="row.accessor.get()"
                @change="(v: string | number) => onPropertyChange(row, v)"
              >
                <el-option
                  v-for="opt in row.options || []"
                  :key="String(opt.value)"
                  :label="entityPropEnum(opt.label)"
                  :value="opt.value"
                />
              </el-select>

              <ml-color-dropdown
                v-else-if="row.type === 'color'"
                :model-value="row.accessor.get()"
                @update:modelValue="
                  (v: AcCmColor | undefined) => onPropertyChange(row, v)
                "
              />

              <el-select
                v-else-if="row.type === 'layer'"
                :model-value="row.accessor.get()"
                filterable
                @change="(v: string) => onPropertyChange(row, v)"
              >
                <el-option
                  v-for="name in layerNames"
                  :key="name"
                  :label="name"
                  :value="name"
                />
              </el-select>

              <ml-line-type-select
                v-else-if="row.type === 'linetype'"
                :model-value="row.accessor.get()"
                :options="lineTypeOptions"
                @change="(v: string) => onPropertyChange(row, v)"
              />

              <ml-line-weight-select
                v-else-if="row.type === 'lineweight'"
                :model-value="row.accessor.get()"
                @change="(v: AcGiLineWeight) => onPropertyChange(row, v)"
              />

              <el-select
                v-else-if="row.type === 'transparency'"
                :model-value="transparencyKey(row.accessor.get())"
                filterable
                allow-create
                default-first-option
                @change="(v: string) => onTransparencyChange(row, v)"
              >
                <el-option
                  v-for="opt in transparencyOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>

              <el-switch
                v-else-if="row.type === 'boolean'"
                :model-value="!!row.accessor.get()"
                @change="
                  (v: string | number | boolean) => onPropertyChange(row, !!v)
                "
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
                  (v: number | undefined) => {
                    if (v == null) return
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
                @change="
                  (v: number | undefined) => {
                    if (v != null) onPropertyChange(row, v)
                  }
                "
              />

              <!-- Commit on Enter/blur so one edit is one undo step. -->
              <el-input
                v-else
                :model-value="
                  drafts[row.id] ?? String(row.accessor.get() ?? '')
                "
                @update:modelValue="(v: string) => (drafts[row.id] = v)"
                @change="(v: string) => onPropertyChange(row, v)"
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
  AcGiLineWeight,
  log
} from '@mlightcad/data-model'
import {
  ElInput,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn
} from 'element-plus'
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { colorName, entityPropEnum, entityPropName } from '../../locale'
import {
  MlColorDropdown,
  MlHatchPatternDropdown,
  MlLineTypeSelect,
  MlLineWeightSelect
} from '../common'
import type { LineTypeOption } from '../common/lineTypeOptions'
import type { MlEntityPropertyUpdate } from './entityPropertyEdit'

const { t } = useI18n()

/* ================= props / emits ================= */

const props = defineProps<{
  entityPropsList?: AcDbEntityProperties[] | null
  /** Whether properties may be edited at all (the document is writable). */
  editable?: boolean
  /**
   * Lock state aligned with `entityPropsList`.
   * The common row is read-only when any entry is locked. A single entity row
   * follows that entity.
   */
  entityLocked?: boolean[]
  /** Layer names offered by the layer editor. */
  layerNames?: string[]
  /** Line types offered by the linetype editor. */
  lineTypeOptions?: LineTypeOption[]
}>()

const emit = defineEmits<{
  (e: 'update-property', payload: MlEntityPropertyUpdate): void
}>()

/* ================= state ================= */

const selectedIndex = ref(-1)
const arrayIndexMap = ref<Record<string, number>>({})

/**
 * 🔑 Forces rebuild of array property rows
 */
const arrayRebuildVersion = ref(0)

/**
 * Bumped after every committed edit so value editors remount and show what
 * the entity really holds (an edit may be rejected or normalized).
 */
const commitVersion = ref(0)

/** Uncommitted text of string editors, keyed by row id. */
const drafts = reactive<Record<string, string | undefined>>({})

const layerNames = computed(() => props.layerNames ?? [])
const lineTypeOptions = computed(() => props.lineTypeOptions ?? [])

const editsLocked = computed(() => {
  const flags = props.entityLocked
  if (!flags?.length) return false
  const count = props.entityPropsList?.length ?? 0
  if (count <= 1) return !!flags[0]
  if (selectedIndex.value >= 0) return !!flags[selectedIndex.value]
  return flags.some(Boolean)
})

const activeEntityProperties = computed<AcDbEntityProperties | null>(() => {
  const list = props.entityPropsList
  if (!list?.length) return null

  return list.length === 1
    ? list[0]
    : selectedIndex.value >= 0
      ? list[selectedIndex.value]
      : findCommonProperties(list)
})

watch(
  () => props.entityPropsList?.length ?? 0,
  count => {
    if (selectedIndex.value >= count) selectedIndex.value = -1
  }
)

// Drafts belong to the rows of the entity they were typed for.
watch([activeEntityProperties, selectedIndex], () => {
  for (const key of Object.keys(drafts)) delete drafts[key]
})

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
    /** Set on rows that edit one field of one array item. */
    __arrayItem?: {
      property: AcDbEntityRuntimeProperty
      index: number
    }
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

/**
 * Whether a row shows an editor. Array index rows only page through items,
 * so they stay usable even when editing is not allowed.
 */
function isRowEditable(row: MlDisplayPropertyRow): boolean {
  if (row.__isArrayIndex) return true
  return (
    !!props.editable &&
    !editsLocked.value &&
    row.editable !== false &&
    (row.__arrayItem != null || row.accessor.set != null)
  )
}

/** Stable comparison key used to find values shared by all entities. */
function valueKey(value: unknown): unknown {
  return value != null && typeof value === 'object' ? String(value) : value
}

/* ================= transparency ================= */

const TRANSPARENCY_BY_LAYER = 'ByLayer'
const TRANSPARENCY_BY_BLOCK = 'ByBlock'

const transparencyOptions = computed(() => [
  { value: TRANSPARENCY_BY_LAYER, label: colorName(TRANSPARENCY_BY_LAYER) },
  { value: TRANSPARENCY_BY_BLOCK, label: colorName(TRANSPARENCY_BY_BLOCK) },
  ...[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map(value => ({
    value: String(value),
    label: String(value)
  }))
])

/** Editor value of a transparency: ByLayer, ByBlock or a 0–90 percentage. */
function transparencyKey(value: unknown): string {
  const transparency = value as AcCmTransparency | undefined
  if (!transparency || transparency.isByLayer) return TRANSPARENCY_BY_LAYER
  if (transparency.isByBlock) return TRANSPARENCY_BY_BLOCK
  return String(transparency.percentage ?? 0)
}

function onTransparencyChange(row: MlDisplayPropertyRow, value: string) {
  const text = String(value).trim()
  if (text === TRANSPARENCY_BY_LAYER || text === TRANSPARENCY_BY_BLOCK) {
    onPropertyChange(row, AcCmTransparency.fromString(text))
    return
  }
  const percentage = Number(text)
  // AutoCAD accepts 0–90 percent.
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 90) {
    commitVersion.value++
    return
  }
  const transparency = new AcCmTransparency()
  transparency.percentage = Math.round(percentage)
  onPropertyChange(row, transparency)
}

/* ================= formatting ================= */

function getPropertyName(row: MlDisplayPropertyRow): string {
  return row.skipTranslation ? row.name : entityPropName(row.name)
}

function formatDisplayValue(row: MlDisplayPropertyRow): string {
  const v = row.accessor.get()
  switch (row.type) {
    case 'boolean':
      return v ? 'True' : 'False'
    case 'enum':
      return entityPropEnum(row.options?.find(o => o.value === v)?.label ?? '')
    case 'color':
      return v ? (v as AcCmColor).toString() : ''
    case 'lineweight':
      return AcGiLineWeight[v as number]
    case 'transparency': {
      const key = transparencyKey(v)
      return key === TRANSPARENCY_BY_LAYER || key === TRANSPARENCY_BY_BLOCK
        ? colorName(key)
        : key
    }
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
    log.error(e)
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

  const entity = activeEntityProperties.value
  if (!entity) return []
  return expandEntity(entity)
})

function isHatchPatternField(row: MlDisplayPropertyRow) {
  if (row.__isArrayIndex) return false
  if (activeEntityProperties.value?.type.toLowerCase() !== 'hatch') return false
  const propertyName = row.name.toLowerCase()
  return propertyName === 'patternname' || propertyName === 'pattern'
}

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

      const itemIndex = arrayIndexMap.value[key] - 1
      const element = arr[itemIndex] as Record<string, unknown>
      if (!element) return

      /* ===== element property rows ===== */
      if (prop.itemSchema) {
        for (const itemProp of prop.itemSchema.properties) {
          children.push({
            id: `g-${gi}-p-${pi}-${itemProp.name}`,
            name: itemProp.name,
            type: itemProp.type,
            options: itemProp.options,
            editable: !!prop.accessor.set && itemProp.editable !== false,
            isGroup: false,
            __groupName: group.groupName,
            __arrayItem: { property: prop, index: itemIndex },
            accessor: {
              get: () => element[itemProp.name]
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
      // Arrays are per entity; editing them for a selection makes no sense.
      if (p.type === 'array') continue
      const value = valueKey(p.accessor.get())
      const shared = list.every(ent => {
        const gp = ent.groups
          .find(x => x.groupName === g.groupName)
          ?.properties.find(x => x.name === p.name)
        return (
          gp &&
          gp.type === p.type &&
          (gp.editable !== false) === (p.editable !== false) &&
          valueKey(gp.accessor.get()) === value
        )
      })
      if (shared) props.push(p)
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
 * Emits an edit. The palette never writes to entities itself: the owner
 * applies the change inside an undoable database edit.
 */
function onPropertyChange(row: MlDisplayPropertyRow, newValue: unknown) {
  delete drafts[row.id]
  commitVersion.value++
  if (!isRowEditable(row) || row.__isArrayIndex) return

  const entityIndex =
    (props.entityPropsList?.length ?? 0) > 1 ? selectedIndex.value : 0

  const arrayItem = row.__arrayItem
  if (arrayItem) {
    const items = (arrayItem.property.accessor.get() as unknown[]).map(item =>
      item != null && typeof item === 'object' ? { ...item } : item
    ) as Record<string, unknown>[]
    if (!items[arrayItem.index]) return
    items[arrayItem.index][row.name] = newValue
    emit('update-property', {
      groupName: row.__groupName ?? '',
      propertyName: arrayItem.property.name,
      newValue: items,
      entityIndex
    })
    return
  }

  emit('update-property', {
    groupName: row.__groupName ?? '',
    propertyName: row.name,
    newValue,
    entityIndex
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
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  overflow-y: auto;
}

.ml-entity-properties-table {
  width: 100%;
  max-width: 100%;
}

.ml-entity-properties-table ::v-deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
}

.ml-entity-properties-table ::v-deep(.el-scrollbar__bar.is-horizontal) {
  display: none;
}

.ml-cell-container {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  line-height: 1;
}

.ml-cell-label {
  font-weight: normal;
  width: 100%;
  min-width: 0;
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
