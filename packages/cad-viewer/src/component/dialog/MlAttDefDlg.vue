<template>
  <ml-base-dialog
    v-model:modelValue="visible"
    :title="t('dialog.attDefDlg.title')"
    :width="560"
    :auto-close="false"
    @open="handleOpen"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <div class="ml-att-def-dlg">
      <div class="ml-att-def-dlg__grid">
        <!-- Mode -->
        <ml-fieldset-group
          :title="t('dialog.attDefDlg.modeSection')"
          class="ml-att-def-dlg__pane"
        >
          <div class="ml-att-def-dlg__mode-list">
            <el-checkbox v-model="form.invisible">
              {{ t('dialog.attDefDlg.invisible') }}
            </el-checkbox>
            <el-checkbox v-model="form.constant">
              {{ t('dialog.attDefDlg.constant') }}
            </el-checkbox>
            <el-checkbox v-model="form.verify">
              {{ t('dialog.attDefDlg.verify') }}
            </el-checkbox>
            <el-checkbox v-model="form.preset">
              {{ t('dialog.attDefDlg.preset') }}
            </el-checkbox>
            <el-checkbox v-model="form.lockPosition">
              {{ t('dialog.attDefDlg.lockPosition') }}
            </el-checkbox>
            <el-checkbox v-model="form.multipleLines">
              {{ t('dialog.attDefDlg.multipleLines') }}
            </el-checkbox>
          </div>
        </ml-fieldset-group>

        <!-- Attribute -->
        <ml-fieldset-group
          :title="t('dialog.attDefDlg.attributeSection')"
          class="ml-att-def-dlg__pane"
        >
          <el-form
            label-position="left"
            label-width="72px"
            class="ml-att-def-dlg__form"
          >
            <el-form-item :label="t('dialog.attDefDlg.tag')">
              <el-input ref="tagInputRef" v-model="form.tag" />
            </el-form-item>
            <el-form-item :label="t('dialog.attDefDlg.prompt')">
              <el-input v-model="form.prompt" :disabled="form.constant" />
            </el-form-item>
            <el-form-item :label="t('dialog.attDefDlg.default')">
              <el-input v-model="form.defaultValue" />
            </el-form-item>
          </el-form>
        </ml-fieldset-group>

        <!-- Insertion Point -->
        <ml-fieldset-group
          :title="t('dialog.attDefDlg.insertionSection')"
          class="ml-att-def-dlg__pane"
          :disabled="form.alignBelow"
        >
          <el-checkbox
            v-model="form.specifyOnScreen"
            class="ml-att-def-dlg__specify"
          >
            {{ t('dialog.attDefDlg.specifyOnScreen') }}
          </el-checkbox>
          <el-form
            label-position="left"
            label-width="28px"
            class="ml-att-def-dlg__form ml-att-def-dlg__xyz"
            :disabled="form.specifyOnScreen || form.alignBelow"
          >
            <el-form-item label="X:">
              <el-input-number
                v-model="form.x"
                :step="1"
                controls-position="right"
                class="ml-att-def-dlg__control"
              />
            </el-form-item>
            <el-form-item label="Y:">
              <el-input-number
                v-model="form.y"
                :step="1"
                controls-position="right"
                class="ml-att-def-dlg__control"
              />
            </el-form-item>
            <el-form-item label="Z:">
              <el-input-number
                v-model="form.z"
                :step="1"
                controls-position="right"
                class="ml-att-def-dlg__control"
              />
            </el-form-item>
          </el-form>
        </ml-fieldset-group>

        <!-- Text Settings -->
        <ml-fieldset-group
          :title="t('dialog.attDefDlg.textSection')"
          class="ml-att-def-dlg__pane"
          :disabled="form.alignBelow"
        >
          <el-form
            label-position="left"
            label-width="100px"
            class="ml-att-def-dlg__form"
          >
            <el-form-item :label="t('dialog.attDefDlg.justification')">
              <el-select
                v-model="form.justification"
                class="ml-att-def-dlg__control"
              >
                <el-option
                  v-for="opt in justificationOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item :label="t('dialog.attDefDlg.textStyle')">
              <el-select
                v-model="form.styleName"
                filterable
                class="ml-att-def-dlg__control"
              >
                <el-option
                  v-for="name in textStyleNames"
                  :key="name"
                  :label="name"
                  :value="name"
                />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-checkbox v-model="form.annotative" disabled>
                {{ t('dialog.attDefDlg.annotative') }}
              </el-checkbox>
            </el-form-item>
            <el-form-item :label="t('dialog.attDefDlg.height')">
              <div class="ml-att-def-dlg__with-pick">
                <el-input-number
                  v-model="form.height"
                  :min="0"
                  :step="0.1"
                  controls-position="right"
                  class="ml-att-def-dlg__control"
                />
                <el-button
                  :icon="selectIcon"
                  :disabled="isPicking"
                  @click="pickHeight"
                />
              </div>
            </el-form-item>
            <el-form-item :label="t('dialog.attDefDlg.rotation')">
              <div class="ml-att-def-dlg__with-pick">
                <el-input-number
                  v-model="form.rotationDeg"
                  :step="1"
                  controls-position="right"
                  class="ml-att-def-dlg__control"
                />
                <el-button
                  :icon="selectIcon"
                  :disabled="isPicking"
                  @click="pickRotation"
                />
              </div>
            </el-form-item>
            <el-form-item :label="t('dialog.attDefDlg.boundaryWidth')">
              <el-input-number
                v-model="form.boundaryWidth"
                :min="0"
                :step="0.1"
                :disabled="!form.multipleLines"
                controls-position="right"
                class="ml-att-def-dlg__control"
              />
            </el-form-item>
          </el-form>
        </ml-fieldset-group>
      </div>

      <el-checkbox v-model="form.alignBelow" class="ml-att-def-dlg__align">
        {{ t('dialog.attDefDlg.alignBelow') }}
      </el-checkbox>
    </div>
  </ml-base-dialog>
