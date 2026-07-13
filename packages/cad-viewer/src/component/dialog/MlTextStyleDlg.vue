<template>
  <ml-base-dialog
    v-model:modelValue="visible"
    :title="t('dialog.textStyleDlg.title')"
    :width="600"
    @open="handleOpen"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <div class="ml-text-style-dlg">
      <div class="ml-text-style-dlg__current">
        {{
          t('dialog.textStyleDlg.currentStyle', {
            name: currentStyleName || '—'
          })
        }}
      </div>

      <div class="ml-text-style-dlg__layout">
        <div class="ml-text-style-dlg__left">
          <div class="ml-text-style-dlg__list-label">
            {{ t('dialog.textStyleDlg.styles') }}
          </div>
          <div class="ml-text-style-dlg__left-stack">
            <div class="ml-text-style-dlg__list-box">
              <el-scrollbar class="ml-text-style-dlg__list-scroll">
                <ul class="ml-text-style-dlg__list" role="listbox">
                  <li
                    v-for="name in styleNames"
                    :key="name"
                    class="ml-text-style-dlg__list-item"
                    :class="{
                      'ml-text-style-dlg__list-item--active':
                        name === selectedName
                    }"
                    role="option"
                    :aria-selected="name === selectedName"
                    @click="selectStyle(name)"
                  >
                    {{ name }}
                  </li>
                </ul>
              </el-scrollbar>
            </div>

            <div class="ml-text-style-dlg__preview" aria-hidden="true">
              <span
                class="ml-text-style-dlg__preview-text"
                :style="previewStyle"
              >
                {{ previewText }}
              </span>
            </div>
          </div>
        </div>

        <div class="ml-text-style-dlg__center">
          <div class="ml-text-style-dlg__settings">
            <div class="ml-text-style-dlg__settings-row">
              <ml-fieldset-group
                :title="t('dialog.textStyleDlg.fontSection')"
                class="ml-text-style-dlg__fieldset"
              >
                <div class="ml-text-style-dlg__pair-grid">
                  <div class="ml-text-style-dlg__pair-col">
                    <el-form
                      label-position="top"
                      class="ml-text-style-dlg__form"
                    >
                      <el-form-item :label="t('dialog.textStyleDlg.fontName')">
                        <el-select
                          v-model="form.font"
                          filterable
                          class="ml-text-style-dlg__control"
                          @change="handleFontChange"
                        >
                          <el-option
                            v-for="opt in fontOptions"
                            :key="opt.value"
                            :label="opt.label"
                            :value="opt.value"
                          />
                        </el-select>
                      </el-form-item>
                      <el-form-item class="ml-text-style-dlg__form-item--plain">
                        <el-checkbox
                          v-model="form.useBigFont"
                          :disabled="!bigFontSupported"
                        >
                          {{ t('dialog.textStyleDlg.useBigFont') }}
                        </el-checkbox>
                      </el-form-item>
                    </el-form>
                  </div>
                  <div class="ml-text-style-dlg__pair-col">
                    <el-form
                      v-if="form.useBigFont"
                      label-position="top"
                      class="ml-text-style-dlg__form"
                    >
                      <el-form-item
                        :label="t('dialog.textStyleDlg.bigFontName')"
                      >
                        <el-select
                          v-model="form.bigFont"
                          filterable
                          class="ml-text-style-dlg__control"
                        >
                          <el-option
                            v-for="opt in bigFontOptions"
                            :key="opt.value"
                            :label="opt.label"
                            :value="opt.value"
                          />
                        </el-select>
                      </el-form-item>
                    </el-form>
                    <el-form
                      v-else
                      label-position="top"
                      class="ml-text-style-dlg__form"
                    >
                      <el-form-item :label="t('dialog.textStyleDlg.fontStyle')">
                        <el-select
                          v-model="form.fontStyle"
                          :disabled="!fontStyleEnabled"
                          class="ml-text-style-dlg__control"
                          @change="handleFontStyleChange"
                        >
                          <el-option
                            v-for="style in fontStyleOptions"
                            :key="style"
                            :label="style"
                            :value="style"
                          />
                        </el-select>
                      </el-form-item>
                    </el-form>
                  </div>
                </div>
              </ml-fieldset-group>
            </div>

            <div class="ml-text-style-dlg__settings-row">
              <ml-fieldset-group
                :title="t('dialog.textStyleDlg.sizeSection')"
                class="ml-text-style-dlg__fieldset"
              >
                <div class="ml-text-style-dlg__pair-grid">
                  <div class="ml-text-style-dlg__pair-col">
                    <el-form
                      label-position="top"
                      class="ml-text-style-dlg__form"
                    >
                      <el-form-item
                        :label="t('dialog.textStyleDlg.textHeight')"
                      >
                        <el-input-number
                          :key="`${selectedName}-height`"
                          v-model="form.textHeight"
                          :min="0"
                          :step="0.1"
                          :precision="4"
                          controls-position="right"
                          class="ml-text-style-dlg__control"
                        />
                      </el-form-item>
                    </el-form>
                  </div>
                  <div
                    class="ml-text-style-dlg__pair-col ml-text-style-dlg__pair-col--spacer"
                  />
                </div>
              </ml-fieldset-group>
            </div>

            <div class="ml-text-style-dlg__settings-row">
              <ml-fieldset-group
                :title="t('dialog.textStyleDlg.effectsSection')"
                class="ml-text-style-dlg__fieldset"
              >
                <div
                  class="ml-text-style-dlg__pair-grid ml-text-style-dlg__pair-grid--effects"
                >
                  <div
                    class="ml-text-style-dlg__pair-col ml-text-style-dlg__effects-checks"
                  >
                    <el-checkbox v-model="form.upsideDown">
                      {{ t('dialog.textStyleDlg.upsideDown') }}
                    </el-checkbox>
                    <el-checkbox v-model="form.backwards">
                      {{ t('dialog.textStyleDlg.backwards') }}
                    </el-checkbox>
                    <el-checkbox v-model="form.vertical">
                      {{ t('dialog.textStyleDlg.vertical') }}
                    </el-checkbox>
                  </div>
                  <div class="ml-text-style-dlg__pair-col">
                    <el-form
                      label-position="top"
                      class="ml-text-style-dlg__form"
                    >
                      <el-form-item
                        :label="t('dialog.textStyleDlg.widthFactor')"
                      >
                        <el-input-number
                          :key="`${selectedName}-width`"
                          v-model="form.widthFactor"
                          :min="0.01"
                          :step="0.1"
                          :precision="4"
                          controls-position="right"
                          class="ml-text-style-dlg__control"
                        />
                      </el-form-item>
                      <el-form-item
                        :label="t('dialog.textStyleDlg.obliqueAngle')"
                      >
                        <el-input-number
                          :key="`${selectedName}-oblique`"
                          v-model="form.obliqueAngle"
                          :step="1"
                          :precision="0"
                          controls-position="right"
                          class="ml-text-style-dlg__control"
                        />
                      </el-form-item>
                    </el-form>
                  </div>
                </div>
              </ml-fieldset-group>
            </div>
          </div>
        </div>

        <div class="ml-text-style-dlg__actions">
          <el-button
            class="ml-text-style-dlg__action-btn"
            :disabled="!canSetCurrent"
            @click="handleSetCurrent"
          >
            {{ t('dialog.textStyleDlg.setCurrent') }}
          </el-button>
          <el-button class="ml-text-style-dlg__action-btn" @click="handleNew">
            {{ t('dialog.textStyleDlg.new') }}
          </el-button>
          <el-button
            class="ml-text-style-dlg__action-btn"
            :disabled="!canDelete"
            @click="handleDelete"
          >
            {{ t('dialog.textStyleDlg.delete') }}
          </el-button>
        </div>
      </div>
    </div>
  </ml-base-dialog>

  <ml-base-dialog
    v-model:modelValue="newStyleVisible"
    :title="t('dialog.textStyleDlg.newTitle')"
    :width="360"
    :z-index="2200"
    :auto-close="false"
    @open="handleNewDialogOpen"
    @ok="handleNewOk"
    @cancel="handleNewCancel"
  >
    <el-form label-position="top" class="ml-text-style-dlg__new-form">
      <el-form-item :label="t('dialog.textStyleDlg.newStyleName')">
        <el-input
          ref="newStyleInputRef"
          v-model="newStyleName"
          class="ml-text-style-dlg__control"
          @keyup.enter="handleNewOk"
        />
      </el-form-item>
      <div v-if="newStyleError" class="ml-text-style-dlg__new-error">
        {{ newStyleError }}
      </div>
    </el-form>
  </ml-base-dialog>
