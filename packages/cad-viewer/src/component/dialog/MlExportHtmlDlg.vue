<template>
  <ml-base-dialog
    v-model:modelValue="visible"
    :title="t('dialog.exportHtmlDlg.title')"
    :width="520"
    @open="handleOpen"
    @ok="handleOk"
  >
    <div class="ml-export-html-dlg">
      <el-tabs v-model="activeTab" class="ml-export-html-dlg__tabs">
        <el-tab-pane
          :label="t('dialog.exportHtmlDlg.tabExport')"
          name="export"
        >
          <div class="ml-export-html-dlg__tab-body">
            <div class="ml-export-html-dlg__settings-row">
              <ml-fieldset-group
                :title="t('dialog.exportHtmlDlg.layersSection')"
                class="ml-export-html-dlg__section"
              >
                <div class="ml-export-html-dlg__toggle-row">
                  <div class="ml-export-html-dlg__toggle-copy">
                    <span class="ml-export-html-dlg__toggle-label">{{
                      t('dialog.exportHtmlDlg.exportInvisibleLayers')
                    }}</span>
                    <span class="ml-export-html-dlg__toggle-hint">{{
                      t('dialog.exportHtmlDlg.exportInvisibleLayersHint')
                    }}</span>
                  </div>
                  <el-switch
                    v-model="form.exportInvisibleLayers"
                    :active-text="t('dialog.exportHtmlDlg.yes')"
                    :inactive-text="t('dialog.exportHtmlDlg.no')"
                    inline-prompt
                  />
                </div>
              </ml-fieldset-group>

              <ml-fieldset-group
                :title="t('dialog.exportHtmlDlg.layoutsSection')"
                class="ml-export-html-dlg__section"
              >
                <div class="ml-export-html-dlg__toggle-row">
                  <div class="ml-export-html-dlg__toggle-copy">
                    <span class="ml-export-html-dlg__toggle-label">{{
                      t('dialog.exportHtmlDlg.exportLayouts')
                    }}</span>
                    <span class="ml-export-html-dlg__toggle-hint">{{
                      t('dialog.exportHtmlDlg.exportLayoutsHint')
                    }}</span>
                  </div>
                  <el-switch
                    v-model="form.exportLayouts"
                    :active-text="t('dialog.exportHtmlDlg.yes')"
                    :inactive-text="t('dialog.exportHtmlDlg.no')"
                    inline-prompt
                  />
                </div>
              </ml-fieldset-group>
            </div>

            <ml-fieldset-group
              :title="t('dialog.exportHtmlDlg.initialView')"
              class="ml-export-html-dlg__section"
            >
              <el-radio-group
                v-model="form.initialView"
                class="ml-export-html-dlg__card-group"
              >
                <label
                  class="ml-export-html-dlg__card"
                  :class="{ 'is-selected': form.initialView === 'fit' }"
                >
                  <el-radio value="fit" class="ml-export-html-dlg__card-radio" />
                  <span class="ml-export-html-dlg__card-body">
                    <span class="ml-export-html-dlg__card-title">{{
                      t('dialog.exportHtmlDlg.initialViewExtents')
                    }}</span>
                    <span class="ml-export-html-dlg__card-hint">{{
                      t('dialog.exportHtmlDlg.initialViewExtentsHint')
                    }}</span>
                  </span>
                </label>
                <label
                  class="ml-export-html-dlg__card"
                  :class="{ 'is-selected': form.initialView === 'current' }"
                >
                  <el-radio
                    value="current"
                    class="ml-export-html-dlg__card-radio"
                  />
                  <span class="ml-export-html-dlg__card-body">
                    <span class="ml-export-html-dlg__card-title">{{
                      t('dialog.exportHtmlDlg.initialViewCurrent')
                    }}</span>
                    <span class="ml-export-html-dlg__card-hint">{{
                      t('dialog.exportHtmlDlg.initialViewCurrentHint')
                    }}</span>
                  </span>
                </label>
              </el-radio-group>
            </ml-fieldset-group>

            <ml-fieldset-group
              :title="t('dialog.exportHtmlDlg.viewerMode')"
              class="ml-export-html-dlg__section"
            >
              <el-radio-group
                v-model="form.viewerMode"
                class="ml-export-html-dlg__card-group"
              >
                <label
                  class="ml-export-html-dlg__card"
                  :class="{ 'is-selected': form.viewerMode === 'view' }"
                >
                  <el-radio value="view" class="ml-export-html-dlg__card-radio" />
                  <span class="ml-export-html-dlg__card-body">
                    <span class="ml-export-html-dlg__card-title">{{
                      t('dialog.exportHtmlDlg.viewerModeView')
                    }}</span>
                    <span class="ml-export-html-dlg__card-hint">{{
                      t('dialog.exportHtmlDlg.viewerModeViewHint')
                    }}</span>
                  </span>
                </label>
                <label
                  class="ml-export-html-dlg__card"
                  :class="{ 'is-selected': form.viewerMode === 'measure' }"
                >
                  <el-radio
                    value="measure"
                    class="ml-export-html-dlg__card-radio"
                  />
                  <span class="ml-export-html-dlg__card-body">
                    <span class="ml-export-html-dlg__card-title">{{
                      t('dialog.exportHtmlDlg.viewerModeMeasure')
                    }}</span>
                    <span class="ml-export-html-dlg__card-hint">{{
                      t('dialog.exportHtmlDlg.viewerModeMeasureHint')
                    }}</span>
                  </span>
                </label>
              </el-radio-group>
            </ml-fieldset-group>
          </div>
        </el-tab-pane>

        <el-tab-pane
          :label="t('dialog.exportHtmlDlg.tabSecurity')"
          name="security"
        >
          <div class="ml-export-html-dlg__tab-body">
            <ml-fieldset-group
              :title="t('dialog.exportHtmlDlg.expirySection')"
              class="ml-export-html-dlg__section"
            >
              <el-radio-group
                v-model="form.expiryDays"
                class="ml-export-html-dlg__expiry-group"
              >
                <el-radio :value="1">{{
                  t('dialog.exportHtmlDlg.expiry1Day')
                }}</el-radio>
                <el-radio :value="7">{{
                  t('dialog.exportHtmlDlg.expiry7Days')
                }}</el-radio>
                <el-radio :value="30">{{
                  t('dialog.exportHtmlDlg.expiry30Days')
                }}</el-radio>
                <el-radio value="never">{{
                  t('dialog.exportHtmlDlg.expiryNever')
                }}</el-radio>
              </el-radio-group>
              <p class="ml-export-html-dlg__section-hint">
                {{ t('dialog.exportHtmlDlg.expiryHint') }}
              </p>
            </ml-fieldset-group>

            <ml-fieldset-group
              :title="t('dialog.exportHtmlDlg.passwordSection')"
              class="ml-export-html-dlg__section"
            >
              <div class="ml-export-html-dlg__password-row">
                <el-input
                  v-model="form.password"
                  type="password"
                  show-password
                  clearable
                  :placeholder="t('dialog.exportHtmlDlg.passwordPlaceholder')"
                  class="ml-export-html-dlg__password-input"
                />
                <div class="ml-export-html-dlg__password-actions">
                  <el-button @click="generatePassword">
                    {{ t('dialog.exportHtmlDlg.generatePassword') }}
                  </el-button>
                  <el-button
                    :disabled="!canCopyPassword"
                    @click="copyPassword"
                  >
                    {{ t('dialog.exportHtmlDlg.copyPassword') }}
                  </el-button>
                </div>
              </div>
              <p class="ml-export-html-dlg__section-hint">
                {{ t('dialog.exportHtmlDlg.passwordHint') }}
              </p>
            </ml-fieldset-group>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </ml-base-dialog>