</template>

<script setup lang="ts">
import {
  AcApDocManager,
  acapRunDatabaseEdit,
  AcEdPromptAngleOptions,
  AcEdPromptDistanceOptions,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '@mlightcad/cad-simple-viewer'
import {
  AcDbAttributeDefinition,
  AcDbMText,
  AcDbTextHorizontalMode,
  AcDbTextVerticalMode,
  AcGePoint3d,
  DEFAULT_TEXT_STYLE
} from '@mlightcad/data-model'
import {
  ElButton,
  ElCheckbox,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElOption,
  ElSelect
} from 'element-plus'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useDialogManager } from '../../composable'
import { select as selectIcon } from '../../svg'
import MlBaseDialog from '../common/MlBaseDialog.vue'
import MlFieldsetGroup from '../common/MlFieldsetGroup.vue'

interface AttDefFormState {
  invisible: boolean
  constant: boolean
  verify: boolean
  preset: boolean
  lockPosition: boolean
  multipleLines: boolean
  specifyOnScreen: boolean
  x: number
  y: number
  z: number
  tag: string
  prompt: string
  defaultValue: string
  justification: string
  styleName: string
  annotative: boolean
  height: number
  rotationDeg: number
  boundaryWidth: number
  alignBelow: boolean
}

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const { t } = useI18n()
const { toggleDialog } = useDialogManager()

const visible = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const tagInputRef = ref<InstanceType<typeof ElInput>>()
const textStyleNames = ref<string[]>([])
const isPicking = ref(false)
/** When true, the next `@open` keeps the in-memory form instead of resetting. */
const preserveFormOnOpen = ref(false)

const form = reactive<AttDefFormState>(createDefaultForm())

