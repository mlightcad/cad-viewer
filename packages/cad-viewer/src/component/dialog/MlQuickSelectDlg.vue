<template>
  <ml-base-dialog
    :title="t('dialog.quickSelectDlg.title')"
    :width="460"
    v-model="dialogVisible"
    name="QuickSelectDlg"
    @open="handleOpen"
    @ok="handleConfirm"
  >
    <el-form label-position="left" label-width="170px">
      <el-form-item :label="t('dialog.quickSelectDlg.applyTo')">
        <el-select v-model="form.applyTo" style="width: 100%">
          <el-option
            v-for="item in applyToOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item :label="t('dialog.quickSelectDlg.objectType')">
        <el-select v-model="form.objectType" style="width: 100%">
          <el-option
            :label="t('dialog.quickSelectDlg.allObjectTypes')"
            value="*"
          />
          <el-option
            v-for="type in objectTypeOptions"
            :key="type"
            :label="entityTypeName(type)"
            :value="type"
          />
        </el-select>
      </el-form-item>

      <el-form-item :label="t('dialog.quickSelectDlg.property')">
        <el-select v-model="form.property" style="width: 100%">
          <el-option
            v-for="item in propertyOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item :label="t('dialog.quickSelectDlg.operator')">
        <el-select v-model="form.operator" style="width: 100%">
          <el-option
            v-for="item in operatorOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item :label="t('dialog.quickSelectDlg.value')">
        <el-select
          v-model="form.value"
          filterable
          allow-create
          default-first-option
          style="width: 100%"
        >
          <el-option
            v-for="item in valueOptions"
            :key="item"
            :label="valueLabel(item)"
            :value="item"
          />
        </el-select>
      </el-form-item>

      <el-form-item :label="t('dialog.quickSelectDlg.howToApply')">
        <el-select v-model="form.selectionMode" style="width: 100%">
          <el-option
            v-for="item in selectionModeOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
    </el-form>

    <div class="ml-quick-select-result">
      {{
        t('dialog.quickSelectDlg.previewResult', {
          count: matchedCount,
          total: sourceCount
        })
      }}
    </div>
  </ml-base-dialog>
</template>

<script setup lang="ts">
import { AcDbEntity } from '@mlightcad/data-model'
import { ElMessage } from 'element-plus'
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  applyQuickSelect,
  getQuickSelectMatchedCount,
  getQuickSelectObjectTypes,
  getQuickSelectPropertyValues,
  getQuickSelectSourceCount,
  MlQuickSelectApplyTo,
  MlQuickSelectOperator,
  MlQuickSelectProperty,
  MlQuickSelectSelectionMode
} from '../../composable'
import { entityName } from '../../locale'
import MlBaseDialog from '../common/MlBaseDialog.vue'

const { t } = useI18n()
const dialogVisible = ref(true)

const DEFAULT_FORM = {
  applyTo: 'entireDrawing' as MlQuickSelectApplyTo,
  objectType: '*',
  property: 'layer' as MlQuickSelectProperty,
  operator: 'equals' as MlQuickSelectOperator,
  value: '',
  selectionMode: 'set' as MlQuickSelectSelectionMode
}

/**
 * Dialog form state.
 * Defaults are chosen to match common AutoCAD Quick Select behavior:
 * - apply to entire drawing
 * - default property: layer
 * - default operator: equals
 * - default apply mode: create new selection set
 */
const form = reactive<{
  applyTo: MlQuickSelectApplyTo
  objectType: string
  property: MlQuickSelectProperty
  operator: MlQuickSelectOperator
  value: string
  selectionMode: MlQuickSelectSelectionMode
}>({ ...DEFAULT_FORM })

const resetForm = () => {
  form.applyTo = DEFAULT_FORM.applyTo
  form.objectType = DEFAULT_FORM.objectType
  form.property = DEFAULT_FORM.property
  form.operator = DEFAULT_FORM.operator
  form.value = DEFAULT_FORM.value
  form.selectionMode = DEFAULT_FORM.selectionMode
}

const applyToOptions = computed(() => [
  {
    value: 'entireDrawing',
    label: t('dialog.quickSelectDlg.applyToEntireDrawing')
  },
  {
    value: 'currentSelection',
    label: t('dialog.quickSelectDlg.applyToCurrentSelection')
  }
])

const propertyOptions = computed(() => [
  { value: 'objectType', label: t('dialog.quickSelectDlg.propObjectType') },
  { value: 'layer', label: t('dialog.quickSelectDlg.propLayer') },
  { value: 'color', label: t('dialog.quickSelectDlg.propColor') },
  { value: 'lineType', label: t('dialog.quickSelectDlg.propLineType') },
  { value: 'lineWeight', label: t('dialog.quickSelectDlg.propLineWeight') }
])

