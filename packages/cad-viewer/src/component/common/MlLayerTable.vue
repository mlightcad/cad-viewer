<template>
  <div class="ml-layer-table-wrap">
    <el-table
      :data="layers"
      class="ml-layer-table"
      border
      :row-key="getRowKey"
      highlight-current-row
      :row-class-name="getRowClassName"
      :current-row-key="selectedLayerName ?? undefined"
      @current-change="handleCurrentRowChange"
      @row-click="handleRowClick"
      @row-dblclick="handleRowDbClick"
    >
      <el-table-column
        property="name"
        :label="t('main.toolPalette.layerManager.layerList.name')"
        min-width="140"
        resizable
        sortable
        show-overflow-tooltip
      >
        <template #default="scope">
          <el-input
            v-if="scope.row.isDraft"
            ref="draftInputRef"
            :model-value="draftLayerName"
            size="small"
            class="ml-layer-table-name-input"
            :disabled="readonly"
            :placeholder="
              t('main.toolPalette.layerManager.layerList.newLayerPlaceholder')
            "
            @click.stop
            @update:model-value="emit('update:draftLayerName', $event)"
            @keydown.enter.prevent="emit('draft-commit')"
            @keydown.escape.prevent="emit('draft-cancel')"
            @blur="emit('draft-commit')"
          />
          <span v-else class="ml-layer-table-name">
            {{ scope.row.name }}
            <span
              v-if="scope.row.name === currentLayerName"
              class="ml-layer-table-current-marker"
              :title="t('main.toolPalette.layerManager.layerList.currentLayer')"
              aria-hidden="true"
            >
              *
            </span>
          </span>
        </template>
      </el-table-column>

      <el-table-column
        property="isOn"
        :label="t('main.toolPalette.layerManager.layerList.on')"
        width="40"
        resizable
        align="center"
      >
        <template #header>
          <div class="ml-layer-table-header-toggle">
            <el-checkbox
              :model-value="isAllOn"
              :indeterminate="isSomeOn"
              :disabled="readonly"
              :aria-label="t('main.toolPalette.layerManager.layerList.on')"
              @change="handleToggleAll"
            />
          </div>
        </template>
        <template #default="scope">
          <div class="ml-layer-table-cell">
            <button
              type="button"
              class="ml-layer-table-state-button"
              :disabled="readonly || scope.row.isDraft"
              :title="t('main.toolPalette.layerManager.layerList.on')"
              :aria-label="t('main.toolPalette.layerManager.layerList.on')"
              @click.stop="emitChange(scope.row, 'on', !scope.row.isOn)"
            >
              <span
                class="ml-layer-table-state-icon"
                :class="scope.row.isOn ? 'is-on' : 'is-off'"
                aria-hidden="true"
              >
                <component :is="layerLight" />
              </span>
            </button>
          </div>
        </template>
      </el-table-column>

      <el-table-column
        property="isFrozen"
        :label="t('main.toolPalette.layerManager.layerList.freeze')"
        width="48"
        resizable
        align="center"
      >
        <template #default="scope">
          <div class="ml-layer-table-cell">
            <button
              type="button"
              class="ml-layer-table-state-button"
              :disabled="readonly || scope.row.isDraft"
              :title="t('main.toolPalette.layerManager.layerList.freeze')"
              :aria-label="t('main.toolPalette.layerManager.layerList.freeze')"
              @click.stop="emitChange(scope.row, 'frozen', !scope.row.isFrozen)"
            >
              <span
                class="ml-layer-table-state-icon"
                :class="scope.row.isFrozen ? 'is-frozen' : 'is-unfrozen'"
                aria-hidden="true"
              >
                <component :is="layerSnow" v-if="scope.row.isFrozen" />
                <component :is="layerThawed" v-else />
              </span>
            </button>
          </div>
        </template>
      </el-table-column>

      <el-table-column
        property="isLocked"
        :label="t('main.toolPalette.layerManager.layerList.lock')"
        width="48"
        resizable
        align="center"
      >
        <template #default="scope">
          <div class="ml-layer-table-cell">
            <button
              type="button"
              class="ml-layer-table-state-button"
              :disabled="readonly || scope.row.isDraft"
              :title="t('main.toolPalette.layerManager.layerList.lock')"
              :aria-label="t('main.toolPalette.layerManager.layerList.lock')"
              @click.stop="emitChange(scope.row, 'locked', !scope.row.isLocked)"
            >
              <span
                class="ml-layer-table-state-icon"
                :class="scope.row.isLocked ? 'is-locked' : 'is-unlocked'"
                aria-hidden="true"
              >
                <component :is="layerLocker" v-if="scope.row.isLocked" />
                <component :is="layerUnlocked" v-else />
              </span>
            </button>
          </div>
        </template>
      </el-table-column>

      <el-table-column
        property="isPlottable"
        :label="t('main.toolPalette.layerManager.layerList.plot')"
        width="48"
        resizable
        align="center"
      >
        <template #default="scope">
          <div class="ml-layer-table-cell">
            <button
              type="button"
              class="ml-layer-table-state-button"
              :disabled="readonly || scope.row.isDraft"
              :title="t('main.toolPalette.layerManager.layerList.plot')"
              :aria-label="t('main.toolPalette.layerManager.layerList.plot')"
              @click.stop="
                emitChange(scope.row, 'plottable', !scope.row.isPlottable)
              "
            >
              <span
                class="ml-layer-table-state-icon ml-layer-table-plot-icon"
                :class="scope.row.isPlottable ? 'is-plottable' : 'is-no-plot'"
                aria-hidden="true"
              >
                <component :is="layerPlot" v-if="scope.row.isPlottable" />
                <component :is="layerNoPlot" v-else />
              </span>
            </button>
          </div>
        </template>
      </el-table-column>

      <el-table-column
        property="color"
        :label="t('main.toolPalette.layerManager.layerList.color')"
        width="75"
        resizable
        show-overflow-tooltip
      >
        <template #default="scope">
          <div
            class="ml-layer-table-cell ml-layer-table-color-cell"
            :class="{
              'ml-layer-table-color-cell--disabled':
                readonly || scope.row.isDraft
            }"
            @click.stop="openColorPicker(scope.row)"
          >
            <span
              class="ml-layer-table-color-swatch"
              :style="{ backgroundColor: scope.row.cssColor }"
            />
            <span class="ml-layer-table-color-name">
              {{ formatLayerColorName(scope.row) }}
            </span>
          </div>
        </template>
      </el-table-column>

      <el-table-column
        property="linetype"
        :label="t('main.toolPalette.layerManager.layerList.linetype')"
        min-width="130"
        resizable
        show-overflow-tooltip
      >
        <template #default="scope">
          <div
            v-if="readonly || scope.row.isDraft"
            class="ml-layer-table-cell ml-layer-table-text-cell"
          >
            {{ scope.row.linetype }}
          </div>
          <div
            v-else
            class="ml-layer-table-cell ml-layer-table-select-cell"
            @click.stop
          >
            <MlLineTypeSelect
              :model-value="scope.row.linetype"
              @change="emitChange(scope.row, 'linetype', $event)"
            />
          </div>
        </template>
      </el-table-column>

      <el-table-column
        property="lineWeight"
        :label="t('main.toolPalette.layerManager.layerList.lineweight')"
        min-width="120"
        resizable
        show-overflow-tooltip
      >
        <template #default="scope">
          <div
            v-if="readonly || scope.row.isDraft"
            class="ml-layer-table-cell ml-layer-table-text-cell"
          >
            {{ formatLineWeightLabel(scope.row.lineWeight) }}
          </div>
          <div
            v-else
            class="ml-layer-table-cell ml-layer-table-select-cell"
            @click.stop
          >
            <MlLineWeightSelect
              :model-value="scope.row.lineWeight"
              :placeholder="
                t('main.toolPalette.layerManager.layerList.lineWeightDefault')
              "
              @change="emitChange(scope.row, 'lineWeight', $event)"
            />
          </div>
        </template>
      </el-table-column>

      <el-table-column
        property="transparency"
        :label="t('main.toolPalette.layerManager.layerList.transparency')"
        width="90"
        resizable
        align="center"
      >
        <template #default="scope">
          <div class="ml-layer-table-cell">
            <span
              v-if="readonly || scope.row.isDraft"
              class="ml-layer-table-text-value"
            >
              {{ scope.row.transparency }}
            </span>
            <input
              v-else
              class="ml-layer-table-text-input"
              :value="scope.row.transparency"
              @click.stop
              @change="
                emitChange(scope.row, 'transparency', inputEventValue($event))
              "
            />
          </div>
        </template>
      </el-table-column>

      <el-table-column
        property="description"
        :label="t('main.toolPalette.layerManager.layerList.description')"
        min-width="140"
        resizable
        show-overflow-tooltip
      >
        <template #default="scope">
          <div class="ml-layer-table-cell">
            <span
              v-if="readonly || scope.row.isDraft"
              class="ml-layer-table-text-value"
            >
              {{ scope.row.description }}
            </span>
            <input
              v-else
              class="ml-layer-table-text-input"
              :value="scope.row.description"
              @click.stop
              @change="
                emitChange(scope.row, 'description', inputEventValue($event))
              "
            />
          </div>
        </template>
      </el-table-column>
    </el-table>

    <ml-color-picker-dlg
      v-if="!readonly"
      v-model="colorDialogVisible"
      :title="t('dialog.colorPickerDlg.title')"
      :color="oldColor"
      @ok="handleColorDialogOk"
      @cancel="handleColorDialogCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { AcCmColor, AcGiLineWeight } from '@mlightcad/data-model'