</template>

<script setup lang="ts">
/**
 * Modal dialog for HTML export (`chtml`): collects {@link AcApHtmlExportOptions}
 * and runs {@link AcApHtmlConvertor.convert} after OK. Command-line export without
 * this UI is available via `-chtml`.
 */
import type {
  AcApHtmlExportOptions,
  AcApHtmlExpiryDays,
  AcExInitialViewMode,
  AcExViewerMode
} from '@mlightcad/cad-html-plugin'
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import {
  ElButton,
  ElInput,
  ElMessage,
  ElRadio,
  ElRadioGroup,
  ElSwitch,
  ElTabPane,
  ElTabs
} from 'element-plus'
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import MlBaseDialog from '../common/MlBaseDialog.vue'
import MlFieldsetGroup from '../common/MlFieldsetGroup.vue'

/**
 * Public props for {@link MlExportHtmlDlg}.
 *
 * @remarks
 * Registered as `ExportHtmlDlg` in the dialog manager; parents bind `v-model`
 * to control visibility.
 */
export interface MlExportHtmlDlgProps {
  /**
   * Controls dialog visibility; use with `v-model` / `update:modelValue`.
   */
  modelValue: boolean
}

/**
 * Reactive form fields edited in the export HTML dialog.
 *
 * @remarks
 * Values mirror {@link AcApHtmlExportOptions} and are reset to package defaults
 * each time the dialog opens.
 */
