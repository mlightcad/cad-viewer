<template>
  <el-form
    v-if="!field"
    label-position="left"
    class="ml-ribbon-measure-units"
    size="small"
  >
    <el-form-item :label="typeLabel">
      <el-select
        :model-value="unitType"
        class="ml-ribbon-measure-units__control"
        @update:model-value="emit('update:unitType', $event)"
      >
        <el-option
          v-for="opt in unitOptions"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
    </el-form-item>
    <el-form-item :label="precisionLabel">
      <el-select
        :model-value="precision"
        class="ml-ribbon-measure-units__control"
        @update:model-value="emit('update:precision', $event)"
      >
        <el-option
          v-for="opt in precisionOptions"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
    </el-form-item>
    <el-form-item v-if="isLength" :label="unitLabel">
      <el-select
        :model-value="lengthUnit"
        class="ml-ribbon-measure-units__control"
        @update:model-value="emit('update:lengthUnit', $event)"
      >
        <el-option
          v-for="opt in lengthUnitOptions"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
    </el-form-item>
  </el-form>
  <div v-else class="ml-ribbon-measure-unit-field">
    <span class="ml-ribbon-measure-unit-field__label">{{ activeFieldLabel }}</span>
    <el-select
      :model-value="activeFieldValue"
      size="small"
      class="ml-ribbon-measure-unit-field__control"
      @update:model-value="onFieldChange"
    >
      <el-option
        v-for="opt in activeFieldOptions"
        :key="opt.value"
        :label="opt.label"
        :value="opt.value"
      />
    </el-select>
  </div>
</template>

<script setup lang="ts">
import { MEASUREMENT_LENGTH_UNIT_FOLLOW_DRAWING } from '@mlightcad/cad-simple-viewer'
import { AcDbAngleUnits, AcDbLinearUnits, AcDbUnitsValue } from '@mlightcad/data-model'
import { ElForm, ElFormItem, ElOption, ElSelect } from 'element-plus'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { drawingUnitPrecisionOptions } from '../../util/drawingUnitPrecision'

/**
 * Length or angle type/precision controls for one Measurement ribbon group.
 *
 * Labels are aligned with CSS grid instead of `label-width="auto"`, which
 * makes ElForm report `unexpected width NaN` when overflow groups are hidden.
 *
 * When `field` is set, only one compact row is rendered so the ribbon can
 * allocate one row per dropdown (same layout as the Home Properties panel).
 */
type MeasurementUnitsField = 'unitType' | 'precision' | 'lengthUnit'

interface RibbonMeasurementUnitsPanelProps {
  kind: 'length' | 'angle'
  unitType: number
  precision: number
  lengthUnit?: number
  field?: MeasurementUnitsField
}

const props = defineProps<RibbonMeasurementUnitsPanelProps>()

const emit = defineEmits<{
  (e: 'update:unitType', value: number): void
  (e: 'update:precision', value: number): void
  (e: 'update:lengthUnit', value: number): void
}>()

const { t } = useI18n()

const isLength = computed(() => props.kind === 'length')

const typeLabel = computed(() =>
  isLength.value
    ? t('dialog.drawingUnitsDlg.lengthType')
    : t('dialog.drawingUnitsDlg.angleType')
)

const precisionLabel = computed(() =>
  isLength.value
    ? t('dialog.drawingUnitsDlg.lengthPrecision')
    : t('dialog.drawingUnitsDlg.anglePrecision')
)

const unitLabel = computed(() => t('dialog.drawingUnitsDlg.lengthUnit'))

const unitOptions = computed(() =>
  isLength.value
    ? [
        {
          value: AcDbLinearUnits.Scientific,
          label: t('dialog.drawingUnitsDlg.linear.scientific')
        },
        {
          value: AcDbLinearUnits.Decimal,
          label: t('dialog.drawingUnitsDlg.linear.decimal')
        },
        {
          value: AcDbLinearUnits.Engineering,
          label: t('dialog.drawingUnitsDlg.linear.engineering')
        },
        {
          value: AcDbLinearUnits.Architectural,
          label: t('dialog.drawingUnitsDlg.linear.architectural')
        },
        {
          value: AcDbLinearUnits.Fractional,
          label: t('dialog.drawingUnitsDlg.linear.fractional')
        },
        {
          value: AcDbLinearUnits.WindowsDesktop,
          label: t('dialog.drawingUnitsDlg.linear.windowsDesktop')
        }
      ]
    : [
        {
          value: AcDbAngleUnits.DecimalDegrees,
          label: t('dialog.drawingUnitsDlg.angle.decimalDegrees')
        },
        {
          value: AcDbAngleUnits.DegreesMinutesSeconds,
          label: t('dialog.drawingUnitsDlg.angle.dms')
        },
        {
          value: AcDbAngleUnits.Gradians,
          label: t('dialog.drawingUnitsDlg.angle.gradians')
        },
        {
          value: AcDbAngleUnits.Radians,
          label: t('dialog.drawingUnitsDlg.angle.radians')
        },
        {
          value: AcDbAngleUnits.SurveyorsUnits,
          label: t('dialog.drawingUnitsDlg.angle.surveyors')
        }
      ]
)