import type { InputInstance } from 'element-plus'
import { ElCheckbox, ElInput, ElTable, ElTableColumn } from 'element-plus'
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { colorName } from '../../locale'
import {
  layerLight,
  layerLocker,
  layerNoPlot,
  layerPlot,
  layerSnow,
  layerThawed,
  layerUnlocked
} from '../../svg'
import { MlColorPickerDlg } from '../dialog'
import type { MlLayerTableChangeField, MlLayerTableRow } from './MlLayerTable'
import MlLineTypeSelect from './MlLineTypeSelect.vue'
import MlLineWeightSelect from './MlLineWeightSelect.vue'

export type { MlLayerTableChangeField, MlLayerTableRow } from './MlLayerTable'

const DRAFT_ROW_KEY = '__ml_draft_new_layer__'

const props = withDefaults(
  defineProps<{
    /** Rows to display in the table. */
    layers: MlLayerTableRow[]
    /** Current layer name (`CLAYER`), used for the `*` marker. */
    currentLayerName?: string
    /** Selected layer name (stable across row identity refreshes). */
    selectedLayerName?: string | null
    /** Draft layer name while creating a new layer inline. */
    draftLayerName?: string
    /**
     * When `true`, state icons and property editors are display-only.
     * Suitable for layer-filter previews.
     */
    readonly?: boolean
  }>(),
  {
    currentLayerName: '',
    selectedLayerName: null,
    draftLayerName: '',
    readonly: false
  }
)

