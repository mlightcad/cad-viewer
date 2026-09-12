<template>
  <ml-base-dialog
    v-model:modelValue="visible"
    :title="t('dialog.exportPdfDlg.title')"
    :width="480"
    :auto-close="false"
    @open="handleOpen"
    @ok="handleOk"
  >
    <div class="ml-export-pdf-dlg">
      <ml-fieldset-group
        :title="t('dialog.exportPdfDlg.modelSpaceSection')"
        class="ml-export-pdf-dlg__section"
      >
        <el-radio-group
          v-model="form.modelSpaceFit"
          class="ml-export-pdf-dlg__card-group"
        >
          <label
            class="ml-export-pdf-dlg__card"
            :class="{ 'is-selected': form.modelSpaceFit === 'display' }"
          >
            <el-radio
              value="display"
              class="ml-export-pdf-dlg__card-radio"
            />
            <span class="ml-export-pdf-dlg__card-body">
              <span class="ml-export-pdf-dlg__card-title">{{
                t('dialog.exportPdfDlg.modelSpaceDisplay')
              }}</span>
              <span class="ml-export-pdf-dlg__card-hint">{{
                t('dialog.exportPdfDlg.modelSpaceDisplayHint')
              }}</span>
            </span>
          </label>
          <label
            class="ml-export-pdf-dlg__card"
            :class="{ 'is-selected': form.modelSpaceFit === 'extents' }"
          >
            <el-radio
              value="extents"
              class="ml-export-pdf-dlg__card-radio"
            />
            <span class="ml-export-pdf-dlg__card-body">
              <span class="ml-export-pdf-dlg__card-title">{{
                t('dialog.exportPdfDlg.modelSpaceExtents')
              }}</span>
              <span class="ml-export-pdf-dlg__card-hint">{{
                t('dialog.exportPdfDlg.modelSpaceExtentsHint')
              }}</span>
            </span>
          </label>
        </el-radio-group>
      </ml-fieldset-group>

      <ml-fieldset-group
        :title="t('dialog.exportPdfDlg.paperSpaceSection')"
        class="ml-export-pdf-dlg__section"
      >
        <div class="ml-export-pdf-dlg__toggle-row">
          <div class="ml-export-pdf-dlg__toggle-copy">
            <span class="ml-export-pdf-dlg__toggle-label">{{
              t('dialog.exportPdfDlg.exportLayouts')
            }}</span>
            <span class="ml-export-pdf-dlg__toggle-hint">{{
              t('dialog.exportPdfDlg.exportLayoutsHint')
            }}</span>
          </div>
          <el-switch
            v-model="form.exportLayouts"
            :active-text="t('dialog.exportPdfDlg.yes')"
            :inactive-text="t('dialog.exportPdfDlg.no')"
            inline-prompt
          />
        </div>
      </ml-fieldset-group>
    </div>
  </ml-base-dialog>
</template>

<script setup lang="ts">
/**
 * Modal dialog for PDF export (`cpdf`): collects {@link AcApPdfExportOptions}
 * and runs {@link AcApPdfConvertor.convert} after OK. Command-line export
 * without this UI is available via `-cpdf`.
 */
import type {
  AcApPdfExportOptions,
  AcApPdfModelSpaceFit
} from '@mlightcad/cad-pdf-plugin'
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { ElRadio, ElRadioGroup, ElSwitch } from 'element-plus'
import { computed, reactive } from 'vue'
import { useI18n } from 'vue-i18n'

import MlBaseDialog from '../common/MlBaseDialog.vue'
import MlFieldsetGroup from '../common/MlFieldsetGroup.vue'

/**
 * Public props for {@link MlExportPdfDlg}.
 *
 * @remarks
 * Registered as `ExportPdfDlg` in the dialog manager; parents bind `v-model`
 * to control visibility.
 */
export interface MlExportPdfDlgProps {
  /**
   * Controls dialog visibility; use with `v-model` / `update:modelValue`.
   */
  modelValue: boolean
}

/**
 * Reactive form fields edited in the export PDF dialog.
 */
export interface MlExportPdfDlgForm {
  /**
   * Model-space framing: live viewport (`display`) or drawable extents.
   */
  modelSpaceFit: AcApPdfModelSpaceFit
  /**
   * When `true`, every layout is exported as its own PDF page.
   */
  exportLayouts: boolean
}

/**
 * Emits supported by {@link MlExportPdfDlg}.
 */
export type MlExportPdfDlgEmits = {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<MlExportPdfDlgProps>()

const emit = defineEmits<MlExportPdfDlgEmits>()

const { t } = useI18n()

/** Bridges `v-model` on the base dialog to `modelValue` / `update:modelValue`. */
const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v)
})

/** Export options bound to the dialog form controls. */
const form = reactive<MlExportPdfDlgForm>({
  modelSpaceFit: 'extents',
  exportLayouts: true
})

/**
 * Restores {@link form} to PDF export package defaults.
 */
function resetForm() {
  form.modelSpaceFit = 'extents'
  form.exportLayouts = true
}

/**
 * Invoked when the dialog opens; resets the form so each export starts from defaults.
 */
function handleOpen() {
  resetForm()
}

/**
 * Confirms export: lazy-loads the PDF plugin, then converts and downloads the drawing.
 */
async function handleOk() {
  const docManager = AcApDocManager.instance
  const options: AcApPdfExportOptions = {
    modelSpaceFit: form.modelSpaceFit,
    exportLayouts: form.exportLayouts
  }

  try {
    const loaded = await docManager.pluginManager.loadByTrigger('-cpdf')
    if (!loaded) {
      throw new Error(
        'PDF export plugin is not available. Install @mlightcad/cad-pdf-plugin.'
      )
    }

    const { AcApPdfConvertor, resolveAcApPdfExportOptions } = await import(
      '@mlightcad/cad-pdf-plugin'
    )
    const converter = new AcApPdfConvertor()
    await converter.convert(
      docManager.context,
      resolveAcApPdfExportOptions(options)
    )
    visible.value = false
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    docManager.editor.showMessage(message, 'error')
    visible.value = false
  }
}
</script>

<style scoped>
.ml-export-pdf-dlg {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.ml-export-pdf-dlg__section {
  min-width: 0;
}

.ml-export-pdf-dlg__toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ml-export-pdf-dlg__toggle-row :deep(.el-switch) {
  flex: 0 0 auto;
}

.ml-export-pdf-dlg__toggle-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.ml-export-pdf-dlg__toggle-label {
  font-size: var(--ml-dialog-font-size, 12px);
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.4;
}

.ml-export-pdf-dlg__toggle-hint {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  line-height: 1.35;
}

.ml-export-pdf-dlg__card-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: 100%;
  align-items: stretch;
}

.ml-export-pdf-dlg__card {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  padding: 10px 10px 10px 8px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background: var(--el-fill-color-blank);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    box-shadow 0.15s ease;
}

.ml-export-pdf-dlg__card:hover {
  border-color: var(--el-color-primary-light-5);
}

.ml-export-pdf-dlg__card.is-selected {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  box-shadow: inset 0 0 0 1px var(--el-color-primary-light-7);
}

.ml-export-pdf-dlg__card-radio {
  flex: 0 0 auto;
  margin-right: 0;
  height: auto;
}

.ml-export-pdf-dlg__card-radio :deep(.el-radio__label) {
  display: none;
}

.ml-export-pdf-dlg__card-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.ml-export-pdf-dlg__card-title {
  font-size: var(--ml-dialog-font-size, 12px);
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.35;
}

.ml-export-pdf-dlg__card-hint {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  line-height: 1.35;
}
</style>