const stringOperators = computed(() => [
  { value: 'equals', label: t('dialog.quickSelectDlg.opEquals') },
  { value: 'notEquals', label: t('dialog.quickSelectDlg.opNotEquals') }
])

const numberOperators = computed(() => [
  { value: 'equals', label: t('dialog.quickSelectDlg.opEquals') },
  { value: 'notEquals', label: t('dialog.quickSelectDlg.opNotEquals') },
  { value: 'greaterThan', label: t('dialog.quickSelectDlg.opGreaterThan') },
  {
    value: 'greaterThanOrEqual',
    label: t('dialog.quickSelectDlg.opGreaterThanOrEqual')
  },
  { value: 'lessThan', label: t('dialog.quickSelectDlg.opLessThan') },
  {
    value: 'lessThanOrEqual',
    label: t('dialog.quickSelectDlg.opLessThanOrEqual')
  }
])

const selectionModeOptions = computed(() => [
  {
    value: 'set',
    label: t('dialog.quickSelectDlg.modeSet')
  },
  {
    value: 'add',
    label: t('dialog.quickSelectDlg.modeAdd')
  },
  {
    value: 'remove',
    label: t('dialog.quickSelectDlg.modeRemove')
  }
])

const objectTypeOptions = computed(() =>
  getQuickSelectObjectTypes(form.applyTo)
)

const operatorOptions = computed(() =>
  form.property === 'lineWeight' ? numberOperators.value : stringOperators.value
)

const valueOptions = computed(() =>
  getQuickSelectPropertyValues(
    form.applyTo,
    form.property,
    form.objectType === '*' ? undefined : form.objectType
  )
)

/**
 * Total candidate object count (optionally affected by objectType filter).
 * Used by UI to show the filtering source size.
 */
const sourceCount = computed(() =>
  getQuickSelectSourceCount(
    form.applyTo,
    form.objectType === '*' ? undefined : form.objectType
  )
)

/**
 * Live matched count preview.
 * Read-only statistic; does not mutate selection set.
 */
const matchedCount = computed(() => {
  if (!form.value) {
    return 0
  }
  return getQuickSelectMatchedCount({
    applyTo: form.applyTo,
    objectType: form.objectType === '*' ? undefined : form.objectType,
    property: form.property,
    operator: form.operator,
    value: form.value,
    selectionMode: form.selectionMode
  })
})

/**
 * Normalize current operator when property changes.
 * Example: when switching from numeric to string property,
 * drop invalid operators such as > and <.
 */
watch(
  () => form.property,
  () => {
    const allowed = new Set(operatorOptions.value.map(item => item.value))
    if (!allowed.has(form.operator)) {
      form.operator = operatorOptions.value[0].value as MlQuickSelectOperator
    }
  },
  { immediate: true }
)

/**
 * Keep form.value valid when candidate value list changes:
 * - clear when no candidates
 * - fallback to first option when current value is not available
 */
watch(
  valueOptions,
  options => {
    if (options.length === 0) {
      form.value = ''
      return
    }
    if (!options.includes(form.value)) {
      form.value = options[0]
    }
  },
  { immediate: true }
)

const entityTypeName = (type: string) => {
  return entityName({ type } as AcDbEntity)
}

const valueLabel = (value: string) => {
  if (form.property === 'objectType') {
    return entityTypeName(value)
  }
  return value
}

/**
 * Confirm action:
 * 1. basic validation (value is required)
 * 2. execute applyQuickSelect to filter and write selection set
 * 3. show result feedback
 */
const handleConfirm = () => {
  if (!form.value) {
    ElMessage({
      message: t('dialog.quickSelectDlg.valueRequired'),
      grouping: true,
      type: 'warning'
    })
    return
  }

  const result = applyQuickSelect({
    applyTo: form.applyTo,
    objectType: form.objectType === '*' ? undefined : form.objectType,
    property: form.property,
    operator: form.operator,
    value: form.value,
    selectionMode: form.selectionMode
  })

  ElMessage({
    message: t('dialog.quickSelectDlg.selectionResult', {
      count: result.matchedCount
    }),
    grouping: true,
    type: 'success'
  })
}

/**
 * Reset dialog state every time it opens.
 * This prevents carrying values from previous Quick Select runs.
 */
const handleOpen = () => {
  resetForm()
}
</script>

<style scoped>
.ml-quick-select-result {
  margin-top: 6px;
  color: var(--el-text-color-secondary);
}
</style>