</template>

<script setup lang="ts">
import {
  ElButton,
  ElCheckbox,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElScrollbar,
  ElSelect
} from 'element-plus'
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useTextStyle } from '../../composable'
import MlBaseDialog from '../common/MlBaseDialog.vue'
import MlFieldsetGroup from '../common/MlFieldsetGroup.vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const { t } = useI18n()

const {
  TEXT_STYLE_PREVIEW: previewText,
  styleNames,
  selectedName,
  currentStyleName,
  form,
  fontOptions,
  bigFontOptions,
  fontStyleEnabled,
  fontStyleOptions,
  bigFontSupported,
  canDelete,
  canSetCurrent,
  previewStyle,
  openDialog,
  revertForm,
  selectStyle,
  handleFontChange,
  handleFontStyleChange,
  saveSelectedStyle,
  setCurrentStyle,
  addStyle,
  deleteSelectedStyle,
  isValidNewTextStyleName
} = useTextStyle()

const visible = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const newStyleVisible = ref(false)
const newStyleName = ref('')
const newStyleError = ref('')
const newStyleInputRef = ref<InstanceType<typeof ElInput>>()

function handleOpen() {
  openDialog()
}

function handleCancel() {
  revertForm()
}

function handleOk() {
  saveSelectedStyle()
}

