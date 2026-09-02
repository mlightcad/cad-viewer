<template>
  <div class="ml-layer-table-virtual-wrap">
    <el-auto-resizer>
      <template #default="{ width, height }">
        <el-table-v2
          ref="tableRef"
          :columns="columns"
          :data="layers"
          :width="width"
          :height="height"
          :row-height="29"
          :header-height="30"
          :row-class="rowClass"
          :row-event-handlers="rowEventHandlers"
          row-key="name"
          fixed
          class="ml-layer-table-virtual"
        />
      </template>
    </el-auto-resizer>

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
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { AcCmColor, AcGiLineWeight } from '@mlightcad/data-model'
import type { Column, InputInstance } from 'element-plus'
import {
  ElAutoResizer,
  ElCheckbox,
  ElInput,
  ElTableV2
} from 'element-plus'
import {
  computed,
  h,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  shallowRef
} from 'vue'
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
import {
  buildLineTypeOptions,
  type LineTypeOption,
  resolveLineTypeBackground,
  resolveLineTypePreviewSvg} from '../common/lineTypeOptions'
import type {
  MlLayerTableChangeField,
  MlLayerTableRow
} from '../common/MlLayerTable'
import MlLineTypeSelect from '../common/MlLineTypeSelect.vue'
import MlLineWeightSelect from '../common/MlLineWeightSelect.vue'
import { MlColorPickerDlg } from '../dialog'


