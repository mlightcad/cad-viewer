<template>
  <ml-base-dialog
    v-model:modelValue="visible"
    :title="t('dialog.drawingUnitsDlg.title')"
    :width="440"
    @open="handleOpen"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <div class="ml-drawing-units-dlg">
      <div class="ml-drawing-units-dlg__grid">
        <ml-fieldset-group
          :title="t('dialog.drawingUnitsDlg.lengthSection')"
          class="ml-drawing-units-dlg__pane"
        >
          <el-form label-position="top" class="ml-drawing-units-dlg__form">
            <el-form-item :label="t('dialog.drawingUnitsDlg.lengthType')">
              <el-select
                v-model="form.lunits"
                class="ml-drawing-units-dlg__control"
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
              <el-input-number
                v-model="form.luprec"
                :min="0"
                :max="8"
                :step="1"
                controls-position="right"
                class="ml-drawing-units-dlg__control"
              />
            </el-form-item>
          </el-form>
        </ml-fieldset-group>

        <ml-fieldset-group
          :title="t('dialog.drawingUnitsDlg.angleSection')"
          class="ml-drawing-units-dlg__pane"
        >
          <el-form label-position="top" class="ml-drawing-units-dlg__form">
            <el-form-item :label="t('dialog.drawingUnitsDlg.angleType')">
              <el-select
                v-model="form.aunits"
                class="ml-drawing-units-dlg__control"
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
              <el-input-number
                v-model="form.auprec"
                :min="0"
                :max="8"
                :step="1"
                controls-position="right"
                class="ml-drawing-units-dlg__control"
              />
            </el-form-item>
            <el-form-item>
              <el-checkbox v-model="clockwiseChecked">{{
                t('dialog.drawingUnitsDlg.clockwise')
              }}</el-checkbox>
            </el-form-item>
          </el-form>
        </ml-fieldset-group>

        <ml-fieldset-group
          :title="t('dialog.drawingUnitsDlg.insertionSection')"
          class="ml-drawing-units-dlg__span-row"
        >
          <el-form label-position="top" class="ml-drawing-units-dlg__form">
            <el-form-item :label="t('dialog.drawingUnitsDlg.insertionUnits')">
              <el-select
                v-model="form.insunits"
                filterable
                class="ml-drawing-units-dlg__control"
              >
                <el-option
                  v-for="opt in insertionUnitOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </el-form>
        </ml-fieldset-group>
      </div>
    </div>
  </ml-base-dialog>
</template>

<script setup lang="ts">
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import {
  AcDbAngleUnits,
  AcDbLinearUnits,
  AcDbSystemVariables,
  AcDbSysVarManager,
  AcDbUnitsValue
} from '@mlightcad/data-model'
import {
  ElCheckbox,
  ElForm,
  ElFormItem,
  ElInputNumber,
  ElOption,
  ElSelect
} from 'element-plus'
import { computed, reactive } from 'vue'
import { useI18n } from 'vue-i18n'

import MlBaseDialog from '../common/MlBaseDialog.vue'
import MlFieldsetGroup from '../common/MlFieldsetGroup.vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const { t } = useI18n()

const visible = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const form = reactive({
  lunits: AcDbLinearUnits.Decimal,
  luprec: 4,
  aunits: AcDbAngleUnits.DecimalDegrees,
  auprec: 0,
  angdir: 0,
  insunits: AcDbUnitsValue.Millimeters
})

/** ANGDIR: 1 = clockwise positive, 0 = counterclockwise (AutoCAD Clockwise checkbox). */
const clockwiseChecked = computed({
  get: () => form.angdir === 1,
  set: (v: boolean) => {
    form.angdir = v ? 1 : 0
  }
})

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

const insertionUnitValues: AcDbUnitsValue[] = [
  AcDbUnitsValue.Undefined,
  AcDbUnitsValue.Inches,
  AcDbUnitsValue.Feet,
  AcDbUnitsValue.Miles,
  AcDbUnitsValue.Millimeters,
  AcDbUnitsValue.Centimeters,
  AcDbUnitsValue.Meters,
  AcDbUnitsValue.Kilometers,
  AcDbUnitsValue.Microinches,
  AcDbUnitsValue.Mils,
  AcDbUnitsValue.Yards,
  AcDbUnitsValue.Angstroms,
  AcDbUnitsValue.Nanometers,
  AcDbUnitsValue.Microns,
  AcDbUnitsValue.Decimeters,
  AcDbUnitsValue.Dekameters,
  AcDbUnitsValue.Hectometers,
  AcDbUnitsValue.Gigameters,
  AcDbUnitsValue.Astronomical,
  AcDbUnitsValue.LightYears,
  AcDbUnitsValue.Parsecs,
  AcDbUnitsValue.USSurveyFeet,
  AcDbUnitsValue.USSurveyInch,
  AcDbUnitsValue.USSurveyYard,
  AcDbUnitsValue.USSurveyMile
]