// Align / Fit need a second point; omit until two-point placement is supported.
const justificationOptions = computed(() => [
  {
    value: justificationKey(
      AcDbTextHorizontalMode.LEFT,
      AcDbTextVerticalMode.BASELINE
    ),
    label: t('dialog.attDefDlg.justify.left')
  },
  {
    value: justificationKey(
      AcDbTextHorizontalMode.CENTER,
      AcDbTextVerticalMode.BASELINE
    ),
    label: t('dialog.attDefDlg.justify.center')
  },
  {
    value: justificationKey(
      AcDbTextHorizontalMode.RIGHT,
      AcDbTextVerticalMode.BASELINE
    ),
    label: t('dialog.attDefDlg.justify.right')
  },
  {
    value: justificationKey(
      AcDbTextHorizontalMode.MIDDLE,
      AcDbTextVerticalMode.BASELINE
    ),
    label: t('dialog.attDefDlg.justify.middle')
  },
  {
    value: justificationKey(
      AcDbTextHorizontalMode.LEFT,
      AcDbTextVerticalMode.TOP
    ),
    label: t('dialog.attDefDlg.justify.topLeft')
  },
  {
    value: justificationKey(
      AcDbTextHorizontalMode.CENTER,
      AcDbTextVerticalMode.TOP
    ),
    label: t('dialog.attDefDlg.justify.topCenter')
  },
  {
    value: justificationKey(
      AcDbTextHorizontalMode.RIGHT,
      AcDbTextVerticalMode.TOP
    ),
    label: t('dialog.attDefDlg.justify.topRight')
  },
  {
    value: justificationKey(
      AcDbTextHorizontalMode.LEFT,
      AcDbTextVerticalMode.MIDDLE
    ),
    label: t('dialog.attDefDlg.justify.middleLeft')
  },
  {
    value: justificationKey(
      AcDbTextHorizontalMode.CENTER,
      AcDbTextVerticalMode.MIDDLE
    ),
    label: t('dialog.attDefDlg.justify.middleCenter')
  },
  {
    value: justificationKey(
      AcDbTextHorizontalMode.RIGHT,
      AcDbTextVerticalMode.MIDDLE
    ),
    label: t('dialog.attDefDlg.justify.middleRight')
  },
  {
    value: justificationKey(
      AcDbTextHorizontalMode.LEFT,
      AcDbTextVerticalMode.BOTTOM
    ),
    label: t('dialog.attDefDlg.justify.bottomLeft')
  },
  {
    value: justificationKey(
      AcDbTextHorizontalMode.CENTER,
      AcDbTextVerticalMode.BOTTOM
    ),
    label: t('dialog.attDefDlg.justify.bottomCenter')
  },
  {
    value: justificationKey(
      AcDbTextHorizontalMode.RIGHT,
      AcDbTextVerticalMode.BOTTOM
    ),
    label: t('dialog.attDefDlg.justify.bottomRight')
  }
])

function createDefaultForm(): AttDefFormState {
  return {
    invisible: false,
    constant: false,
    verify: false,
    preset: false,
    lockPosition: true,
    multipleLines: false,
    specifyOnScreen: true,
    x: 0,
    y: 0,
    z: 0,
    tag: '',
    prompt: '',
    defaultValue: '',
    justification: justificationKey(
      AcDbTextHorizontalMode.LEFT,
      AcDbTextVerticalMode.BASELINE
    ),
    styleName: DEFAULT_TEXT_STYLE,
    annotative: false,
    height: 2.5,
    rotationDeg: 0,
    boundaryWidth: 0,
    alignBelow: false
  }
}

function resetForm() {
  Object.assign(form, createDefaultForm())
  const db = AcApDocManager.instance?.curDocument?.database
  if (!db) return

  const names: string[] = []
  for (const record of db.tables.textStyleTable.newIterator()) {
    names.push(record.name)
  }
  textStyleNames.value = names.length > 0 ? names : [DEFAULT_TEXT_STYLE]

  const current = db.textstyle || DEFAULT_TEXT_STYLE
  form.styleName = textStyleNames.value.includes(current)
    ? current
    : textStyleNames.value[0]

  const styleRecord = db.tables.textStyleTable.getAt(form.styleName)
  if (styleRecord && styleRecord.textSize > 0) {
    form.height = styleRecord.textSize
  }
}

function justificationKey(
  horizontal: AcDbTextHorizontalMode,
  vertical: AcDbTextVerticalMode
) {
  return `${horizontal}:${vertical}`
}

function parseJustification(key: string): {
  horizontal: AcDbTextHorizontalMode
  vertical: AcDbTextVerticalMode
} {
  const [h, v] = key.split(':').map(Number)
  return {
    horizontal: (Number.isFinite(h)
      ? h
      : AcDbTextHorizontalMode.LEFT) as AcDbTextHorizontalMode,
    vertical: (Number.isFinite(v)
      ? v
      : AcDbTextVerticalMode.BASELINE) as AcDbTextVerticalMode
  }
}

function normalizeTag(tag: string) {
  return tag.trim().replace(/\s+/g, '_').toUpperCase()
}

function degToRad(degrees: number) {
  return (Number(degrees) * Math.PI) / 180
}

function radToDeg(radians: number) {
  return (Number(radians) * 180) / Math.PI
}

function isAttributeDefinition(entity: {
  type?: string
}): entity is AcDbAttributeDefinition {
  return (
    entity instanceof AcDbAttributeDefinition ||
    entity.type === 'AttributeDefinition' ||
    entity.type === 'AttDef'
  )
}