const emit = defineEmits<{
  (e: 'update:selectedLayerName', value: string | null): void
  (e: 'update:draftLayerName', value: string): void
  (e: 'row-click', row: MlLayerTableRow): void
  (e: 'row-dblclick', row: MlLayerTableRow): void
  (e: 'draft-commit'): void
  (e: 'draft-cancel'): void
  (e: 'toggle-all-on', isOn: boolean): void
  (
    e: 'change',
    payload: {
      layerName: string
      field: MlLayerTableChangeField
      value: boolean | string | number
    }
  ): void
  (e: 'change-color', payload: { layerName: string; color: AcCmColor }): void
}>()

const { t } = useI18n()
const draftInputRef = ref<InputInstance>()
const colorDialogVisible = ref(false)
const colorTargetLayer = ref<MlLayerTableRow | null>(null)
const oldColor = ref<string | undefined>(undefined)

const editableLayers = computed(() =>
  props.layers.filter(layer => !layer.isDraft)
)

const isAllOn = computed(() => {
  const rows = editableLayers.value
  if (!rows.length) return false
  return rows.every(layer => layer.isOn)
})

const isSomeOn = computed(() => {
  const rows = editableLayers.value
  if (!rows.length) return false
  const anyOn = rows.some(layer => layer.isOn)
  return anyOn && !isAllOn.value
})

const getRowKey = (row: MlLayerTableRow) =>
  row.isDraft ? DRAFT_ROW_KEY : row.name

const getRowClassName = ({ row }: { row: MlLayerTableRow }) => {
  const classes: string[] = []
  if (row.isDraft) classes.push('ml-layer-table-row--draft')
  if (!row.isDraft && row.name === props.currentLayerName) {
    classes.push('ml-layer-table-row--current')
  }
  return classes.join(' ')
}