const props = withDefaults(
  defineProps<{
    layers: MlLayerTableRow[]
    currentLayerName?: string
    selectedLayerName?: string | null
    draftLayerName?: string
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

  (
    e: 'change-color',
    payload: {
      layerName: string
      color: AcCmColor
    }
  ): void
}>()

const { t, locale } = useI18n()

const tableRef = ref<{
  scrollToRow?: (row: number) => void
}>()
const draftInputRef = ref<InputInstance>()

const colorDialogVisible = ref(false)
const colorTargetLayer = ref<MlLayerTableRow | null>(null)
const oldColor = ref<string | undefined>()

type LazyEditorField =
  | 'linetype'
  | 'lineWeight'
  | 'transparency'
  | 'description'

interface ActiveEditor {
  layerName: string
  field: LazyEditorField
}

const activeEditor = ref<ActiveEditor | null>(null)

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

/* ---------------------------------------------------------
 * Line type metadata is resolved ONCE for this table,
 * not once per visible row.
 * --------------------------------------------------------- */

const activeDatabase = shallowRef(
  AcApDocManager.instance?.curDocument?.database
)


const localizeSymbolicLineTypeLabel = (
  value: string,
  label: string
) => {
  if (locale.value !== 'ar') return label

  switch (value.trim().toLowerCase()) {
    case 'bylayer':
      return 'حسب الطبقة'

    case 'byblock':
      return 'حسب الكتلة'

    case 'continuous':
      return 'متصل'

    default:
      return label
  }
}

const lineTypeOptions = computed<LineTypeOption[]>(() =>
  buildLineTypeOptions(activeDatabase.value).map(item => ({
    ...item,
    label: localizeSymbolicLineTypeLabel(
      item.value,
      item.label
    ),
    previewSvgString:
      resolveLineTypePreviewSvg(item)
  }))
)

const lineTypeMap = computed(() => {
  const result = new Map<string, LineTypeOption>()

  for (const item of lineTypeOptions.value) {
    result.set(item.value, item)
  }

  return result
})

const handleDocumentActivated = () => {
  activeDatabase.value =
    AcApDocManager.instance?.curDocument?.database
}

/* ---------------------------------------------------------
 * Selection
 * --------------------------------------------------------- */

const selectRow = (row: MlLayerTableRow) => {
  if (row.isDraft) return

  emit(
    'update:selectedLayerName',
    row.name
  )

  emit('row-click', row)
}

const doubleClickRow = (row: MlLayerTableRow) => {
  if (row.isDraft) return

  emit(
    'update:selectedLayerName',
    row.name
  )

  emit('row-dblclick', row)
}

const rowClass = ({
  rowData
}: {
  rowData: MlLayerTableRow
}) => {
  const classes: string[] = []

  if (
    !rowData.isDraft &&
    rowData.name === props.selectedLayerName
  ) {
    classes.push(
      'ml-layer-table-row--selected'
    )
  }

  if (
    !rowData.isDraft &&
    rowData.name === props.currentLayerName
  ) {
    classes.push(
      'ml-layer-table-row--current'
    )
  }

  if (rowData.isDraft) {
    classes.push(
      'ml-layer-table-row--draft'
    )
  }

  return classes.join(' ')
}

const rowEventHandlers = {
  onClick: ({
    rowData
  }: {
    rowData: MlLayerTableRow
  }) => {
    selectRow(rowData)
  },

  onDblclick: ({
    rowData
  }: {
    rowData: MlLayerTableRow
  }) => {
    doubleClickRow(rowData)
  }
}

/* ---------------------------------------------------------
 * Lazy editor
 * --------------------------------------------------------- */

const isEditing = (
  row: MlLayerTableRow,
  field: LazyEditorField
) =>
  activeEditor.value?.layerName === row.name &&
  activeEditor.value?.field === field

const startEditing = (
  row: MlLayerTableRow,
  field: LazyEditorField
) => {
  if (props.readonly || row.isDraft) return

  selectRow(row)

  activeEditor.value = {
    layerName: row.name,
    field
  }
}

const stopEditing = () => {
  activeEditor.value = null
}

/* ---------------------------------------------------------
 * Changes
 * --------------------------------------------------------- */

const emitChange = (
  row: MlLayerTableRow,
  field: MlLayerTableChangeField,
  value: boolean | string | number
) => {
  if (props.readonly || row.isDraft) return

  emit(
    'update:selectedLayerName',
    row.name
  )

  emit('change', {
    layerName: row.name,
    field,
    value
  })
}

/* ---------------------------------------------------------
 * Formatting
 * --------------------------------------------------------- */

const formatLineWeightLabel = (
  value: number
) => {
  switch (value) {
    case AcGiLineWeight.ByLayer:
      return locale.value === 'ar'
        ? 'حسب الطبقة'
        : 'ByLayer'

    case AcGiLineWeight.ByBlock:
      return locale.value === 'ar'
        ? 'حسب الكتلة'
        : 'ByBlock'

    case AcGiLineWeight.ByLineWeightDefault:
      return t(
        'main.toolPalette.layerManager.layerList.lineWeightDefault'
      )

    default:
      return `${(value / 100).toFixed(2)} mm`
  }
}

const lineWeightPreviewPx = (
  value: number
): number | null => {
  if (value < 0) return null

  return Math.max(
    1,
    Math.min(6, value / 40)
  )
}
const formatLayerColorName = (
  row: MlLayerTableRow
) => {
  const color =
    AcCmColor.fromString(row.color)

  const name =
    color?.colorName ||
    color?.toString() ||
    row.color

  return colorName(name)
}



/* ---------------------------------------------------------
 * Color
 * --------------------------------------------------------- */

const openColorPicker = (
  row: MlLayerTableRow
) => {
  if (props.readonly || row.isDraft) return

  emit(
    'update:selectedLayerName',
    row.name
  )

  colorTargetLayer.value = row
  oldColor.value = row.color
  colorDialogVisible.value = true
}

const handleColorDialogOk = (
  color: AcCmColor
) => {
  if (!colorTargetLayer.value) return

  emit('change-color', {
    layerName:
      colorTargetLayer.value.name,
    color
  })

  colorTargetLayer.value = null
}

const handleColorDialogCancel = () => {
  colorTargetLayer.value = null
}

/* ---------------------------------------------------------
 * State icons
 * --------------------------------------------------------- */

const makeStateButton = (
  row: MlLayerTableRow,
  icon: unknown,
  stateClass: string,
  field: MlLayerTableChangeField,
  value: boolean,
  title: string
) =>
  h(
    'div',
    {
      class: 'ml-layer-table-cell'
    },
    [
      h(
        'button',
        {
          type: 'button',
          class:
            'ml-layer-table-state-button',

          disabled:
            props.readonly ||
            row.isDraft,

          title,

          'aria-label': title,

          onClick: (
            event: MouseEvent
          ) => {
            event.stopPropagation()

            emitChange(
              row,
              field,
              value
            )
          }
        },
        [
          h(
            'span',
            {
              class: [
                'ml-layer-table-state-icon',
                stateClass
              ],

              'aria-hidden': 'true'
            },
            [
              h(icon as never)
            ]
          )
        ]
      )
    ]
  )

/* ---------------------------------------------------------
 * Lightweight LineType display
 * --------------------------------------------------------- */

const renderLineTypeDisplay = (
  row: MlLayerTableRow
) => {
  const option =
    lineTypeMap.value.get(
      row.linetype
    )

  const previewSvg =
    resolveLineTypePreviewSvg(option)

  const background =
    resolveLineTypeBackground(option)

  const label =
    option?.label ??
    localizeSymbolicLineTypeLabel(
      row.linetype,
      row.linetype
    )

  return h(
    'div',
    {
      class:
        'ml-layer-lazy-display ml-layer-linetype-display',

      onClick: (
        event: MouseEvent
      ) => {
        event.stopPropagation()

        startEditing(
          row,
          'linetype'
        )
      }
    },
    [
      h(
        'span',
        {
          class: [
            'ml-layer-linetype-preview',
            previewSvg
              ? 'ml-layer-linetype-preview--svg'
              : ''
          ],

          style: {
            '--ml-linetype-bg':
              background
          }
        },
        [
          previewSvg
            ? h('span', {
                class:
                  'ml-layer-linetype-preview-svg',
                innerHTML:
                  previewSvg
              })
            : null
        ]
      ),

      h(
        'span',
        {
          class:
            'ml-layer-linetype-label'
        },
        label
      )
    ]
  )
}

/* ---------------------------------------------------------
 * Lightweight LineWeight display
 * --------------------------------------------------------- */

const renderLineWeightDisplay = (
  row: MlLayerTableRow
) => {
  const preview =
    lineWeightPreviewPx(
      row.lineWeight
    )

  return h(
    'div',
    {
      class:
        'ml-layer-lazy-display ml-layer-lineweight-display',

      onClick: (
        event: MouseEvent
      ) => {
        event.stopPropagation()

        startEditing(
          row,
          'lineWeight'
        )
      }
    },
    [
      preview !== null
        ? h('span', {
            class:
              'ml-layer-lineweight-preview',

            style: {
              height: `${preview}px`
            }
          })
        : null,

      h(
        'span',
        {
          class:
            'ml-layer-lineweight-label'
        },
        formatLineWeightLabel(
          row.lineWeight
        )
      )
    ]
  )
}

/* ---------------------------------------------------------
 * Lightweight text display
 * --------------------------------------------------------- */

const renderTextDisplay = (
  row: MlLayerTableRow,
  field:
    | 'transparency'
    | 'description',
  text: string
) =>
  h(
    'div',
    {
      class:
        'ml-layer-lazy-display ml-layer-text-display',

      title: text,

      onClick: (
        event: MouseEvent
      ) => {
        event.stopPropagation()

        startEditing(
          row,
          field
        )
      }
    },
    text
  )

/* ---------------------------------------------------------
 * Columns
 * --------------------------------------------------------- */

const columns =
  computed<Column<MlLayerTableRow>[]>(
    () => [
      {
        key: 'name',
        dataKey: 'name',

        title: t(
          'main.toolPalette.layerManager.layerList.name'
        ),

        width: 180,

        cellRenderer: ({
          rowData
        }) => {
          if (rowData.isDraft) {
            return h(ElInput, {
              ref: draftInputRef,

              modelValue:
                props.draftLayerName,

              size: 'small',

              class:
                'ml-layer-table-name-input',

              disabled:
                props.readonly,

              placeholder: t(
                'main.toolPalette.layerManager.layerList.newLayerPlaceholder'
              ),

              'onUpdate:modelValue': (
                value: string
              ) =>
                emit(
                  'update:draftLayerName',
                  value
                ),

              onClick: (
                event: MouseEvent
              ) =>
                event.stopPropagation(),

              onKeydown: (
                event: Event
              ) => {
                if (
                  (event as KeyboardEvent).key ===
                  'Enter'
                ) {
                  event.preventDefault()

                  emit(
                    'draft-commit'
                  )
                }

                if (
                  (event as KeyboardEvent).key ===
                  'Escape'
                ) {
                  event.preventDefault()

                  emit(
                    'draft-cancel'
                  )
                }
              },

              onBlur: () =>
                emit(
                  'draft-commit'
                )
            })
          }

          return h(
            'div',
            {
              class:
                'ml-layer-table-name'
            },
            [
              rowData.name,

              rowData.name ===
              props.currentLayerName
                ? h(
                    'span',
                    {
                      class:
                        'ml-layer-table-current-marker'
                    },
                    '*'
                  )
                : null
            ]
          )
        }
      },

      {
        key: 'isOn',
        dataKey: 'isOn',

        title: t(
          'main.toolPalette.layerManager.layerList.on'
        ),

        width: 50,
        align: 'center',

        headerCellRenderer: () =>
          h(
            'div',
            {
              class:
                'ml-layer-table-header-toggle'
            },
            [
              h(ElCheckbox, {
                modelValue:
                  isAllOn.value,

                indeterminate:
                  isSomeOn.value,

                disabled:
                  props.readonly,

                onChange: (
                  value:
                    | string
                    | number
                    | boolean
                ) =>
                  emit(
                    'toggle-all-on',
                    Boolean(value)
                  )
              })
            ]
          ),

        cellRenderer: ({
          rowData
        }) =>
          makeStateButton(
            rowData,
            layerLight,
            rowData.isOn
              ? 'is-on'
              : 'is-off',
            'on',
            !rowData.isOn,
            t(
              'main.toolPalette.layerManager.layerList.on'
            )
          )
      },

      {
        key: 'isFrozen',
        dataKey: 'isFrozen',

        title: t(
          'main.toolPalette.layerManager.layerList.freeze'
        ),

        width: 58,
        align: 'center',

        cellRenderer: ({
          rowData
        }) =>
          makeStateButton(
            rowData,

            rowData.isFrozen
              ? layerSnow
              : layerThawed,

            rowData.isFrozen
              ? 'is-frozen'
              : 'is-unfrozen',

            'frozen',
            !rowData.isFrozen,

            t(
              'main.toolPalette.layerManager.layerList.freeze'
            )
          )
      },

      {
        key: 'isLocked',
        dataKey: 'isLocked',

        title: t(
          'main.toolPalette.layerManager.layerList.lock'
        ),

        width: 52,
        align: 'center',

        cellRenderer: ({
          rowData
        }) =>
          makeStateButton(
            rowData,

            rowData.isLocked
              ? layerLocker
              : layerUnlocked,

            rowData.isLocked
              ? 'is-locked'
              : 'is-unlocked',

            'locked',
            !rowData.isLocked,

            t(
              'main.toolPalette.layerManager.layerList.lock'
            )
          )
      },

      {
        key: 'isPlottable',
        dataKey: 'isPlottable',

        title: t(
          'main.toolPalette.layerManager.layerList.plot'
        ),

        width: 58,
        align: 'center',

        cellRenderer: ({
          rowData
        }) =>
          makeStateButton(
            rowData,

            rowData.isPlottable
              ? layerPlot
              : layerNoPlot,

            rowData.isPlottable
              ? 'is-plottable'
              : 'is-no-plot',

            'plottable',
            !rowData.isPlottable,

            t(
              'main.toolPalette.layerManager.layerList.plot'
            )
          )
      },

      {
        key: 'color',
        dataKey: 'color',

        title: t(
          'main.toolPalette.layerManager.layerList.color'
        ),

        width: 100,

        cellRenderer: ({
          rowData
        }) =>
          h(
            'div',
            {
              class:
                'ml-layer-table-color-cell',

              onClick: (
                event: MouseEvent
              ) => {
                event.stopPropagation()

                openColorPicker(
                  rowData
                )
              }
            },
            [
              h('span', {
                class:
                  'ml-layer-table-color-swatch',

                style: {
                  backgroundColor:
                    rowData.cssColor
                }
              }),

              h(
                'span',
                {
                  class:
                    'ml-layer-table-color-name'
                },

                formatLayerColorName(
                  rowData
                )
              )
            ]
          )
      },

      {
        key: 'linetype',
        dataKey: 'linetype',

        title: t(
          'main.toolPalette.layerManager.layerList.linetype'
        ),

        width: 160,

        cellRenderer: ({
          rowData
        }) => {
          if (
            isEditing(
              rowData,
              'linetype'
            )
          ) {
            return h(
              'div',
              {
                class:
                  'ml-layer-table-cell ml-layer-table-select-cell',

                onClick: (
                  event: MouseEvent
                ) =>
                  event.stopPropagation()
              },
              [
                h(
                  MlLineTypeSelect,
                  {
                    modelValue:
                      rowData.linetype,

                    options:
                      lineTypeOptions.value,

                    onChange: (
                      value: string
                    ) => {
                      emitChange(
                        rowData,
                        'linetype',
                        value
                      )

                      stopEditing()
                    }
                  }
                )
              ]
            )
          }

          return renderLineTypeDisplay(
            rowData
          )
        }
      },

      {
        key: 'lineWeight',
        dataKey: 'lineWeight',

        title: t(
          'main.toolPalette.layerManager.layerList.lineweight'
        ),

        width: 140,

        cellRenderer: ({
          rowData
        }) => {
          if (
            isEditing(
              rowData,
              'lineWeight'
            )
          ) {
            return h(
              'div',
              {
                class:
                  'ml-layer-table-cell ml-layer-table-select-cell',

                onClick: (
                  event: MouseEvent
                ) =>
                  event.stopPropagation()
              },
              [
                h(
                  MlLineWeightSelect,
                  {
                    modelValue:
                      rowData.lineWeight as AcGiLineWeight,

                    placeholder: t(
                      'main.toolPalette.layerManager.layerList.lineWeightDefault'
                    ),

                    onChange: (
                      value:
                        AcGiLineWeight
                    ) => {
                      emitChange(
                        rowData,
                        'lineWeight',
                        value
                      )

                      stopEditing()
                    }
                  }
                )
              ]
            )
          }

          return renderLineWeightDisplay(
            rowData
          )
        }
      },

      {
        key: 'transparency',
        dataKey: 'transparency',

        title: t(
          'main.toolPalette.layerManager.layerList.transparency'
        ),

        width: 105,

        cellRenderer: ({
          rowData
        }) => {
          if (
            isEditing(
              rowData,
              'transparency'
            )
          ) {
            return h('input', {
              id:
                `ml-layer-transparency-${rowData.name}`,

              name:
                `ml-layer-transparency-${rowData.name}`,

              class:
                'ml-layer-table-text-input',

              value:
                rowData.transparency,

              autofocus: true,
              autocomplete: 'off',

              onClick: (
                event: MouseEvent
              ) =>
                event.stopPropagation(),

              onKeydown: (
                event: Event
              ) => {
                if (
                  (event as KeyboardEvent).key ===
                  'Escape'
                ) {
                  stopEditing()

                  return
                }

                if (
                  (event as KeyboardEvent).key ===
                  'Enter'
                ) {
                  ;(
                    event.target as
                      HTMLInputElement
                  ).blur()
                }
              },

              onBlur: (
                event: FocusEvent
              ) => {
                if (
                  !isEditing(
                    rowData,
                    'transparency'
                  )
                ) {
                  return
                }

                emitChange(
                  rowData,
                  'transparency',
                  (
                    event.target as
                      HTMLInputElement
                  ).value
                )

                stopEditing()
              }
            })
          }

          return renderTextDisplay(
            rowData,
            'transparency',
            rowData.transparency
          )
        }
      },

      {
        key: 'description',
        dataKey: 'description',

        title: t(
          'main.toolPalette.layerManager.layerList.description'
        ),

        width: 180,

        cellRenderer: ({
          rowData
        }) => {
          if (
            isEditing(
              rowData,
              'description'
            )
          ) {
            return h('input', {
              id:
                `ml-layer-description-${rowData.name}`,

              name:
                `ml-layer-description-${rowData.name}`,

              class:
                'ml-layer-table-text-input',

              value:
                rowData.description,

              autofocus: true,
              autocomplete: 'off',

              onClick: (
                event: MouseEvent
              ) =>
                event.stopPropagation(),

              onKeydown: (
                event: Event
              ) => {
                if (
                  (event as KeyboardEvent).key ===
                  'Escape'
                ) {
                  stopEditing()

                  return
                }

                if (
                  (event as KeyboardEvent).key ===
                  'Enter'
                ) {
                  ;(
                    event.target as
                      HTMLInputElement
                  ).blur()
                }
              },

              onBlur: (
                event: FocusEvent
              ) => {
                if (
                  !isEditing(
                    rowData,
                    'description'
                  )
                ) {
                  return
                }

                emitChange(
                  rowData,
                  'description',
                  (
                    event.target as
                      HTMLInputElement
                  ).value
                )

                stopEditing()
              }
            })
          }

          return renderTextDisplay(
            rowData,
            'description',
            rowData.description || ''
          )
        }
      }
    ]
  )

/* ---------------------------------------------------------
 * Draft
 * --------------------------------------------------------- */

const focusDraftInput = async () => {
  const draftIndex =
    props.layers.findIndex(
      row => row.isDraft
    )

  if (draftIndex >= 0) {
    tableRef.value?.scrollToRow?.(
      draftIndex
    )
  }

  await nextTick()
  await nextTick()

  draftInputRef.value?.focus()
  draftInputRef.value?.select?.()
}

defineExpose({
  focusDraftInput
})

onMounted(() => {
  AcApDocManager.instance
    ?.events.documentActivated
    .addEventListener(
      handleDocumentActivated
    )

  handleDocumentActivated()
})

onUnmounted(() => {
  AcApDocManager.instance
    ?.events.documentActivated
    .removeEventListener(
      handleDocumentActivated
    )
})
</script>

<style>
.ml-layer-table-virtual-wrap {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  font-size: 12px;
}

.ml-layer-table-virtual {
  width: 100%;
  height: 100%;
  font-size: 12px;
}

/* =========================================================
 * Table
 * ========================================================= */

.ml-layer-table-virtual .el-table-v2__header-cell,
.ml-layer-table-virtual .el-table-v2__row-cell {
  padding: 0 8px;
  font-size: 12px;
  box-sizing: border-box;
  border-right:
    1px solid var(--el-border-color-lighter);
}

.ml-layer-table-virtual .el-table-v2__header-cell {
  font-weight: 600;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
}

.ml-layer-table-virtual .el-table-v2__row {
  border-bottom:
    1px solid var(--el-border-color-lighter);
}

.ml-layer-table-virtual .el-table-v2__row:hover {
  background:
    var(--el-fill-color-light);
}

/* =========================================================
 * Selection parity
 * ========================================================= */

.ml-layer-table-virtual
  .el-table-v2__row.ml-layer-table-row--selected {
  background:
    var(--el-fill-color);
}

.ml-layer-table-virtual
  .el-table-v2__row.ml-layer-table-row--selected:hover {
  background:
    var(--el-fill-color);
}

.ml-layer-table-virtual
  .el-table-v2__row.ml-layer-table-row--current
  .ml-layer-table-name {
  color:
    var(--el-color-primary);
}

/* =========================================================
 * Basic cells
 * ========================================================= */

.ml-layer-table-name {
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ml-layer-table-current-marker {
  margin-inline-start: 2px;
  color: var(--el-color-primary);
  font-weight: 700;
}

.ml-layer-table-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
  height: 100%;
}

.ml-layer-table-header-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

/* =========================================================
 * State icons
 * ========================================================= */

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
  color:
    var(--el-text-color-regular);
}