function findLastAttributeDefinition(): AcDbAttributeDefinition | undefined {
  const db = AcApDocManager.instance?.curDocument?.database
  if (!db) return undefined

  let last: AcDbAttributeDefinition | undefined
  for (const entity of db.tables.blockTable.modelSpace.newIterator()) {
    if (isAttributeDefinition(entity)) {
      last = entity as AcDbAttributeDefinition
    }
  }
  return last
}

function applyAlignBelowDefaults() {
  const previous = findLastAttributeDefinition()
  if (!previous) {
    ElMessage.warning(t('dialog.attDefDlg.noPrevious'))
    form.alignBelow = false
    return
  }

  form.styleName = previous.styleName || form.styleName
  form.height = previous.height > 0 ? previous.height : form.height
  form.rotationDeg = radToDeg(previous.rotation)
  form.justification = justificationKey(
    previous.horizontalMode,
    previous.verticalMode
  )
  form.x = previous.position.x
  form.y = previous.position.y - (previous.height > 0 ? previous.height * 1.5 : 3.75)
  form.z = previous.position.z
  form.specifyOnScreen = false
}

async function withDialogHidden<T>(work: () => Promise<T>): Promise<T> {
  isPicking.value = true
  preserveFormOnOpen.value = true
  visible.value = false
  await nextTick()
  try {
    return await work()
  } finally {
    isPicking.value = false
    // Keep form across the reopen → @open cycle.
    preserveFormOnOpen.value = true
    toggleDialog('AttDefDlg', true)
  }
}

async function promptHeightOnScreen(): Promise<number | undefined> {
  const editor = AcApDocManager.instance?.editor
  if (!editor) return undefined

  const options = new AcEdPromptDistanceOptions(
    t('dialog.attDefDlg.promptHeight')
  )
  options.allowNone = false
  options.allowZero = false
  options.allowNegative = false
  const result = await editor.getDistance(options)
  if (result.status !== AcEdPromptStatus.OK || result.value === undefined) {
    return undefined
  }
  if (!(result.value > 0)) {
    return undefined
  }
  return result.value
}

async function pickHeight() {
  const editor = AcApDocManager.instance?.editor
  if (!editor || isPicking.value) return

  await withDialogHidden(async () => {
    const options = new AcEdPromptDistanceOptions(
      t('dialog.attDefDlg.promptHeight')
    )
    options.allowNone = true
    options.allowZero = true
    options.useDefaultValue = true
    options.defaultValue = form.height
    const result = await editor.getDistance(options)
    if (result.status === AcEdPromptStatus.OK && result.value !== undefined) {
      form.height = Math.max(0, result.value)
    }
  })
}

async function pickRotation() {
  const editor = AcApDocManager.instance?.editor
  if (!editor || isPicking.value) return

  await withDialogHidden(async () => {
    const options = new AcEdPromptAngleOptions(
      t('dialog.attDefDlg.promptRotation')
    )
    options.allowNone = true
    options.allowNegative = true
    options.allowZero = true
    options.useDefaultValue = true
    options.defaultValue = degToRad(form.rotationDeg)
    const result = await editor.getAngle(options)
    if (result.status === AcEdPromptStatus.OK && result.value !== undefined) {
      form.rotationDeg = radToDeg(result.value)
    }
  })
}

function buildAttributeDefinition(position: AcGePoint3d): AcDbAttributeDefinition {
  const attDef = new AcDbAttributeDefinition()
  const tag = normalizeTag(form.tag)
  const justify = parseJustification(form.justification)

  attDef.tag = tag
  attDef.prompt = form.constant ? '' : form.prompt
  attDef.textString = form.defaultValue
  attDef.isInvisible = form.invisible
  attDef.isConst = form.constant
  attDef.isVerifiable = form.verify
  attDef.isPreset = form.preset
  attDef.lockPositionInBlock = form.lockPosition
  attDef.position = position
  attDef.alignmentPoint = new AcGePoint3d(position)
  attDef.height = form.height
  attDef.rotation = degToRad(form.rotationDeg)
  attDef.styleName = form.styleName
  attDef.horizontalMode = justify.horizontal
  attDef.verticalMode = justify.vertical

  if (form.multipleLines) {
    const mtext = new AcDbMText()
    mtext.contents = form.defaultValue
    mtext.height = form.height
    mtext.width = form.boundaryWidth
    mtext.location = new AcGePoint3d(position)
    mtext.rotation = degToRad(form.rotationDeg)
    mtext.styleName = form.styleName
    attDef.mtext = mtext
  }

  return attDef
}

