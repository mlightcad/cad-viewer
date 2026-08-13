<template>
  <div class="ml-ribbon-measure-units">
    <ml-fieldset-group
      :title="t('dialog.drawingUnitsDlg.lengthSection')"
    >
      <el-form
        label-position="left"
        label-width="auto"
        class="ml-ribbon-measure-units__form"
        size="small"
      >
        <el-form-item :label="t('dialog.drawingUnitsDlg.lengthType')">
          <el-select
            :model-value="lunits"
            class="ml-ribbon-measure-units__control"
            @update:model-value="emit('update:lunits', $event)"
          >
            <el-option
              v-for="opt in linearUnitOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('dialog.drawingUnitsDlg.lengthPrecision')">
          <el-select
            :model-value="luprec"
            class="ml-ribbon-measure-units__control"
            @update:model-value="emit('update:luprec', $event)"
          >
            <el-option
              v-for="opt in lengthPrecisionOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </ml-fieldset-group>

    <ml-fieldset-group
      :title="t('dialog.drawingUnitsDlg.angleSection')"
    >
      <el-form
        label-position="left"
        label-width="auto"
        class="ml-ribbon-measure-units__form"
        size="small"
      >
        <el-form-item :label="t('dialog.drawingUnitsDlg.angleType')">
          <el-select
            :model-value="aunits"
            class="ml-ribbon-measure-units__control"
            @update:model-value="emit('update:aunits', $event)"
          >
            <el-option
              v-for="opt in angleUnitOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('dialog.drawingUnitsDlg.anglePrecision')">
          <el-select
            :model-value="auprec"
            class="ml-ribbon-measure-units__control"
            @update:model-value="emit('update:auprec', $event)"
          >
            <el-option
              v-for="opt in anglePrecisionOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </ml-fieldset-group>
  </div>
</template>

<script setup lang="ts">
import { AcDbAngleUnits, AcDbLinearUnits } from '@mlightcad/data-model'
import { ElForm, ElFormItem, ElOption, ElSelect } from 'element-plus'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { drawingUnitPrecisionOptions } from '../../util/drawingUnitPrecision'
import MlFieldsetGroup from '../common/MlFieldsetGroup.vue'

/**
 * Compact Length / Angle type and precision controls for the Measurement ribbon.
 */
interface RibbonMeasurementUnitsPanelProps {
  lunits: number
  luprec: number
  aunits: number
  auprec: number
}

const props = defineProps<RibbonMeasurementUnitsPanelProps>()

const emit = defineEmits<{
  (e: 'update:lunits', value: number): void
  (e: 'update:luprec', value: number): void
  (e: 'update:aunits', value: number): void
  (e: 'update:auprec', value: number): void
}>()

const { t } = useI18n()

const linearUnitOptions = computed(() => [
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
])

const angleUnitOptions = computed(() => [
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
])

const lengthPrecisionOptions = computed(() =>
  drawingUnitPrecisionOptions(props.luprec)
)

const anglePrecisionOptions = computed(() =>
  drawingUnitPrecisionOptions(props.auprec)
)
</script>

<style scoped>
.ml-ribbon-measure-units {
  --ml-ribbon-measure-units-scale: var(--ml-rb-scale, 1);
  display: flex;
  align-items: stretch;
  gap: calc(8px * var(--ml-ribbon-measure-units-scale));
}

.ml-ribbon-measure-units :deep(.ml-fieldset-group) {
  min-width: 0;
  padding: calc(4px * var(--ml-ribbon-measure-units-scale))
    calc(8px * var(--ml-ribbon-measure-units-scale))
    calc(6px * var(--ml-ribbon-measure-units-scale));
}

.ml-ribbon-measure-units :deep(.ml-fieldset-group__legend) {
  font-size: calc(11px * var(--ml-ribbon-measure-units-scale));
  font-weight: 600;
}

.ml-ribbon-measure-units__form :deep(.el-form-item) {
  margin-bottom: calc(4px * var(--ml-ribbon-measure-units-scale));
}

.ml-ribbon-measure-units__form :deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

.ml-ribbon-measure-units__form :deep(.el-form-item__label) {
  font-size: calc(11px * var(--ml-ribbon-measure-units-scale));
  padding-right: calc(6px * var(--ml-ribbon-measure-units-scale));
}

.ml-ribbon-measure-units__control {
  width: calc(132px * var(--ml-ribbon-measure-units-scale));
}
</style>
