<template>
  <el-form
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
  </el-form>
</template>

<script setup lang="ts">
import { AcDbAngleUnits, AcDbLinearUnits } from '@mlightcad/data-model'
import { ElForm, ElFormItem, ElOption, ElSelect } from 'element-plus'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { drawingUnitPrecisionOptions } from '../../util/drawingUnitPrecision'

/**
 * Length or angle type/precision controls for one Measurement ribbon group.
 *
 * Labels are aligned with CSS grid instead of `label-width="auto"`, which
 * makes ElForm report `unexpected width NaN` when overflow groups are hidden.
 */
interface RibbonMeasurementUnitsPanelProps {
  kind: 'length' | 'angle'
  unitType: number
  precision: number
}

const props = defineProps<RibbonMeasurementUnitsPanelProps>()

const emit = defineEmits<{
  (e: 'update:unitType', value: number): void
  (e: 'update:precision', value: number): void
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
</style>