async function resolveInsertionPoint(): Promise<AcGePoint3d | undefined> {
  if (form.alignBelow) {
    const previous = findLastAttributeDefinition()
    if (!previous) {
      ElMessage.warning(t('dialog.attDefDlg.noPrevious'))
      return undefined
    }
    const height = previous.height > 0 ? previous.height : form.height
    return new AcGePoint3d(
      previous.position.x,
      previous.position.y - height * 1.5,
      previous.position.z
    )
  }

  if (!form.specifyOnScreen) {
    return new AcGePoint3d(form.x, form.y, form.z)
  }

  const editor = AcApDocManager.instance?.editor
  if (!editor) return undefined

  const options = new AcEdPromptPointOptions(
    t('dialog.attDefDlg.promptInsertionPoint')
  )
  const result = await editor.getPoint(options)
  if (result.status !== AcEdPromptStatus.OK || !result.value) {
    return undefined
  }
  return new AcGePoint3d(result.value)
}

function handleOpen() {
  if (preserveFormOnOpen.value) {
    preserveFormOnOpen.value = false
    return
  }
  resetForm()
  void nextTick(() => {
    tagInputRef.value?.focus?.()
  })
}

function handleCancel() {
  preserveFormOnOpen.value = false
  visible.value = false
}

function reopenDialogPreservingForm() {
  preserveFormOnOpen.value = true
  toggleDialog('AttDefDlg', true)
}

async function handleOk() {
  const tag = normalizeTag(form.tag)
  if (!tag) {
    ElMessage.warning(t('dialog.attDefDlg.tagRequired'))
    return
  }
  form.tag = tag

  const db = AcApDocManager.instance?.curDocument?.database
  if (!db) return

  const needsPointPick = form.specifyOnScreen && !form.alignBelow
  const needsHeightPick = !(form.height > 0)
  const needsScreenInteraction = needsPointPick || needsHeightPick

  if (needsScreenInteraction) {
    preserveFormOnOpen.value = true
    visible.value = false
    await nextTick()
  }

  try {
    const position = await resolveInsertionPoint()
    if (!position) {
      if (needsScreenInteraction) {
        reopenDialogPreservingForm()
      }
      return
    }

    // AutoCAD prompts for height when the dialog value is 0.
    if (!(form.height > 0)) {
      const height = await promptHeightOnScreen()
      if (height === undefined) {
        reopenDialogPreservingForm()
        return
      }
      form.height = height
    }

    const attDef = buildAttributeDefinition(position)
    acapRunDatabaseEdit(db, 'ATTDEF', () => {
      db.tables.blockTable.modelSpace.appendEntity(attDef)
    })
    preserveFormOnOpen.value = false
    visible.value = false
  } catch {
    if (needsScreenInteraction) {
      reopenDialogPreservingForm()
    }
  }
}

// When align-below is toggled on, inherit text settings from previous ATTDEF.
watch(
  () => form.alignBelow,
  checked => {
    if (checked) {
      applyAlignBelowDefaults()
    }
  }
)
</script>

<style scoped>
.ml-att-def-dlg {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ml-att-def-dlg__grid {
  display: grid;
  grid-template-columns: 1fr 1.35fr;
  grid-template-rows: auto auto;
  gap: 6px;
  align-items: stretch;
}

.ml-att-def-dlg__pane {
  min-width: 0;
}

.ml-att-def-dlg :deep(fieldset.ml-fieldset-group) {
  padding: 6px 10px 8px;
}

.ml-att-def-dlg__pane :deep(.ml-fieldset-group__legend) {
  padding: 0 4px;
  margin-left: 2px;
}

.ml-att-def-dlg__mode-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.ml-att-def-dlg__mode-list :deep(.el-checkbox) {
  height: 22px;
  margin-right: 0;
}

.ml-att-def-dlg__form {
  width: 100%;
}

.ml-att-def-dlg__control {
  width: 100%;
}

.ml-att-def-dlg__specify {
  margin-bottom: 2px;
  height: 22px;
}

.ml-att-def-dlg__with-pick {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.ml-att-def-dlg__with-pick .ml-att-def-dlg__control {
  flex: 1 1 auto;
}

.ml-att-def-dlg__align {
  margin-top: 0;
  height: 22px;
}

.ml-att-def-dlg :deep(.el-form-item) {
  margin-bottom: 4px;
}

.ml-att-def-dlg :deep(.el-form-item__label) {
  line-height: 24px;
  height: 24px;
}

.ml-att-def-dlg :deep(.el-form-item__content) {
  line-height: 24px;
  min-height: 24px;
}
</style>