export interface MlExportHtmlDlgForm {
  /**
   * When `true`, off/frozen layer geometry is included in the exported snapshot.
   */
  exportInvisibleLayers: boolean
  /**
   * When `true`, paper-space layouts are included in the exported snapshot.
   */
  exportLayouts: boolean
  /**
   * Initial framing when the exported HTML is opened (`fit` = zoom extents).
   */
  initialView: AcExInitialViewMode
  /**
   * Offline viewer capability profile (`view` omits measurement tools and OSNAP data).
   */
  viewerMode: AcExViewerMode
  /** How long the exported HTML remains valid. */
  expiryDays: AcApHtmlExpiryDays
  /** Optional password required to open the exported HTML. */
  password: string
}

/**
 * Emits supported by {@link MlExportHtmlDlg}.
 */
export type MlExportHtmlDlgEmits = {
  (e: 'update:modelValue', value: boolean): void
}

const PASSWORD_CHARS =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

const props = defineProps<MlExportHtmlDlgProps>()

const emit = defineEmits<MlExportHtmlDlgEmits>()

const { t } = useI18n()

const activeTab = ref<'export' | 'security'>('export')

/** Bridges `v-model` on the base dialog to `modelValue` / `update:modelValue`. */
const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v)
})

/** Whether the current password can be copied to the clipboard. */
const canCopyPassword = computed(() => form.password.trim().length > 0)

/** Export options bound to the dialog form controls. */
const form = reactive<MlExportHtmlDlgForm>({
  exportInvisibleLayers: true,
  exportLayouts: true,
  initialView: 'fit',
  viewerMode: 'measure',
  expiryDays: 'never',
  password: ''
})

/**
 * Restores {@link form} to HTML export package defaults.
 */
function resetForm() {
  form.exportInvisibleLayers = true
  form.exportLayouts = true
  form.initialView = 'fit'
  form.viewerMode = 'measure'
  form.expiryDays = 'never'
  form.password = ''
  activeTab.value = 'export'
}

/**
 * Fills {@link form.password} with a random alphanumeric string.
 */
function generatePassword() {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  form.password = Array.from(
    bytes,
    byte => PASSWORD_CHARS[byte % PASSWORD_CHARS.length]!
  ).join('')
}

/**
 * Copies the current password to the clipboard.
 */