.ml-layer-table-state-icon.is-on,
.ml-layer-table-state-icon.is-plottable,
.ml-layer-table-state-icon.is-frozen,
.ml-layer-table-state-icon.is-locked {
  color:
    var(--el-color-primary);
}

.ml-layer-table-state-icon.is-off,
.ml-layer-table-state-icon.is-no-plot {
  color:
    var(--el-text-color-disabled);
}

.ml-layer-table-state-icon svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.ml-layer-table-state-icon path,
.ml-layer-table-state-icon rect,
.ml-layer-table-state-icon polygon,
.ml-layer-table-state-icon ellipse,
.ml-layer-table-state-icon circle {
  fill: currentColor;
  stroke: currentColor;
}

/* =========================================================
 * Color
 * ========================================================= */

.ml-layer-table-color-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
  cursor: pointer;
}

.ml-layer-table-color-swatch {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  border-radius: 2px;
  border:
    1px solid var(--el-border-color);
  box-sizing: border-box;
}

.ml-layer-table-color-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* =========================================================
 * Lightweight display
 * ========================================================= */

.ml-layer-lazy-display {
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  min-width: 0;
  cursor: pointer;
}

.ml-layer-linetype-display {
  gap: 8px;
}

.ml-layer-linetype-preview {
  position: relative;
  flex: 0 0 52px;
  width: 52px;
  height: 14px;
}