const precisionOptions = computed(() =>
  drawingUnitPrecisionOptions(props.precision)
)

const lengthUnitOptions = computed(() => [
  {
    value: MEASUREMENT_LENGTH_UNIT_FOLLOW_DRAWING,
    label: t('dialog.drawingUnitsDlg.lengthUnitFollowDrawing')
  },
  {
    value: AcDbUnitsValue.Millimeters,
    label: `${t('dialog.drawingUnitsDlg.insUnits._4')} (mm)`
  },
  {
    value: AcDbUnitsValue.Centimeters,
    label: `${t('dialog.drawingUnitsDlg.insUnits._5')} (cm)`
  },
  {
    value: AcDbUnitsValue.Meters,
    label: `${t('dialog.drawingUnitsDlg.insUnits._6')} (m)`
  },
  {
    value: AcDbUnitsValue.Kilometers,
    label: `${t('dialog.drawingUnitsDlg.insUnits._7')} (km)`
  },
  {
    value: AcDbUnitsValue.Inches,
    label: `${t('dialog.drawingUnitsDlg.insUnits._1')} (in)`
  },
  {
    value: AcDbUnitsValue.Feet,
    label: `${t('dialog.drawingUnitsDlg.insUnits._2')} (ft)`
  },
  {
    value: AcDbUnitsValue.Yards,
    label: `${t('dialog.drawingUnitsDlg.insUnits._10')} (yd)`
  }
])

const activeFieldLabel = computed(() => {
  switch (props.field) {
    case 'unitType':
      return typeLabel.value
    case 'precision':
      return precisionLabel.value
    case 'lengthUnit':
      return unitLabel.value
    default:
      return ''
  }
})

const activeFieldValue = computed(() => {
  switch (props.field) {
    case 'unitType':
      return props.unitType
    case 'precision':
      return props.precision
    case 'lengthUnit':
      return props.lengthUnit
    default:
      return undefined
  }
})

const activeFieldOptions = computed(() => {
  switch (props.field) {
    case 'unitType':
      return unitOptions.value
    case 'precision':
      return precisionOptions.value
    case 'lengthUnit':
      return lengthUnitOptions.value
    default:
      return []
  }
})

function onFieldChange(value: number) {
  switch (props.field) {
    case 'unitType':
      emit('update:unitType', value)
      break
    case 'precision':
      emit('update:precision', value)
      break
    case 'lengthUnit':
      emit('update:lengthUnit', value)
      break
  }
}
</script>

<style scoped>
.ml-ribbon-measure-units {
  --ml-ribbon-measure-units-scale: var(--ml-rb-scale, 1);
  display: grid;
  grid-template-columns: max-content auto;
  align-items: center;
  row-gap: calc(4px * var(--ml-ribbon-measure-units-scale));
  column-gap: calc(6px * var(--ml-ribbon-measure-units-scale));
}

.ml-ribbon-measure-units :deep(.el-form-item) {
  display: contents;
  margin-bottom: 0;
}

.ml-ribbon-measure-units :deep(.el-form-item__label) {
  width: auto !important;
  font-size: calc(11px * var(--ml-ribbon-measure-units-scale));
  padding-right: 0;
  justify-content: flex-start;
}

.ml-ribbon-measure-units :deep(.el-form-item__content) {
  margin-left: 0 !important;
}

.ml-ribbon-measure-units__control {
  width: calc(132px * var(--ml-ribbon-measure-units-scale));
}

.ml-ribbon-measure-unit-field {
  --ml-ribbon-measure-unit-scale: var(--ml-rb-scale, 1);
  display: inline-flex;
  align-items: center;
  gap: calc(6px * var(--ml-ribbon-measure-unit-scale));
  width: 100%;
  min-height: var(--ml-rb-compact-height, 28px);
}

.ml-ribbon-measure-unit-field__label {
  flex: 0 0 auto;
  font-size: calc(11px * var(--ml-ribbon-measure-unit-scale));
  color: var(--el-text-color-regular);
  white-space: nowrap;
}

.ml-ribbon-measure-unit-field__control {
  flex: 1 1 auto;
  min-width: 0;
  width: calc(132px * var(--ml-ribbon-measure-unit-scale));
}

.ml-ribbon-measure-unit-field__control :deep(.el-select) {
  width: 100%;
}
</style>