function insertionUnitLabel(value: AcDbUnitsValue): string {
  switch (value) {
    case AcDbUnitsValue.Undefined:
      return t('dialog.drawingUnitsDlg.insUnits._0')
    case AcDbUnitsValue.Inches:
      return t('dialog.drawingUnitsDlg.insUnits._1')
    case AcDbUnitsValue.Feet:
      return t('dialog.drawingUnitsDlg.insUnits._2')
    case AcDbUnitsValue.Miles:
      return t('dialog.drawingUnitsDlg.insUnits._3')
    case AcDbUnitsValue.Millimeters:
      return t('dialog.drawingUnitsDlg.insUnits._4')
    case AcDbUnitsValue.Centimeters:
      return t('dialog.drawingUnitsDlg.insUnits._5')
    case AcDbUnitsValue.Meters:
      return t('dialog.drawingUnitsDlg.insUnits._6')
    case AcDbUnitsValue.Kilometers:
      return t('dialog.drawingUnitsDlg.insUnits._7')
    case AcDbUnitsValue.Microinches:
      return t('dialog.drawingUnitsDlg.insUnits._8')
    case AcDbUnitsValue.Mils:
      return t('dialog.drawingUnitsDlg.insUnits._9')
    case AcDbUnitsValue.Yards:
      return t('dialog.drawingUnitsDlg.insUnits._10')
    case AcDbUnitsValue.Angstroms:
      return t('dialog.drawingUnitsDlg.insUnits._11')
    case AcDbUnitsValue.Nanometers:
      return t('dialog.drawingUnitsDlg.insUnits._12')
    case AcDbUnitsValue.Microns:
      return t('dialog.drawingUnitsDlg.insUnits._13')
    case AcDbUnitsValue.Decimeters:
      return t('dialog.drawingUnitsDlg.insUnits._14')
    case AcDbUnitsValue.Dekameters:
      return t('dialog.drawingUnitsDlg.insUnits._15')
    case AcDbUnitsValue.Hectometers:
      return t('dialog.drawingUnitsDlg.insUnits._16')
    case AcDbUnitsValue.Gigameters:
      return t('dialog.drawingUnitsDlg.insUnits._17')
    case AcDbUnitsValue.Astronomical:
      return t('dialog.drawingUnitsDlg.insUnits._18')
    case AcDbUnitsValue.LightYears:
      return t('dialog.drawingUnitsDlg.insUnits._19')
    case AcDbUnitsValue.Parsecs:
      return t('dialog.drawingUnitsDlg.insUnits._20')
    case AcDbUnitsValue.USSurveyFeet:
      return t('dialog.drawingUnitsDlg.insUnits._21')
    case AcDbUnitsValue.USSurveyInch:
      return t('dialog.drawingUnitsDlg.insUnits._22')
    case AcDbUnitsValue.USSurveyYard:
      return t('dialog.drawingUnitsDlg.insUnits._23')
    case AcDbUnitsValue.USSurveyMile:
      return t('dialog.drawingUnitsDlg.insUnits._24')
    default:
      return t('dialog.drawingUnitsDlg.insUnits._0')
  }
}

const insertionUnitOptions = computed(() =>
  insertionUnitValues.map(value => ({
    value,
    label: insertionUnitLabel(value)
  }))
)

const VALID_LUNITS = new Set<number>([
  AcDbLinearUnits.Scientific,
  AcDbLinearUnits.Decimal,
  AcDbLinearUnits.Engineering,
  AcDbLinearUnits.Architectural,
  AcDbLinearUnits.Fractional,
  AcDbLinearUnits.WindowsDesktop
])

function clampInt(value: number, min: number, max: number) {
  const n = Math.trunc(Number(value))
  if (Number.isNaN(n)) return min
  return Math.min(max, Math.max(min, n))
}

function normalizeLunits(raw: number) {
  return VALID_LUNITS.has(raw) ? raw : AcDbLinearUnits.Decimal
}

function normalizeAunits(raw: number) {
  return clampInt(raw, 0, 4)
}

function readFormFromDatabase() {
  const db = AcApDocManager.instance.curDocument?.database
  if (!db) return

  form.lunits = normalizeLunits(db.lunits)
  form.luprec = clampInt(db.luprec, 0, 8)
  form.aunits = normalizeAunits(db.aunits)
  form.auprec = clampInt(db.auprec, 0, 8)
  form.angdir = db.angdir === 1 ? 1 : 0
  const ins = clampInt(db.insunits, 0, AcDbUnitsValue.Max)
  form.insunits = ins as AcDbUnitsValue
}

function handleOpen() {
  readFormFromDatabase()
}

function handleCancel() {
  readFormFromDatabase()
}

function handleOk() {
  const db = AcApDocManager.instance.curDocument?.database
  if (!db) return

  const svm = AcDbSysVarManager.instance()
  const lunits = normalizeLunits(form.lunits)
  const luprec = clampInt(form.luprec, 0, 8)
  const aunits = normalizeAunits(form.aunits)
  const auprec = clampInt(form.auprec, 0, 8)
  const angdir = form.angdir === 1 ? 1 : 0
  const insunits = clampInt(form.insunits, 0, AcDbUnitsValue.Max)

  svm.setVar(AcDbSystemVariables.LUNITS, lunits, db)
  svm.setVar(AcDbSystemVariables.LUPREC, luprec, db)
  svm.setVar(AcDbSystemVariables.AUNITS, aunits, db)
  svm.setVar(AcDbSystemVariables.AUPREC, auprec, db)
  svm.setVar(AcDbSystemVariables.ANGDIR, angdir, db)
  svm.setVar(AcDbSystemVariables.INSUNITS, insunits, db)
}
</script>

<style scoped>
.ml-drawing-units-dlg__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 16px;
  row-gap: 12px;
  align-items: stretch;
}

.ml-drawing-units-dlg__pane {
  min-width: 0;
  min-height: 0;
  height: 100%;
}

.ml-drawing-units-dlg__span-row {
  grid-column: 1 / -1;
  min-width: 0;
  min-height: 0;
}

.ml-drawing-units-dlg__form :deep(.el-form-item) {
  margin-bottom: 8px;
}

.ml-drawing-units-dlg__form :deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

.ml-drawing-units-dlg__control {
  width: 100%;
  max-width: 100%;
}
</style>