const handleToggleAll = (isOn: string | number | boolean) => {
  if (props.readonly) return
  emit('toggle-all-on', Boolean(isOn))
}

const handleCurrentRowChange = (row: MlLayerTableRow | undefined) => {
  // Ignore null clears from table data refreshes; keep the last explicit selection.
  if (row && !row.isDraft) {
    emit('update:selectedLayerName', row.name)
  }
}

const handleRowClick = (row: MlLayerTableRow) => {
  if (row.isDraft) return
  emit('update:selectedLayerName', row.name)
  emit('row-click', row)
}

const handleRowDbClick = (row: MlLayerTableRow) => {
  if (row.isDraft) return
  emit('update:selectedLayerName', row.name)
  emit('row-dblclick', row)
}

const emitChange = (
  row: MlLayerTableRow,
  field: MlLayerTableChangeField,
  value: boolean | string | number
) => {
  if (props.readonly || row.isDraft) return
  emit('change', { layerName: row.name, field, value })
}

const formatLayerColorName = (row: MlLayerTableRow) => {
  const color = AcCmColor.fromString(row.color)
  const name = color?.colorName || color?.toString() || row.color
  return colorName(name)
}

const formatLineWeightLabel = (value: number) => {
  switch (value) {
    case AcGiLineWeight.ByLayer:
      return 'ByLayer'
    case AcGiLineWeight.ByBlock:
      return 'ByBlock'
    case AcGiLineWeight.ByLineWeightDefault:
      return t('main.toolPalette.layerManager.layerList.lineWeightDefault')
    default:
      return `${(value / 100).toFixed(2)} mm`
  }
}

const inputEventValue = (event: Event) =>
  (event.target as HTMLInputElement).value

const openColorPicker = (row: MlLayerTableRow) => {
  if (props.readonly || row.isDraft) return
  colorTargetLayer.value = row
  oldColor.value = row.color
  colorDialogVisible.value = true
}

const handleColorDialogOk = (color: AcCmColor) => {
  if (!colorTargetLayer.value) return
  emit('change-color', {
    layerName: colorTargetLayer.value.name,
    color
  })
}

const handleColorDialogCancel = () => {
  // Discard temporary selection
}

const focusDraftInput = async () => {
  await nextTick()
  draftInputRef.value?.focus()
  draftInputRef.value?.select?.()
}

defineExpose({
  focusDraftInput
})
</script>

<style>
.ml-layer-table-wrap {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.ml-layer-table {
  width: 100%;
  font-size: 12px;
  min-width: 100%;
}

.ml-layer-table .el-table__cell {
  padding-top: 0;
  padding-bottom: 0;
  font-size: 12px;
}

.ml-layer-table .el-table__header .el-table__cell {
  padding-top: 2px;
  padding-bottom: 2px;
  font-size: 12px;
}

.ml-layer-table .el-table__header .cell,
.ml-layer-table .el-table__body .cell {
  font-size: 12px;
  line-height: 20px;
  min-height: 20px;
}

.ml-layer-table .el-table__header .cell {
  white-space: nowrap;
}

/*
 * Element Plus only sets `th.style.cursor = col-resize` for sortable columns.
 * Non-sortable headers rely on `document.body.style.cursor`, which is easy to
 * miss under table cells. Mirror the 8px resize handle so the cursor appears
 * consistently on every column edge (except the last, which is not resizable).
 */
.ml-layer-table.el-table--border .el-table__header th.el-table__cell {
  position: relative;
}

.ml-layer-table.el-table--border
  .el-table__header
  th.el-table__cell:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 0;
  right: -4px;
  width: 8px;
  height: 100%;
  cursor: col-resize;
  z-index: 2;
}

.ml-layer-table .el-table__header,
.ml-layer-table .el-table__body {
  border-bottom: 1px solid var(--el-border-color);
}

.ml-layer-table-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
}

.ml-layer-table-text-cell {
  justify-content: flex-start;
}

.ml-layer-table-text-value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
  text-align: left;
}

.ml-layer-table-header-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
}

.ml-layer-table-state-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.ml-layer-table-state-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ml-layer-table-state-icon {
  display: inline-flex;
  width: 16px;
  height: 16px;
  color: var(--el-text-color-regular);
}