.ml-layer-linetype-preview::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 2px;
  transform: translateY(-50%);
  background:
    var(--ml-linetype-bg);
}

.ml-layer-linetype-preview--svg::before {
  content: none;
}

.ml-layer-linetype-preview-svg {
  display: block;
  width: 100%;
  height: 100%;
}

.ml-layer-linetype-preview-svg svg {
  display: block;
  width: 100%;
  height: 100%;
}

.ml-layer-linetype-label,
.ml-layer-lineweight-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ml-layer-lineweight-display {
  gap: 8px;
}

.ml-layer-lineweight-preview {
  display: inline-block;
  width: 48px;
  flex: 0 0 48px;
  background: currentColor;
  min-height: 1px;
}

.ml-layer-text-display {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* =========================================================
 * One active editor only
 * ========================================================= */

.ml-layer-table-select-cell {
  justify-content: stretch;
}

.ml-layer-table-select-cell .ml-linetype-select,
.ml-layer-table-select-cell .ml-lineweight-select {
  width: 100%;
  min-width: 0;
  font-size: 12px;
}

.ml-layer-table-select-cell .el-select__wrapper,
.ml-layer-table-select-cell
  .ml-lineweight-select__trigger {
  min-height: 20px;
  height: 20px;
  padding-top: 0;
  padding-bottom: 0;
  font-size: 12px;
}

.ml-layer-table-name-input .el-input__wrapper {
  min-height: 20px;
}

.ml-layer-table-text-input {
  width: 100%;
  min-width: 0;
  height: 20px;
  padding: 0 6px;
  border:
    1px solid var(--el-color-primary);
  border-radius:
    var(--el-border-radius-base);
  background: transparent;
  color:
    var(--el-text-color-regular);
  font-size: 12px;
  line-height: 20px;
  outline: none;
  box-sizing: border-box;
}
</style>
