<template>
  <ml-base-dialog
    v-model:modelValue="visible"
    :title="t('dialog.bconvertDlg.title')"
    :width="480"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <div class="ml-bconvert-dlg">
      <el-radio-group v-model="draft.target" class="ml-bconvert-dlg__target">
        <el-radio value="new">{{ t('dialog.bconvertDlg.newBlock') }}</el-radio>
        <el-radio value="existing" :disabled="state.blockNames.length === 0">
          {{ t('dialog.bconvertDlg.existingBlock') }}
        </el-radio>
      </el-radio-group>

      <ml-fieldset-group
        v-if="draft.target === 'new'"
        :title="t('dialog.bconvertDlg.newBlock')"
      >
        <el-form label-position="left" label-width="120px">
          <el-form-item :label="t('dialog.bconvertDlg.name')">
            <el-input v-model="draft.name" data-testid="bconvert-name" />
          </el-form-item>
        </el-form>
      </ml-fieldset-group>

      <ml-fieldset-group v-else :title="t('dialog.bconvertDlg.existingBlock')">
        <el-form label-position="left" label-width="120px">
          <el-form-item :label="t('dialog.bconvertDlg.block')">
            <el-select v-model="draft.existingBlock" filterable>
              <el-option
                v-for="name in orderedBlockNames"
                :key="name"
                :label="
                  isEquivalent(name)
                    ? t('dialog.bconvertDlg.matchingBlock', { name })
                    : name
                "
                :value="name"
              />
            </el-select>
          </el-form-item>
          <template v-if="!selectedIsEquivalent">
            <el-form-item :label="t('dialog.bconvertDlg.rotation')">
              <el-input-number v-model="draft.rotation" :step="90" />
            </el-form-item>
            <el-form-item :label="t('dialog.bconvertDlg.scale')">
              <el-input-number
                v-model="draft.scale"
                :min="0.000001"
                :step="0.1"
              />
            </el-form-item>
          </template>
          <div v-else class="ml-bconvert-dlg__hint">
            {{ t('dialog.bconvertDlg.autoPlacement') }}
          </div>
        </el-form>
      </ml-fieldset-group>

      <ml-fieldset-group
        v-if="draft.target === 'new' || !selectedIsEquivalent"
        :title="t('dialog.bconvertDlg.insertionPoint')"
      >
        <div class="ml-bconvert-dlg__point">
          <span>X</span>
          <el-input-number v-model="draft.basePoint.x" :controls="false" />
          <span>Y</span>
          <el-input-number v-model="draft.basePoint.y" :controls="false" />
          <el-button @click="handlePick">
            {{ t('dialog.bconvertDlg.pick') }}
          </el-button>
          <el-button @click="handleCenter">
            {{ t('dialog.bconvertDlg.center') }}
          </el-button>
        </div>
      </ml-fieldset-group>

      <ml-fieldset-group
        v-if="draft.target === 'new' && draft.attributes.length > 0"
        :title="t('dialog.bconvertDlg.attributes')"
      >
        <div class="ml-bconvert-dlg__hint">
          {{ t('dialog.bconvertDlg.attributesHint') }}
        </div>
        <div
          v-for="row in draft.attributes"
          :key="row.index"
          class="ml-bconvert-dlg__attr"
        >
          <span class="ml-bconvert-dlg__sample" :title="row.variants.join(', ')">
            {{ row.sample }}
          </span>
          <el-input
            v-model="row.tag"
            :placeholder="t('dialog.bconvertDlg.tag')"
          />
          <el-input
            v-model="row.prompt"
            :placeholder="t('dialog.bconvertDlg.prompt')"
          />
        </div>
      </ml-fieldset-group>

      <ml-fieldset-group :title="t('dialog.bconvertDlg.objects')">
        <el-radio-group v-model="draft.sourceOnly">
          <el-radio :value="false">
            {{ t('dialog.bconvertDlg.allInstances', { count: state.included }) }}
          </el-radio>
          <el-radio :value="true">
            {{ t('dialog.bconvertDlg.sourceOnly') }}
          </el-radio>
        </el-radio-group>
      </ml-fieldset-group>
    </div>
  </ml-base-dialog>
</template>

<script setup lang="ts">
import {
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElSelect
} from 'element-plus'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useBSearch } from '../../composable'
import MlBaseDialog from '../common/MlBaseDialog.vue'
import MlFieldsetGroup from '../common/MlFieldsetGroup.vue'

/**
 * Convert to Block dialog of `BSEARCH`: new block (name, insertion point,
 * attribute tags for varying texts) or an existing block definition, and
 * whether the found instances are converted too.
 */
const visible = defineModel<boolean>('modelValue', { default: false })

const { t } = useI18n()
const { state, draft, finishDialog } = useBSearch()

const equivalentNames = computed(
  () => new Set(state.equivalentBlocks.map(b => b.blockName))
)
const isEquivalent = (name: string) => equivalentNames.value.has(name)
const selectedIsEquivalent = computed(() => isEquivalent(draft.existingBlock))
/** Matching blocks first, then the rest alphabetically. */
const orderedBlockNames = computed(() => [
  ...state.blockNames.filter(isEquivalent),
  ...state.blockNames.filter(name => !isEquivalent(name))
])

function handleOk() {
  finishDialog({ type: 'ok' })
}

function handleCancel() {
  finishDialog({ type: 'cancel' })
}

function handlePick() {
  finishDialog({ type: 'pickBasePoint' })
}

function handleCenter() {
  draft.basePoint = { ...state.defaultBasePoint }
}
</script>

<style scoped>
.ml-bconvert-dlg {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ml-bconvert-dlg__point {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ml-bconvert-dlg__point .el-input-number {
  width: 110px;
}

.ml-bconvert-dlg__attr {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
  align-items: center;
  margin-top: 4px;
}

.ml-bconvert-dlg__sample {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ml-bconvert-dlg__hint {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