.ml-layer-table-state-icon.is-on,
.ml-layer-table-state-icon.is-plottable {
  color: var(--el-color-primary);
}

.ml-layer-table-state-icon.is-off,
.ml-layer-table-state-icon.is-no-plot {
  color: var(--el-text-color-disabled);
}

.ml-layer-table-state-icon.is-frozen,
.ml-layer-table-state-icon.is-locked {
  color: var(--el-text-color-primary);
}

.ml-layer-table-state-icon.is-unfrozen,
.ml-layer-table-state-icon.is-unlocked {
  color: var(--el-text-color-regular);
}

.ml-layer-table-state-icon :deep(svg) {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.ml-layer-table-state-icon :deep(path),
.ml-layer-table-state-icon :deep(rect),
.ml-layer-table-state-icon :deep(polygon),
.ml-layer-table-state-icon :deep(ellipse),
.ml-layer-table-state-icon :deep(circle) {
  fill: currentColor;
  stroke: currentColor;
}

.ml-layer-table-plot-icon.is-no-plot {
  opacity: 0.55;
}

.ml-layer-table-color-cell {
  justify-content: flex-start;
  gap: 6px;
  cursor: pointer;
  min-width: 0;
}

.ml-layer-table-color-cell--disabled {
  opacity: 0.45;
  pointer-events: none;
  cursor: default;
}

.ml-layer-table-color-swatch {
  display: inline-flex;
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  border-radius: 2px;
  border: 1px solid var(--el-border-color);
  box-sizing: border-box;
}

.ml-layer-table-color-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.ml-layer-table-select-cell {
  justify-content: stretch;
}

.ml-layer-table-select-cell :deep(.ml-linetype-select),
.ml-layer-table-select-cell :deep(.ml-lineweight-select) {
  min-height: 20px;
  font-size: 12px;
}

.ml-layer-table-select-cell :deep(.el-select__wrapper),
.ml-layer-table-select-cell :deep(.ml-lineweight-select__trigger) {
  min-height: 20px;
  height: 20px;
  padding-top: 0;
  padding-bottom: 0;
  font-size: 12px;
}

.ml-layer-table-select-cell :deep(.ml-linetype-text),
.ml-layer-table-select-cell :deep(.ml-lineweight-label) {
  font-size: 12px;
}

.ml-layer-table-select-cell :deep(.el-input__inner),
.ml-layer-table-name-input :deep(.el-input__inner) {
  font-size: 12px;
  height: 20px;
  line-height: 20px;
}

.ml-layer-table-name-input :deep(.el-input__wrapper) {
  min-height: 20px;
  padding-top: 0;
  padding-bottom: 0;
}

.ml-layer-table-text-input {
  width: 100%;
  min-width: 0;
  height: 20px;
  padding: 0 6px;
  border: 1px solid transparent;
  border-radius: var(--el-border-radius-base);
  background: transparent;
  color: var(--el-text-color-regular);
  font-size: inherit;
  line-height: 20px;
  outline: none;
  box-sizing: border-box;
}

.ml-layer-table-text-input:hover:not(:disabled),
.ml-layer-table-text-input:focus:not(:disabled) {
  border-color: var(--el-border-color);
  background: var(--el-fill-color-blank);
}

.ml-layer-table-text-input:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ml-layer-table-name {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.ml-layer-table-name-input {
  width: 100%;
}

.ml-layer-table-current-marker {
  color: var(--el-color-primary);
  font-weight: 600;
}

.ml-layer-table .ml-layer-table-row--current > td.el-table__cell {
  font-weight: 600;
}

.ml-layer-table .el-table__body tr.current-row > td.el-table__cell {
  background-color: var(--el-color-primary-light-7) !important;
  color: var(--el-text-color-primary);
}

.ml-layer-table .el-table__body tr.current-row:hover > td.el-table__cell {
  background-color: var(--el-color-primary-light-5) !important;
}

html.dark .ml-layer-table .el-table__body tr.current-row > td.el-table__cell {
  background-color: var(--el-color-primary-dark-2) !important;
  color: var(--el-color-white);
}

html.dark
  .ml-layer-table
  .el-table__body
  tr.current-row:hover
  > td.el-table__cell {
  background-color: var(--el-color-primary) !important;
}

.ml-layer-table .ml-layer-table-row--draft > td.el-table__cell {
  background-color: var(--el-fill-color-light);
}
</style>