function handleSetCurrent() {
  if (setCurrentStyle()) {
    ElMessage.success(
      t('dialog.textStyleDlg.setCurrentDone', { name: selectedName.value })
    )
  }
}

function handleNew() {
  newStyleName.value = ''
  newStyleError.value = ''
  newStyleVisible.value = true
}

function handleNewDialogOpen() {
  void nextTick(() => {
    newStyleInputRef.value?.focus()
  })
}

function handleNewCancel() {
  newStyleName.value = ''
  newStyleError.value = ''
}

function handleNewOk() {
  const name = newStyleName.value.trim()
  newStyleError.value = ''

  if (!name) {
    newStyleError.value = t('dialog.textStyleDlg.newNameRequired')
    return
  }
  if (/[;=<>`\\/,]/.test(name)) {
    newStyleError.value = t('dialog.textStyleDlg.invalidName')
    return
  }
  if (!isValidNewTextStyleName(name)) {
    newStyleError.value = t('dialog.textStyleDlg.duplicateName')
    return
  }

  if (addStyle(name)) {
    newStyleVisible.value = false
    newStyleName.value = ''
    ElMessage.success(t('dialog.textStyleDlg.created', { name }))
  }
}

async function handleDelete() {
  const name = selectedName.value
  if (!canDelete.value) return

  try {
    await ElMessageBox.confirm(
      t('dialog.textStyleDlg.deleteConfirm', { name }),
      t('dialog.textStyleDlg.deleteTitle'),
      {
        confirmButtonText: t('dialog.textStyleDlg.delete'),
        cancelButtonText: t('dialog.baseDialog.cancel'),
        type: 'warning'
      }
    )
  } catch {
    return
  }

  if (deleteSelectedStyle()) {
    ElMessage.success(t('dialog.textStyleDlg.deleted', { name }))
  }
}
</script>

<style scoped>
.ml-text-style-dlg__current {
  margin-bottom: 8px;
  color: var(--el-text-color-regular);
}

.ml-text-style-dlg__layout {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr) 100px;
  gap: 10px;
  align-items: stretch;
}

.ml-text-style-dlg__left {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
  width: 100%;
}

.ml-text-style-dlg__list-label {
  margin-bottom: 4px;
  font-weight: 600;
  flex: 0 0 auto;
}

.ml-text-style-dlg__left-stack {
  flex: 1 1 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: minmax(140px, 1fr) auto;
  gap: 8px;
  min-height: 0;
  min-width: 0;
  width: 100%;
}

.ml-text-style-dlg__list-box,
.ml-text-style-dlg__preview {
  grid-column: 1;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  border: 1px solid var(--el-border-color);
  border-radius: 2px;
}

.ml-text-style-dlg__list-box {
  min-height: 0;
  overflow: hidden;
}

.ml-text-style-dlg__list-scroll {
  height: 100%;
  width: 100%;
}

.ml-text-style-dlg__list-scroll :deep(.el-scrollbar) {
  height: 100%;
  width: 100%;
}

.ml-text-style-dlg__list-scroll :deep(.el-scrollbar__wrap) {
  overflow-x: hidden;
}

.ml-text-style-dlg__list-scroll :deep(.el-scrollbar__view) {
  width: 100%;
  box-sizing: border-box;
}

.ml-text-style-dlg__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.ml-text-style-dlg__list-item {
  padding: 2px 8px;
  cursor: pointer;
  user-select: none;
}

.ml-text-style-dlg__list-item:hover {
  background: var(--el-fill-color-light);
}

.ml-text-style-dlg__list-item--active {
  background: var(--el-color-primary);
  color: #fff;
}

.ml-text-style-dlg__preview {
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  overflow: hidden;
}

.ml-text-style-dlg__preview-text {
  display: block;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  font-size: 16px;
  line-height: 1.2;
  text-align: center;
  word-break: break-all;
}

.ml-text-style-dlg__center {
  min-width: 0;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.ml-text-style-dlg__settings {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  flex: 1 1 auto;
  min-height: 0;
}

.ml-text-style-dlg__settings-row {
  min-width: 0;
}

.ml-text-style-dlg__fieldset {
  min-width: 0;
  height: 100%;
}

.ml-text-style-dlg__settings :deep(.ml-fieldset-group) {
  overflow: hidden;
}

.ml-text-style-dlg__settings :deep(.ml-fieldset-group__body) {
  min-width: 0;
  overflow: hidden;
}

/** Two-column body inside each group box (AutoCAD-style). */
.ml-text-style-dlg__pair-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  column-gap: 10px;
  align-items: start;
  min-width: 0;
}

.ml-text-style-dlg__pair-col {
  min-width: 0;
}

.ml-text-style-dlg__pair-col--spacer {
  min-height: 0;
}

.ml-text-style-dlg__pair-grid--effects {
  align-items: stretch;
}

.ml-text-style-dlg__effects-checks {
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  align-self: stretch;
  min-height: 72px;
  padding: 2px 0;
}

.ml-text-style-dlg__effects-checks :deep(.el-checkbox) {
  height: auto;
  margin-right: 0;
  line-height: 1.2;
}

.ml-text-style-dlg__new-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.ml-text-style-dlg__new-error {
  margin-top: 6px;
  color: var(--el-color-danger);
  font-size: var(--ml-dialog-font-size, 12px);
}

.ml-text-style-dlg__form :deep(.el-form-item) {
  margin-bottom: 6px;
}

.ml-text-style-dlg__form :deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

.ml-text-style-dlg__form-item--plain :deep(.el-form-item__content) {
  line-height: 1;
}

.ml-text-style-dlg__control {
  width: 100%;
  max-width: 100%;
}

.ml-text-style-dlg__form :deep(.el-input-number) {
  width: 100%;
  max-width: 100%;
}

.ml-text-style-dlg__form :deep(.el-select) {
  width: 100%;
  max-width: 100%;
}

.ml-text-style-dlg__actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-self: start;
  width: 100%;
  min-width: 0;
}

.ml-text-style-dlg__action-btn {
  width: 100%;
  margin: 0 !important;
}

.ml-text-style-dlg__actions :deep(.el-button) {
  width: 100%;
  margin: 0 !important;
  padding-left: 6px;
  padding-right: 6px;
  justify-content: center;
}

.ml-text-style-dlg__actions :deep(.el-button > span) {
  width: 100%;
  justify-content: center;
}
</style>