async function copyPassword() {
  const password = form.password.trim()
  if (!password) {
    return
  }
  try {
    await navigator.clipboard.writeText(password)
    ElMessage({
      message: t('dialog.exportHtmlDlg.copyPasswordSuccess'),
      grouping: true,
      type: 'success'
    })
  } catch {
    ElMessage({
      message: t('dialog.exportHtmlDlg.copyPasswordFailed'),
      grouping: true,
      type: 'error'
    })
  }
}

/**
 * Invoked when the dialog opens; resets the form so each export starts from defaults.
 */
function handleOpen() {
  resetForm()
}

/**
 * Confirms export: lazy-loads the HTML plugin, then converts and downloads the drawing.
 *
 * @remarks
 * Loads `@mlightcad/cad-html-plugin` on demand via the `-chtml` lazy trigger.
 * Errors are shown in the command line message area; the dialog closes on OK
 * regardless of export outcome ({@link MlBaseDialog} `autoClose` default).
 */
async function handleOk() {
  const docManager = AcApDocManager.instance
  const document = docManager.curDocument
  const view = docManager.curView

  const options: AcApHtmlExportOptions = {
    exportInvisibleLayers: form.exportInvisibleLayers,
    exportLayouts: form.exportLayouts,
    initialView: form.initialView,
    viewerMode: form.viewerMode,
    expiryDays: form.expiryDays,
    password: form.password.trim() || undefined
  }

  try {
    const loaded = await docManager.pluginManager.loadByTrigger('-chtml')
    if (!loaded) {
      throw new Error(
        'HTML export plugin is not available. Install @mlightcad/cad-html-plugin.'
      )
    }

    const { AcApHtmlConvertor, getHtmlPluginOptions, resolveAcApHtmlExportOptions } =
      await import('@mlightcad/cad-html-plugin')
    const converter = new AcApHtmlConvertor(getHtmlPluginOptions())
    await converter.convert(
      document.fileName || document.docTitle,
      resolveAcApHtmlExportOptions(options),
      view
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    docManager.editor.showMessage(message, 'error')
  }
}
</script>

<style scoped>
.ml-export-html-dlg {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.ml-export-html-dlg__tabs {
  min-height: 0;
}

.ml-export-html-dlg__tab-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 4px;
}

.ml-export-html-dlg__settings-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  min-width: 0;
}

.ml-export-html-dlg__section {
  min-width: 0;
}

.ml-export-html-dlg__toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ml-export-html-dlg__toggle-row :deep(.el-switch) {
  flex: 0 0 auto;
}

.ml-export-html-dlg__toggle-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.ml-export-html-dlg__toggle-label {
  font-size: var(--ml-dialog-font-size, 12px);
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.4;
}

.ml-export-html-dlg__toggle-hint,
.ml-export-html-dlg__section-hint {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  line-height: 1.35;
}

.ml-export-html-dlg__section-hint {
  margin: 8px 0 0;
}

.ml-export-html-dlg__card-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: 100%;
}

.ml-export-html-dlg__card {
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

.ml-export-html-dlg__card:hover {
  border-color: var(--el-color-primary-light-5);
}

.ml-export-html-dlg__card.is-selected {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  box-shadow: inset 0 0 0 1px var(--el-color-primary-light-7);
}

.ml-export-html-dlg__card-radio {
  flex: 0 0 auto;
  margin-right: 0;
  height: auto;
}

.ml-export-html-dlg__card-radio :deep(.el-radio__label) {
  display: none;
}

.ml-export-html-dlg__card-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.ml-export-html-dlg__card-title {
  font-size: var(--ml-dialog-font-size, 12px);
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.35;
}

.ml-export-html-dlg__card-hint {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  line-height: 1.35;
}

.ml-export-html-dlg__expiry-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 12px;
  width: 100%;
}

.ml-export-html-dlg__password-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ml-export-html-dlg__password-input {
  flex: 1 1 auto;
  min-width: 0;
}

.ml-export-html-dlg__password-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.ml-export-html-dlg__password-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.ml-export-html-dlg :deep(.el-tabs__header) {
  margin-bottom: 8px;
}
</style>
