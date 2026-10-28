<template>
  <ml-base-dialog
    v-model:modelValue="visible"
    :title="t('dialog.dimStyleDlg.title')"
    :width="580"
    @open="reload"
  >
    <div class="ml-dim-style">
      <div class="ml-dim-style__current">
        {{ t('dialog.dimStyleDlg.current', { name: currentName || '—' }) }}
      </div>
      <div class="ml-dim-style__body">
        <div class="ml-dim-style__list">
          <div class="ml-dim-style__label">
            {{ t('dialog.dimStyleDlg.styles') }}
          </div>
          <el-select v-model="filter" size="small" class="ml-dim-style__filter">
            <el-option value="all" :label="t('dialog.dimStyleDlg.filterAll')" />
            <el-option
              value="used"
              :label="t('dialog.dimStyleDlg.filterUsed')"
            />
          </el-select>
          <ul class="ml-dim-style__names">
            <li
              v-for="name in visibleNames"
              :key="name"
              :class="{ 'is-active': name === selected }"
              @click="selected = name"
            >
              {{ name }}
            </li>
          </ul>
        </div>
        <div class="ml-dim-style__preview">
          <div class="ml-dim-style__preview-title">
            {{ t('dialog.dimStyleDlg.previewOf', { name: selected || '—' }) }}
          </div>
          <ml-dim-style-preview
            :record="selectedStyle"
            :revision="previewRevision"
          />
          <div class="ml-dim-style__label ml-dim-style__desc-label">
            {{ t('dialog.dimStyleDlg.description') }}
          </div>
          <div class="ml-dim-style__desc">{{ description }}</div>
        </div>
        <div class="ml-dim-style__actions">
          <el-button @click="setCurrent">{{
            t('dialog.dimStyleDlg.setCurrent')
          }}</el-button>
          <el-button @click="beginNew">{{
            t('dialog.dimStyleDlg.new')
          }}</el-button>
          <el-button :disabled="!selected" @click="beginEdit('modify')">
            {{ t('dialog.dimStyleDlg.modify') }}
          </el-button>
          <el-button @click="beginEdit('override')">
            {{ t('dialog.dimStyleDlg.override') }}
          </el-button>
          <el-button @click="compareOpen = true">
            {{ t('dialog.dimStyleDlg.compare') }}
          </el-button>
          <el-button @click="visible = false">{{
            t('dialog.dimStyleDlg.close')
          }}</el-button>
        </div>
      </div>
    </div>
  </ml-base-dialog>

  <ml-base-dialog
    v-if="newOpen"
    v-model:modelValue="newOpen"
    :title="t('dialog.dimStyleDlg.newTitle')"
    :width="420"
    :z-index="2200"
    @ok="confirmNew"
  >
    <el-form label-position="top">
      <el-form-item :label="t('dialog.dimStyleDlg.newName')">
        <el-input v-model="newName" />
      </el-form-item>
      <el-form-item :label="t('dialog.dimStyleDlg.startWith')">
        <el-select v-model="newStart">
          <el-option
            v-for="name in styleNames"
            :key="name"
            :label="name"
            :value="name"
          />
        </el-select>
      </el-form-item>
      <el-form-item :label="t('dialog.dimStyleDlg.useFor')">
        <el-input
          :model-value="t('dialog.dimStyleDlg.allDimensions')"
          disabled
        />
      </el-form-item>
    </el-form>
  </ml-base-dialog>

  <ml-base-dialog
    v-if="editOpen"
    v-model:modelValue="editOpen"
    :title="editTitle"
    :width="720"
    :z-index="2200"
    @ok="confirmEdit"
  >
    <el-tabs v-model="tab">
      <el-tab-pane
        v-for="group in labeledFieldGroups"
        :key="group.id"
        :label="group.title"
        :name="group.id"
      >
        <div v-if="group.id === 'lines'" class="ml-dim-style__lines">
          <div class="ml-dim-style__lines-main">
            <ml-fieldset-group
              :title="t('dialog.dimStyleDlg.linesTab.dimensionLines')"
            >
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.linesTab.color') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <ml-color-dropdown
                    :model-value="dimStyleColor('dimclrd')"
                    :z-index="2300"
                    @update:model-value="setDimStyleColor('dimclrd', $event)"
                  />
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.linesTab.lineweight') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <ml-line-weight-select
                    compact
                    :model-value="lineWeightValue('dimlwd')"
                    @update:model-value="setNumberField('dimlwd', $event)"
                  />
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.linesTab.extendBeyondTicks') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-input-number
                    :model-value="numberValue('dimdle')"
                    class="ml-dim-style__number"
                    size="small"
                    :min="0"
                    :step="0.0625"
                    :precision="4"
                    controls-position="right"
                    @update:model-value="setNumberField('dimdle', $event)"
                  />
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.linesTab.baselineSpacing') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-input-number
                    :model-value="numberValue('dimdli')"
                    class="ml-dim-style__number"
                    size="small"
                    :min="0"
                    :step="0.0625"
                    :precision="4"
                    controls-position="right"
                    @update:model-value="setNumberField('dimdli', $event)"
                  />
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.linesTab.suppress') }}
                </span>
                <div class="ml-dim-style__checks">
                  <el-checkbox
                    :model-value="flagValue('dimsd1')"
                    @update:model-value="setFlagField('dimsd1', $event)"
                  >
                    {{ t('dialog.dimStyleDlg.linesTab.dimLine1') }}
                  </el-checkbox>
                  <el-checkbox
                    :model-value="flagValue('dimsd2')"
                    @update:model-value="setFlagField('dimsd2', $event)"
                  >
                    {{ t('dialog.dimStyleDlg.linesTab.dimLine2') }}
                  </el-checkbox>
                </div>
              </div>
            </ml-fieldset-group>

            <ml-fieldset-group
              :title="t('dialog.dimStyleDlg.linesTab.extensionLines')"
            >
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.linesTab.color') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <ml-color-dropdown
                    :model-value="dimStyleColor('dimclre')"
                    :z-index="2300"
                    @update:model-value="setDimStyleColor('dimclre', $event)"
                  />
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.linesTab.lineweight') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <ml-line-weight-select
                    compact
                    :model-value="lineWeightValue('dimlwe')"
                    @update:model-value="setNumberField('dimlwe', $event)"
                  />
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.linesTab.suppress') }}
                </span>
                <div class="ml-dim-style__checks">
                  <el-checkbox
                    :model-value="flagValue('dimse1')"
                    @update:model-value="setFlagField('dimse1', $event)"
                  >
                    {{ t('dialog.dimStyleDlg.linesTab.extLine1') }}
                  </el-checkbox>
                  <el-checkbox
                    :model-value="flagValue('dimse2')"
                    @update:model-value="setFlagField('dimse2', $event)"
                  >
                    {{ t('dialog.dimStyleDlg.linesTab.extLine2') }}
                  </el-checkbox>
                </div>
              </div>
            </ml-fieldset-group>
          </div>

          <div class="ml-dim-style__lines-side">
            <ml-dim-style-preview :record="previewRecord" />
            <div class="ml-dim-style__row">
              <span class="ml-dim-style__row-label">
                {{ t('dialog.dimStyleDlg.linesTab.extendBeyondDimLines') }}
              </span>
              <div class="ml-dim-style__row-control">
                <el-input-number
                  :model-value="numberValue('dimexe')"
                  class="ml-dim-style__number"
                  size="small"
                  :min="0"
                  :step="0.0625"
                  :precision="4"
                  controls-position="right"
                  @update:model-value="setNumberField('dimexe', $event)"
                />
              </div>
            </div>
            <div class="ml-dim-style__row">
              <span class="ml-dim-style__row-label">
                {{ t('dialog.dimStyleDlg.linesTab.offsetFromOrigin') }}
              </span>
              <div class="ml-dim-style__row-control">
                <el-input-number
                  :model-value="numberValue('dimexo')"
                  class="ml-dim-style__number"
                  size="small"
                  :min="0"
                  :step="0.0625"
                  :precision="4"
                  controls-position="right"
                  @update:model-value="setNumberField('dimexo', $event)"
                />
              </div>
            </div>
          </div>
        </div>
        <div
          v-else-if="group.id === 'symbols'"
          class="ml-dim-style__lines"
        >
          <div class="ml-dim-style__lines-main">
            <ml-fieldset-group
              :title="t('dialog.dimStyleDlg.symbolsTab.arrowheads')"
            >
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.symbolsTab.first') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-select
                    size="small"
                    :model-value="stringValue('dimblk1')"
                    @update:model-value="setArrowField('dimblk1', $event)"
                  >
                    <el-option
                      v-for="opt in arrowOptions"
                      :key="opt.value"
                      :value="opt.value"
                      :label="opt.label"
                    />
                  </el-select>
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.symbolsTab.second') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-select
                    size="small"
                    :model-value="stringValue('dimblk2')"
                    @update:model-value="setArrowField('dimblk2', $event)"
                  >
                    <el-option
                      v-for="opt in arrowOptions"
                      :key="opt.value"
                      :value="opt.value"
                      :label="opt.label"
                    />
                  </el-select>
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.symbolsTab.leader') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-select
                    size="small"
                    :model-value="stringValue('dimldrblk')"
                    @update:model-value="setStringField('dimldrblk', $event)"
                  >
                    <el-option
                      v-for="opt in leaderArrowOptions"
                      :key="opt.value"
                      :value="opt.value"
                      :label="opt.label"
                    />
                  </el-select>
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.symbolsTab.arrowSize') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-input-number
                    :model-value="numberValue('dimasz')"
                    class="ml-dim-style__number"
                    size="small"
                    :min="0"
                    :step="0.0625"
                    :precision="4"
                    controls-position="right"
                    @update:model-value="setNumberField('dimasz', $event)"
                  />
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.symbolsTab.tickSize') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-input-number
                    :model-value="numberValue('dimtsz')"
                    class="ml-dim-style__number"
                    size="small"
                    :min="0"
                    :step="0.0625"
                    :precision="4"
                    controls-position="right"
                    @update:model-value="setNumberField('dimtsz', $event)"
                  />
                </div>
              </div>
            </ml-fieldset-group>

            <ml-fieldset-group
              :title="t('dialog.dimStyleDlg.symbolsTab.centerMarks')"
            >
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.symbolsTab.centerType') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-select
                    size="small"
                    :model-value="centerMarkType"
                    @update:model-value="setCenterMarkType"
                  >
                    <el-option
                      value="none"
                      :label="t('dialog.dimStyleDlg.symbolsTab.centerNone')"
                    />
                    <el-option
                      value="mark"
                      :label="t('dialog.dimStyleDlg.symbolsTab.centerMark')"
                    />
                    <el-option
                      value="line"
                      :label="t('dialog.dimStyleDlg.symbolsTab.centerLine')"
                    />
                  </el-select>
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.symbolsTab.centerSize') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-input-number
                    :model-value="Math.abs(numberValue('dimcen'))"
                    class="ml-dim-style__number"
                    size="small"
                    :min="0"
                    :step="0.0625"
                    :precision="4"
                    controls-position="right"
                    @update:model-value="setCenterMarkSize($event)"
                  />
                </div>
              </div>
            </ml-fieldset-group>
          </div>

          <div class="ml-dim-style__lines-side">
            <ml-dim-style-preview :record="previewRecord" />
          </div>
        </div>
        <div
          v-else-if="group.id === 'alternate'"
          class="ml-dim-style__lines"
        >
          <div class="ml-dim-style__lines-main">
            <el-checkbox
              class="ml-dim-style__alt-display"
              :model-value="flagValue('dimalt')"
              @update:model-value="setFlagField('dimalt', $event)"
            >
              {{ t('dialog.dimStyleDlg.alternateTab.display') }}
            </el-checkbox>

            <ml-fieldset-group
              :title="t('dialog.dimStyleDlg.alternateTab.units')"
            >
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.alternateTab.unitFormat') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-select
                    size="small"
                    :disabled="!flagValue('dimalt')"
                    :model-value="numberValue('dimaltu')"
                    @update:model-value="setNumberField('dimaltu', $event)"
                  >
                    <el-option
                      v-for="opt in alternateUnitOptions"
                      :key="opt.value"
                      :value="opt.value"
                      :label="opt.label"
                    />
                  </el-select>
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.alternateTab.precision') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-select
                    size="small"
                    :disabled="!flagValue('dimalt')"
                    :model-value="numberValue('dimaltd')"
                    @update:model-value="setNumberField('dimaltd', $event)"
                  >
                    <el-option
                      v-for="opt in precisionOptions"
                      :key="opt.value"
                      :value="opt.value"
                      :label="opt.label"
                    />
                  </el-select>
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.alternateTab.multiplier') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-input-number
                    :model-value="numberValue('dimaltf')"
                    class="ml-dim-style__number"
                    size="small"
                    :min="0"
                    :step="0.0625"
                    :precision="4"
                    controls-position="right"
                    :disabled="!flagValue('dimalt')"
                    @update:model-value="setNumberField('dimaltf', $event)"
                  />
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.alternateTab.rounding') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-input-number
                    :model-value="numberValue('dimaltrnd')"
                    class="ml-dim-style__number"
                    size="small"
                    :min="0"
                    :step="0.0625"
                    :precision="4"
                    controls-position="right"
                    :disabled="!flagValue('dimalt')"
                    @update:model-value="setNumberField('dimaltrnd', $event)"
                  />
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.alternateTab.prefix') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-input
                    v-model="alternatePrefix"
                    size="small"
                    :disabled="!flagValue('dimalt')"
                  />
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.alternateTab.suffix') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-input
                    v-model="alternateSuffix"
                    size="small"
                    :disabled="!flagValue('dimalt')"
                  />
                </div>
              </div>
            </ml-fieldset-group>

            <ml-fieldset-group
              :title="t('dialog.dimStyleDlg.alternateTab.zeroSuppression')"
            >
              <div class="ml-dim-style__checks">
                <el-checkbox
                  :model-value="alternateZero.leading"
                  @update:model-value="setAlternateZero('leading', $event)"
                >
                  {{ t('dialog.dimStyleDlg.alternateTab.leading') }}
                </el-checkbox>
                <el-checkbox
                  :model-value="alternateZero.trailing"
                  @update:model-value="setAlternateZero('trailing', $event)"
                >
                  {{ t('dialog.dimStyleDlg.alternateTab.trailing') }}
                </el-checkbox>
                <el-checkbox
                  :model-value="alternateZero.zeroFeet"
                  @update:model-value="setAlternateZero('zeroFeet', $event)"
                >
                  {{ t('dialog.dimStyleDlg.alternateTab.zeroFeet') }}
                </el-checkbox>
                <el-checkbox
                  :model-value="alternateZero.zeroInches"
                  @update:model-value="setAlternateZero('zeroInches', $event)"
                >
                  {{ t('dialog.dimStyleDlg.alternateTab.zeroInches') }}
                </el-checkbox>
              </div>
              <div class="ml-dim-style__row ml-dim-style__row-gap">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.alternateTab.subUnitFactor') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-input-number
                    :model-value="100"
                    class="ml-dim-style__number"
                    size="small"
                    :min="0"
                    :precision="4"
                    controls-position="right"
                    disabled
                  />
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.alternateTab.subUnitSuffix') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-input size="small" disabled />
                </div>
              </div>
            </ml-fieldset-group>
          </div>

          <div class="ml-dim-style__lines-side">
            <ml-dim-style-preview :record="previewRecord" />
            <ml-fieldset-group
              :title="t('dialog.dimStyleDlg.alternateTab.placement')"
            >
              <el-radio-group
                model-value="after"
                class="ml-dim-style__stack"
                disabled
              >
                <el-radio value="after">
                  {{ t('dialog.dimStyleDlg.alternateTab.afterPrimary') }}
                </el-radio>
                <el-radio value="below">
                  {{ t('dialog.dimStyleDlg.alternateTab.belowPrimary') }}
                </el-radio>
              </el-radio-group>
            </ml-fieldset-group>
          </div>
        </div>
        <div
          v-else-if="group.id === 'fit'"
          class="ml-dim-style__lines"
        >
          <div class="ml-dim-style__lines-main">
            <ml-fieldset-group
              :title="t('dialog.dimStyleDlg.fitTab.fitOptions')"
            >
              <el-radio-group
                :model-value="fitChoice"
                class="ml-dim-style__stack"
                @update:model-value="setFitChoice($event)"
              >
                <el-radio value="best">
                  {{ t('dialog.dimStyleDlg.fitTab.textOrArrows') }}
                </el-radio>
                <el-radio value="arrows">
                  {{ t('dialog.dimStyleDlg.fitTab.arrows') }}
                </el-radio>
                <el-radio value="text">
                  {{ t('dialog.dimStyleDlg.fitTab.text') }}
                </el-radio>
                <el-radio value="textAndArrows">
                  {{ t('dialog.dimStyleDlg.fitTab.textAndArrows') }}
                </el-radio>
                <el-radio value="alwaysInside">
                  {{ t('dialog.dimStyleDlg.fitTab.textAlwaysInside') }}
                </el-radio>
              </el-radio-group>
              <el-checkbox
                class="ml-dim-style__stack-item"
                :disabled="fitChoice !== 'best'"
                :model-value="flagValue('dimsoxd')"
                @update:model-value="setFlagField('dimsoxd', $event)"
              >
                {{ t('dialog.dimStyleDlg.fitTab.suppressArrows') }}
              </el-checkbox>
            </ml-fieldset-group>

            <ml-fieldset-group
              :title="t('dialog.dimStyleDlg.fitTab.textPlacement')"
            >
              <div class="ml-dim-style__group-hint">
                {{ t('dialog.dimStyleDlg.fitTab.textPlacementHint') }}
              </div>
              <el-radio-group
                :model-value="textPlacement"
                class="ml-dim-style__stack"
                @update:model-value="setTextPlacement($event)"
              >
                <el-radio value="beside">
                  {{ t('dialog.dimStyleDlg.fitTab.besideDimLine') }}
                </el-radio>
                <el-radio value="leader">
                  {{ t('dialog.dimStyleDlg.fitTab.aboveWithLeader') }}
                </el-radio>
                <el-radio value="free">
                  {{ t('dialog.dimStyleDlg.fitTab.aboveNoLeader') }}
                </el-radio>
              </el-radio-group>
            </ml-fieldset-group>
          </div>

          <div class="ml-dim-style__lines-side">
            <ml-dim-style-preview :record="previewRecord" />
            <ml-fieldset-group
              :title="t('dialog.dimStyleDlg.fitTab.featureScale')"
            >
              <el-checkbox
                :model-value="annotativeFlag"
                :disabled="editMode === 'override'"
                @update:model-value="annotativeFlag = $event"
              >
                {{ t('dialog.dimStyleDlg.fitTab.annotative') }}
              </el-checkbox>
              <el-radio-group
                :model-value="scaleMode"
                class="ml-dim-style__stack"
                :disabled="annotativeFlag"
                @update:model-value="setScaleMode($event as string)"
              >
                <el-radio value="layout">
                  {{ t('dialog.dimStyleDlg.fitTab.scaleToLayout') }}
                </el-radio>
                <el-radio value="global" class="ml-dim-style__scale-global">
                  {{ t('dialog.dimStyleDlg.fitTab.useOverallScale') }}
                  <el-input-number
                    :model-value="numberValue('dimscale')"
                    class="ml-dim-style__number"
                    size="small"
                    :min="0"
                    :step="0.1"
                    :precision="4"
                    controls-position="right"
                    @update:model-value="setOverallScale($event)"
                  />
                </el-radio>
              </el-radio-group>
            </ml-fieldset-group>
            <ml-fieldset-group
              :title="t('dialog.dimStyleDlg.fitTab.fineTuning')"
            >
              <el-checkbox
                :model-value="flagValue('dimupt')"
                @update:model-value="setFlagField('dimupt', $event)"
              >
                {{ t('dialog.dimStyleDlg.fitTab.placeTextManually') }}
              </el-checkbox>
              <el-checkbox
                :model-value="flagValue('dimtofl')"
                @update:model-value="setFlagField('dimtofl', $event)"
              >
                {{ t('dialog.dimStyleDlg.fitTab.drawDimLineBetween') }}
              </el-checkbox>
            </ml-fieldset-group>
          </div>
        </div>
        <div v-else-if="group.id === 'primary'" class="ml-dim-style__lines">
          <div class="ml-dim-style__lines-main">
            <ml-fieldset-group
              :title="t('dialog.dimStyleDlg.primaryTab.linearDimensions')"
            >
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.primaryTab.unitsFormat') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-select
                    size="small"
                    :model-value="linearFormat"
                    @update:model-value="setLinearFormat($event)"
                  >
                    <el-option
                      :value="1"
                      :label="
                        t('dialog.dimStyleDlg.primaryTab.units.scientific')
                      "
                    />
                    <el-option
                      :value="2"
                      :label="
                        t('dialog.dimStyleDlg.primaryTab.units.decimal')
                      "
                    />
                    <el-option
                      :value="3"
                      :label="
                        t('dialog.dimStyleDlg.primaryTab.units.engineering')
                      "
                    />
                    <el-option
                      :value="4"
                      :label="
                        t('dialog.dimStyleDlg.primaryTab.units.architectural')
                      "
                    />
                    <el-option
                      :value="5"
                      :label="
                        t('dialog.dimStyleDlg.primaryTab.units.fractional')
                      "
                    />
                    <el-option
                      :value="6"
                      :label="
                        t(
                          'dialog.dimStyleDlg.primaryTab.units.windowsDesktop'
                        )
                      "
                    />
                  </el-select>
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.primaryTab.precision') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-select
                    size="small"
                    :model-value="linearPrecision"
                    @update:model-value="setNumberField('dimdec', $event)"
                  >
                    <el-option
                      v-for="opt in precisionOptions"
                      :key="opt.value"
                      :value="opt.value"
                      :label="opt.label"
                    />
                  </el-select>
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.primaryTab.fractionFormat') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-select
                    size="small"
                    :model-value="fractionFormat"
                    :disabled="!fractionEnabled"
                    @update:model-value="
                      setStringField('dimfrac', String($event))
                    "
                  >
                    <el-option
                      :value="0"
                      :label="
                        t('dialog.dimStyleDlg.primaryTab.fractions.horizontal')
                      "
                    />
                    <el-option
                      :value="1"
                      :label="
                        t('dialog.dimStyleDlg.primaryTab.fractions.diagonal')
                      "
                    />
                    <el-option
                      :value="2"
                      :label="
                        t(
                          'dialog.dimStyleDlg.primaryTab.fractions.notStacked'
                        )
                      "
                    />
                  </el-select>
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.primaryTab.decimalSeparator') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-select
                    size="small"
                    :model-value="decimalSeparator"
                    :disabled="!separatorEnabled"
                    @update:model-value="setStringField('dimdsep', $event)"
                  >
                    <el-option
                      value="."
                      :label="
                        t('dialog.dimStyleDlg.primaryTab.separators.period')
                      "
                    />
                    <el-option
                      value=","
                      :label="
                        t('dialog.dimStyleDlg.primaryTab.separators.comma')
                      "
                    />
                    <el-option
                      value=" "
                      :label="
                        t('dialog.dimStyleDlg.primaryTab.separators.space')
                      "
                    />
                  </el-select>
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.primaryTab.roundOff') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-input-number
                    :model-value="numberValue('dimrnd')"
                    class="ml-dim-style__number"
                    size="small"
                    :min="0"
                    :step="0.1"
                    :precision="4"
                    controls-position="right"
                    @update:model-value="setNumberField('dimrnd', $event)"
                  />
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.primaryTab.prefix') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-input
                    size="small"
                    :model-value="dimPrefix"
                    @update:model-value="dimPrefix = $event"
                  />
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.primaryTab.suffix') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-input
                    size="small"
                    :model-value="dimSuffix"
                    @update:model-value="dimSuffix = $event"
                  />
                </div>
              </div>

              <ml-fieldset-group
                class="ml-dim-style__nested"
                :title="t('dialog.dimStyleDlg.primaryTab.measurementScale')"
              >
                <div class="ml-dim-style__row">
                  <span class="ml-dim-style__row-label">
                    {{ t('dialog.dimStyleDlg.primaryTab.scaleFactor') }}
                  </span>
                  <div class="ml-dim-style__row-control">
                    <el-input-number
                      :model-value="scaleFactor"
                      class="ml-dim-style__number"
                      size="small"
                      :min="0"
                      :step="0.1"
                      :precision="4"
                      controls-position="right"
                      @update:model-value="setScaleFactor"
                    />
                  </div>
                </div>
                <el-checkbox
                  :model-value="scaleLayoutOnly"
                  @update:model-value="setScaleLayoutOnly($event)"
                >
                  {{ t('dialog.dimStyleDlg.primaryTab.applyLayoutOnly') }}
                </el-checkbox>
              </ml-fieldset-group>

              <ml-fieldset-group
                class="ml-dim-style__nested"
                :title="t('dialog.dimStyleDlg.primaryTab.zeroSuppression')"
              >
                <div class="ml-dim-style__checks">
                  <el-checkbox
                    :model-value="zeroLeading"
                    @update:model-value="setZeroLeading($event)"
                  >
                    {{ t('dialog.dimStyleDlg.primaryTab.leading') }}
                  </el-checkbox>
                  <el-checkbox
                    :model-value="zeroTrailing"
                    @update:model-value="setZeroTrailing($event)"
                  >
                    {{ t('dialog.dimStyleDlg.primaryTab.trailing') }}
                  </el-checkbox>
                </div>
                <div class="ml-dim-style__indent">
                  <div class="ml-dim-style__row">
                    <span class="ml-dim-style__row-label">
                      {{ t('dialog.dimStyleDlg.primaryTab.subUnitFactor') }}
                    </span>
                    <div class="ml-dim-style__row-control">
                      <el-input-number
                        :model-value="subUnitFactor"
                        class="ml-dim-style__number"
                        size="small"
                        :min="0"
                        :step="1"
                        :precision="4"
                        controls-position="right"
                        :disabled="!zeroLeading"
                        @update:model-value="subUnitFactor = $event ?? 100"
                      />
                    </div>
                  </div>
                  <div class="ml-dim-style__row">
                    <span class="ml-dim-style__row-label">
                      {{ t('dialog.dimStyleDlg.primaryTab.subUnitSuffix') }}
                    </span>
                    <div class="ml-dim-style__row-control">
                      <el-input
                        size="small"
                        :model-value="subUnitSuffix"
                        :disabled="!zeroLeading"
                        @update:model-value="subUnitSuffix = $event"
                      />
                    </div>
                  </div>
                </div>
                <div class="ml-dim-style__checks">
                  <el-checkbox
                    :disabled="!feetInchEnabled"
                    :model-value="zeroFeet"
                    @update:model-value="setZeroFeet($event)"
                  >
                    {{ t('dialog.dimStyleDlg.primaryTab.zeroFeet') }}
                  </el-checkbox>
                  <el-checkbox
                    :disabled="!feetInchEnabled"
                    :model-value="zeroInches"
                    @update:model-value="setZeroInches($event)"
                  >
                    {{ t('dialog.dimStyleDlg.primaryTab.zeroInches') }}
                  </el-checkbox>
                </div>
              </ml-fieldset-group>
            </ml-fieldset-group>
          </div>

          <div class="ml-dim-style__lines-side">
            <ml-dim-style-preview :record="previewRecord" />
            <ml-fieldset-group
              class="ml-dim-style__angular"
              :title="t('dialog.dimStyleDlg.primaryTab.angularDimensions')"
            >
              <div class="ml-dim-style__row ml-dim-style__angular-row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.primaryTab.angularUnitsFormat') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-select
                    size="small"
                    :model-value="angularFormat"
                    @update:model-value="
                      setStringField('dimaunit', String($event))
                    "
                  >
                    <el-option
                      :value="0"
                      :label="
                        t(
                          'dialog.dimStyleDlg.primaryTab.angularUnits.decimalDegrees'
                        )
                      "
                    />
                    <el-option
                      :value="1"
                      :label="
                        t(
                          'dialog.dimStyleDlg.primaryTab.angularUnits.degreesMinutesSeconds'
                        )
                      "
                    />
                    <el-option
                      :value="2"
                      :label="
                        t(
                          'dialog.dimStyleDlg.primaryTab.angularUnits.gradians'
                        )
                      "
                    />
                    <el-option
                      :value="3"
                      :label="
                        t('dialog.dimStyleDlg.primaryTab.angularUnits.radians')
                      "
                    />
                  </el-select>
                </div>
              </div>
              <div class="ml-dim-style__row ml-dim-style__angular-row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.primaryTab.angularPrecision') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-select
                    size="small"
                    :model-value="angularPrecision"
                    @update:model-value="setNumberField('dimadec', $event)"
                  >
                    <el-option
                      v-for="opt in precisionOptions"
                      :key="opt.value"
                      :value="opt.value"
                      :label="opt.label"
                    />
                  </el-select>
                </div>
              </div>
              <ml-fieldset-group
                class="ml-dim-style__nested"
                :title="t('dialog.dimStyleDlg.primaryTab.zeroSuppression')"
              >
                <div class="ml-dim-style__checks">
                  <el-checkbox
                    :model-value="angularZeroLeading"
                    @update:model-value="setAngularZeroLeading($event)"
                  >
                    {{ t('dialog.dimStyleDlg.primaryTab.angularLeading') }}
                  </el-checkbox>
                  <el-checkbox
                    :model-value="angularZeroTrailing"
                    @update:model-value="setAngularZeroTrailing($event)"
                  >
                    {{ t('dialog.dimStyleDlg.primaryTab.angularTrailing') }}
                  </el-checkbox>
                </div>
              </ml-fieldset-group>
            </ml-fieldset-group>
          </div>
        </div>
        <div v-else-if="group.id === 'text'" class="ml-dim-style__lines">
          <div class="ml-dim-style__lines-main">
            <ml-fieldset-group
              :title="t('dialog.dimStyleDlg.textTab.appearance')"
            >
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.textTab.textStyle') }}
                </span>
                <div class="ml-dim-style__row-control ml-dim-style__style-row">
                  <el-select
                    size="small"
                    :model-value="stringValue('dimtxsty')"
                    @update:model-value="setStringField('dimtxsty', $event)"
                  >
                    <el-option
                      v-for="name in textStyleNames"
                      :key="name"
                      :value="name"
                      :label="name"
                    />
                  </el-select>
                  <el-button
                    size="small"
                    class="ml-dim-style__style-btn"
                    :title="t('dialog.textStyleDlg.title')"
                    @click="toggleTextStyleDlg"
                  >
                    {{ t('dialog.dimStyleDlg.textTab.textStyleBtn') }}
                  </el-button>
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.textTab.textColor') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <ml-color-dropdown
                    :model-value="dimStyleColor('dimclrt')"
                    :z-index="2300"
                    @update:model-value="setDimStyleColor('dimclrt', $event)"
                  />
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.textTab.fillColor') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-select
                    size="small"
                    :model-value="fillColorChoice"
                    @update:model-value="setFillColorChoice"
                  >
                    <el-option
                      value="none"
                      :label="t('dialog.dimStyleDlg.textTab.fillOptions.none')"
                    />
                    <el-option
                      value="background"
                      :label="
                        t('dialog.dimStyleDlg.textTab.fillOptions.background')
                      "
                    />
                    <el-option
                      v-for="opt in fillColorOptions"
                      :key="opt.key"
                      :value="opt.key"
                      :label="opt.label"
                    >
                      <div class="ml-dim-style__fill-item">
                        <span
                          class="ml-dim-style__fill-preview"
                          :style="{ backgroundColor: opt.css }"
                        />
                        <span>{{ opt.label }}</span>
                      </div>
                    </el-option>
                    <el-option
                      value="custom"
                      :label="t('main.colorDropdown.custom')"
                    />
                  </el-select>
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.textTab.textHeight') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-input-number
                    :model-value="numberValue('dimtxt')"
                    class="ml-dim-style__number"
                    size="small"
                    :min="0"
                    :step="0.0625"
                    :precision="4"
                    controls-position="right"
                    @update:model-value="setNumberField('dimtxt', $event)"
                  />
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.textTab.fractionHeightScale') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-input-number
                    :model-value="numberValue('dimtfac')"
                    class="ml-dim-style__number"
                    size="small"
                    :min="0"
                    :step="0.125"
                    :precision="4"
                    controls-position="right"
                    @update:model-value="setNumberField('dimtfac', $event)"
                  />
                </div>
              </div>
              <el-checkbox
                class="ml-dim-style__frame-check"
                :model-value="numberValue('dimgap') < 0"
                @update:model-value="setFrameText"
              >
                {{ t('dialog.dimStyleDlg.textTab.drawFrame') }}
              </el-checkbox>
            </ml-fieldset-group>

            <ml-fieldset-group
              :title="t('dialog.dimStyleDlg.textTab.position')"
            >
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.textTab.vertical') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-select
                    size="small"
                    :model-value="numberValue('dimtad')"
                    @update:model-value="setNumberField('dimtad', $event)"
                  >
                    <el-option
                      :value="0"
                      :label="
                        t('dialog.dimStyleDlg.textTab.verticalOptions.center')
                      "
                    />
                    <el-option
                      :value="1"
                      :label="
                        t('dialog.dimStyleDlg.textTab.verticalOptions.above')
                      "
                    />
                    <el-option
                      :value="2"
                      :label="
                        t('dialog.dimStyleDlg.textTab.verticalOptions.outside')
                      "
                    />
                    <el-option
                      :value="3"
                      :label="
                        t('dialog.dimStyleDlg.textTab.verticalOptions.jis')
                      "
                    />
                    <el-option
                      :value="4"
                      :label="
                        t('dialog.dimStyleDlg.textTab.verticalOptions.below')
                      "
                    />
                  </el-select>
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.textTab.horizontal') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-select
                    size="small"
                    :model-value="numberValue('dimjust')"
                    @update:model-value="setNumberField('dimjust', $event)"
                  >
                    <el-option
                      :value="0"
                      :label="
                        t('dialog.dimStyleDlg.textTab.justifyOptions.center')
                      "
                    />
                    <el-option
                      :value="1"
                      :label="
                        t('dialog.dimStyleDlg.textTab.justifyOptions.first')
                      "
                    />
                    <el-option
                      :value="2"
                      :label="
                        t('dialog.dimStyleDlg.textTab.justifyOptions.second')
                      "
                    />
                    <el-option
                      :value="3"
                      :label="
                        t('dialog.dimStyleDlg.textTab.justifyOptions.overFirst')
                      "
                    />
                    <el-option
                      :value="4"
                      :label="
                        t('dialog.dimStyleDlg.textTab.justifyOptions.overSecond')
                      "
                    />
                  </el-select>
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.textTab.viewDirection') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-select
                    size="small"
                    :model-value="numberValue('dimtxtdirection')"
                    @update:model-value="setNumberField('dimtxtdirection', $event)"
                  >
                    <el-option
                      :value="0"
                      :label="
                        t('dialog.dimStyleDlg.textTab.directionOptions.ltr')
                      "
                    />
                    <el-option
                      :value="1"
                      :label="
                        t('dialog.dimStyleDlg.textTab.directionOptions.rtl')
                      "
                    />
                  </el-select>
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.textTab.offsetFromDimLine') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-input-number
                    :model-value="Math.abs(numberValue('dimgap'))"
                    class="ml-dim-style__number"
                    size="small"
                    :min="0"
                    :step="0.0625"
                    :precision="4"
                    controls-position="right"
                    @update:model-value="setOffsetFromDimLine"
                  />
                </div>
              </div>
            </ml-fieldset-group>
          </div>

          <div class="ml-dim-style__lines-side">
            <ml-dim-style-preview :record="previewRecord" />
            <ml-fieldset-group
              :title="t('dialog.dimStyleDlg.textTab.alignment')"
            >
              <el-radio-group
                class="ml-dim-style__stack"
                :model-value="textAlignment"
                @update:model-value="setTextAlignment($event as string)"
              >
                <el-radio value="horizontal">
                  {{ t('dialog.dimStyleDlg.textTab.alignHorizontal') }}
                </el-radio>
                <el-radio value="along">
                  {{ t('dialog.dimStyleDlg.textTab.alignAlong') }}
                </el-radio>
                <el-radio value="iso">
                  {{ t('dialog.dimStyleDlg.textTab.alignIso') }}
                </el-radio>
              </el-radio-group>
            </ml-fieldset-group>
          </div>
        </div>
        <div
          v-else-if="group.id === 'tolerances'"
          class="ml-dim-style__lines"
        >
          <div class="ml-dim-style__lines-main">
            <ml-fieldset-group
              :title="t('dialog.dimStyleDlg.tolerancesTab.format')"
            >
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.tolerancesTab.mode') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-select
                    size="small"
                    :model-value="tolFormat"
                    @update:model-value="setTolerFormat($event)"
                  >
                    <el-option
                      value="none"
                      :label="t('dialog.dimStyleDlg.tolerancesTab.modeNone')"
                    />
                    <el-option
                      value="symmetric"
                      :label="
                        t('dialog.dimStyleDlg.tolerancesTab.modeSymmetric')
                      "
                    />
                    <el-option
                      value="deviation"
                      :label="
                        t('dialog.dimStyleDlg.tolerancesTab.modeDeviation')
                      "
                    />
                    <el-option
                      value="limits"
                      :label="t('dialog.dimStyleDlg.tolerancesTab.modeLimits')"
                    />
                    <el-option
                      value="basic"
                      :label="t('dialog.dimStyleDlg.tolerancesTab.modeBasic')"
                    />
                  </el-select>
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.tolerancesTab.precision') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-select
                    size="small"
                    :model-value="precisionValue('dimtdec')"
                    @update:model-value="setPrecisionField('dimtdec', $event)"
                  >
                    <el-option
                      v-for="opt in precisionOptions"
                      :key="opt.value"
                      :value="opt.value"
                      :label="opt.label"
                    />
                  </el-select>
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.tolerancesTab.upper') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-input-number
                    :model-value="numberValue('dimtp')"
                    class="ml-dim-style__number"
                    size="small"
                    :min="0"
                    :step="0.0625"
                    :precision="4"
                    controls-position="right"
                    :disabled="!toleranceValuesEditable"
                    @update:model-value="setUpperDeviation($event)"
                  />
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.tolerancesTab.lower') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-input-number
                    :model-value="lowerDeviation"
                    class="ml-dim-style__number"
                    size="small"
                    :min="0"
                    :step="0.0625"
                    :precision="4"
                    controls-position="right"
                    :disabled="!toleranceValuesEditable || tolFormat === 'symmetric'"
                    @update:model-value="setLowerDeviation($event)"
                  />
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.tolerancesTab.heightScale') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-input-number
                    :model-value="numberValue('dimtfac')"
                    class="ml-dim-style__number"
                    size="small"
                    :min="0"
                    :step="0.1"
                    :precision="4"
                    controls-position="right"
                    :disabled="!toleranceValuesEditable"
                    @update:model-value="setNumberField('dimtfac', $event)"
                  />
                </div>
              </div>
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.tolerancesTab.verticalPosition') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-select
                    size="small"
                    :model-value="numberValue('dimtolj')"
                    :disabled="!toleranceValuesEditable"
                    @update:model-value="setNumberField('dimtolj', $event)"
                  >
                    <el-option
                      :value="0"
                      :label="
                        t('dialog.dimStyleDlg.tolerancesTab.verticalBottom')
                      "
                    />
                    <el-option
                      :value="1"
                      :label="
                        t('dialog.dimStyleDlg.tolerancesTab.verticalMiddle')
                      "
                    />
                    <el-option
                      :value="2"
                      :label="
                        t('dialog.dimStyleDlg.tolerancesTab.verticalTop')
                      "
                    />
                  </el-select>
                </div>
              </div>
            </ml-fieldset-group>

            <ml-fieldset-group
              :title="t('dialog.dimStyleDlg.tolerancesTab.alignment')"
            >
              <el-radio-group
                v-model="tolAlignment"
                class="ml-dim-style__stack"
                :disabled="tolFormat !== 'deviation'"
              >
                <el-radio value="decimal">
                  {{ t('dialog.dimStyleDlg.tolerancesTab.alignDecimal') }}
                </el-radio>
                <el-radio value="operational">
                  {{ t('dialog.dimStyleDlg.tolerancesTab.alignOperational') }}
                </el-radio>
              </el-radio-group>
            </ml-fieldset-group>

            <ml-fieldset-group
              :title="t('dialog.dimStyleDlg.tolerancesTab.zeroSuppression')"
            >
              <div class="ml-dim-style__checks-grid">
                <el-checkbox
                  :model-value="zeroFlags('dimtzin').feet"
                  @update:model-value="setZeroFlag('dimtzin', 'feet', $event)"
                >
                  {{ t('dialog.dimStyleDlg.tolerancesTab.zeroFeet') }}
                </el-checkbox>
                <el-checkbox
                  :model-value="zeroFlags('dimtzin').inch"
                  @update:model-value="setZeroFlag('dimtzin', 'inch', $event)"
                >
                  {{ t('dialog.dimStyleDlg.tolerancesTab.zeroInches') }}
                </el-checkbox>
                <el-checkbox
                  :model-value="zeroFlags('dimtzin').leading"
                  @update:model-value="
                    setZeroFlag('dimtzin', 'leading', $event)
                  "
                >
                  {{ t('dialog.dimStyleDlg.tolerancesTab.leading') }}
                </el-checkbox>
                <el-checkbox
                  :model-value="zeroFlags('dimtzin').trailing"
                  @update:model-value="
                    setZeroFlag('dimtzin', 'trailing', $event)
                  "
                >
                  {{ t('dialog.dimStyleDlg.tolerancesTab.trailing') }}
                </el-checkbox>
              </div>
            </ml-fieldset-group>
          </div>

          <div class="ml-dim-style__lines-side">
            <ml-dim-style-preview :record="previewRecord" />
            <ml-fieldset-group
              :title="
                t('dialog.dimStyleDlg.tolerancesTab.alternateUnitsTolerance')
              "
            >
              <div class="ml-dim-style__row">
                <span class="ml-dim-style__row-label">
                  {{ t('dialog.dimStyleDlg.tolerancesTab.precisionAlt') }}
                </span>
                <div class="ml-dim-style__row-control">
                  <el-select
                    size="small"
                    :model-value="precisionValue('dimaltd')"
                    @update:model-value="setPrecisionField('dimaltd', $event)"
                  >
                    <el-option
                      v-for="opt in precisionOptions"
                      :key="opt.value"
                      :value="opt.value"
                      :label="opt.label"
                    />
                  </el-select>
                </div>
              </div>
            </ml-fieldset-group>
            <ml-fieldset-group
              :title="t('dialog.dimStyleDlg.tolerancesTab.zeroSuppression')"
            >
              <div class="ml-dim-style__checks-grid">
                <el-checkbox
                  :model-value="zeroFlags('dimaltz').feet"
                  @update:model-value="setZeroFlag('dimaltz', 'feet', $event)"
                >
                  {{ t('dialog.dimStyleDlg.tolerancesTab.zeroFeet') }}
                </el-checkbox>
                <el-checkbox
                  :model-value="zeroFlags('dimaltz').inch"
                  @update:model-value="setZeroFlag('dimaltz', 'inch', $event)"
                >
                  {{ t('dialog.dimStyleDlg.tolerancesTab.zeroInches') }}
                </el-checkbox>
                <el-checkbox
                  :model-value="zeroFlags('dimaltz').leading"
                  @update:model-value="
                    setZeroFlag('dimaltz', 'leading', $event)
                  "
                >
                  {{ t('dialog.dimStyleDlg.tolerancesTab.leading') }}
                </el-checkbox>
                <el-checkbox
                  :model-value="zeroFlags('dimaltz').trailing"
                  @update:model-value="
                    setZeroFlag('dimaltz', 'trailing', $event)
                  "
                >
                  {{ t('dialog.dimStyleDlg.tolerancesTab.trailing') }}
                </el-checkbox>
              </div>
            </ml-fieldset-group>
          </div>
        </div>
        <div v-else class="ml-dim-style__grid">
          <label
            v-for="field in group.fields"
            :key="field"
            class="ml-dim-style__field"
          >
            <span>{{ field }}</span>
            <el-input v-model="form[field]" size="small" />
          </label>
        </div>
      </el-tab-pane>
    </el-tabs>
  </ml-base-dialog>

  <ml-base-dialog
    v-if="compareOpen"
    v-model:modelValue="compareOpen"
    :title="t('dialog.dimStyleDlg.compareTitle')"
    :width="560"
    :z-index="2200"
  >
    <div class="ml-dim-style__compare">
      <el-select v-model="compareA">
        <el-option
          v-for="name in styleNames"
          :key="name"
          :label="name"
          :value="name"
        />
      </el-select>
      <el-select v-model="compareB">
        <el-option
          v-for="name in styleNames"
          :key="'b' + name"
          :label="name"
          :value="name"
        />
      </el-select>
    </div>
    <div v-if="differences.length === 0">
      {{ t('dialog.dimStyleDlg.noDifferences') }}
    </div>
    <table v-else class="ml-dim-style__table">
      <thead>
        <tr>
          <th>{{ t('dialog.dimStyleDlg.variable') }}</th>
          <th>{{ compareA }}</th>
          <th>{{ compareB }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in differences" :key="row.key">
          <td>{{ row.key }}</td>
          <td>{{ row.a }}</td>
          <td>{{ row.b }}</td>
        </tr>
      </tbody>
    </table>
  </ml-base-dialog>

  <ml-color-picker-dlg
    v-model="fillPickerOpen"
    :title="t('dialog.colorPickerDlg.title')"
    :color="fillPickerColor"
    :z-index="2400"
    @ok="applyFillColor"
  />
</template>

<script lang="ts" setup>
import {
  AcApDocManager,
  DIM_STYLE_FIELDS,
  type DimStyleField,
  getDimStyleOverride,
  readDimStyleFields,
  setDimStyleOverride,
  writeDimStyleFields
} from '@mlightcad/cad-simple-viewer'
import {
  AcCmColor,
  AcCmColorMethod,
  AcDbDatabase,
  acdbDecodeDimStyleColor,
  AcDbDimension,
  AcDbDimStyleTableRecord,
  type AcGiLineWeight
} from '@mlightcad/data-model'
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useDialogManager } from '../../composable'
import { colorName } from '../../locale'
import MlBaseDialog from '../common/MlBaseDialog.vue'
import MlColorDropdown from '../common/MlColorDropdown.vue'
import MlFieldsetGroup from '../common/MlFieldsetGroup.vue'
import MlLineWeightSelect from '../common/MlLineWeightSelect.vue'
import MlColorPickerDlg from './MlColorPickerDlg.vue'
import MlDimStylePreview from './MlDimStylePreview.vue'

const visible = defineModel<boolean>('modelValue', { default: false })
const { t } = useI18n()

const filter = ref<'all' | 'used'>('all')
const previewRevision = ref(0)
const selected = ref('')
const currentName = ref('')
const styleNames = ref<string[]>([])
const usedNames = ref<Set<string>>(new Set())
const form = reactive<Record<string, string>>({})
const tab = ref('lines')
const newOpen = ref(false)
const editOpen = ref(false)
const compareOpen = ref(false)
const editMode = ref<'modify' | 'new' | 'override'>('modify')
const newName = ref('')
const newStart = ref('')
const compareA = ref('')
const compareB = ref('')
/** Annotative flag lives in AcadAnnotative XDATA, not a DIMSTYLE field. */
const annotativeFlag = ref(false)

const fieldGroups: { id: string; label: string; fields: DimStyleField[] }[] = [
  {
    id: 'lines',
    label: 'dialog.dimStyleDlg.tabs.lines',
    fields: [
      'dimclrd',
      'dimlwd',
      'dimdle',
      'dimdli',
      'dimsd1',
      'dimsd2',
      'dimclre',
      'dimlwe',
      'dimexe',
      'dimexo',
      'dimse1',
      'dimse2'
    ]
  },
  {
    id: 'symbols',
    label: 'dialog.dimStyleDlg.tabs.symbols',
    fields: [
      'dimblk',
      'dimblk1',
      'dimblk2',
      'dimsah',
      'dimldrblk',
      'dimasz',
      'dimcen',
      'dimtsz'
    ]
  },
  {
    id: 'text',
    label: 'dialog.dimStyleDlg.tabs.text',
    fields: [
      'dimtxsty',
      'dimclrt',
      'dimtfill',
      'dimtfillclr',
      'dimtxt',
      'dimtfac',
      'dimgap',
      'dimtad',
      'dimjust',
      'dimtxtdirection',
      'dimtih',
      'dimtoh'
    ]
  },
  {
    id: 'fit',
    label: 'dialog.dimStyleDlg.tabs.fit',
    fields: [
      'dimatfit',
      'dimtix',
      'dimsoxd',
      'dimtofl',
      'dimscale',
      'dimtmove',
      'dimupt'
    ]
  },
  {
    id: 'primary',
    label: 'dialog.dimStyleDlg.tabs.primary',
    fields: [
      'dimlunit',
      'dimdec',
      'dimfrac',
      'dimdsep',
      'dimrnd',
      'dimpost',
      'dimlfac',
      'dimzin',
      'dimaunit',
      'dimadec',
      'dimazin'
    ]
  },
  {
    id: 'alternate',
    label: 'dialog.dimStyleDlg.tabs.alternate',
    fields: [
      'dimalt',
      'dimaltu',
      'dimaltd',
      'dimaltf',
      'dimapost',
      'dimaltrnd',
      'dimaltz'
    ]
  },
  {
    id: 'tolerances',
    label: 'dialog.dimStyleDlg.tabs.tolerances',
    fields: [
      'dimtol',
      'dimlim',
      'dimtp',
      'dimtm',
      'dimtdec',
      'dimtfac',
      'dimtolj',
      'dimtzin'
    ]
  }
]

const labeledFieldGroups = computed(() =>
  fieldGroups.map(group => ({
    ...group,
    // eslint-disable-next-line @intlify/vue-i18n/no-dynamic-keys -- tab labels are data-driven keys
    title: t(group.label)
  }))
)

function database(): AcDbDatabase | undefined {
  return AcApDocManager.instance.curDocument?.database
}

function reload() {
  const db = database()
  if (!db) return
  const names: string[] = []
  for (const record of db.tables.dimStyleTable.newIterator()) {
    if (!record.name.startsWith('*')) names.push(record.name)
  }
  styleNames.value = names
  currentName.value = db.dimstyle
  const used = new Set<string>()
  for (const block of db.tables.blockTable.newIterator()) {
    // Skip anonymous dim / xref / hatch blocks; scan model + paper layouts.
    const name = block.name ?? ''
    if (name.startsWith('*') && !/^(\*Model_Space|\*Paper_Space)/i.test(name)) {
      continue
    }
    for (const entity of block.newIterator()) {
      if (entity instanceof AcDbDimension && entity.dimensionStyleName) {
        used.add(entity.dimensionStyleName)
      }
    }
  }
  usedNames.value = used
  selected.value = names.includes(db.dimstyle) ? db.dimstyle : names[0] || ''
  compareA.value = selected.value
  compareB.value = names[0] || ''
  previewRevision.value++
}

const visibleNames = computed(() => {
  if (filter.value === 'used') {
    return styleNames.value.filter(name => usedNames.value.has(name))
  }
  return styleNames.value
})

const selectedStyle = computed(() => {
  const db = database()
  if (!db || !selected.value) return undefined
  return db.tables.dimStyleTable.getAt(selected.value)
})

const description = computed(() => {
  // Re-evaluate after in-place DIMSTYLE edits performed by the Modify dialog.
  void previewRevision.value
  const style = selectedStyle.value
  if (!style) return ''
  return `DIMTXT=${style.dimtxt}  DIMASZ=${style.dimasz}  DIMSCALE=${style.dimscale}  DIMDLI=${style.dimdli}`
})

const editTitle = computed(() => {
  if (editMode.value === 'override')
    return t('dialog.dimStyleDlg.overrideTitle')
  if (editMode.value === 'new') {
    return t('dialog.dimStyleDlg.newStyleTitle', { name: newName.value })
  }
  return t('dialog.dimStyleDlg.modifyTitle', { name: selected.value })
})

function loadForm(style: AcDbDimStyleTableRecord | undefined) {
  if (!style) return
  annotativeFlag.value = style.annotative === true
  const values = readDimStyleFields(style)
  for (const key of DIM_STYLE_FIELDS) {
    form[key] = values[key] == null ? '' : String(values[key])
  }
  loadDimPostParts(String(form.dimpost ?? ''))
  // Re-derive Symmetric vs Deviation from the freshly loaded fields.
  tolSymDevOverride.value = null
}

const STRING_FIELDS = new Set<DimStyleField>([
  'dimpost',
  'dimapost',
  'dimdsep',
  'dimtxsty',
  'dimldrblk',
  'dimblk',
  'dimblk1',
  'dimblk2'
])

function parsedForm(): Partial<Record<DimStyleField, unknown>> {
  const out: Partial<Record<DimStyleField, unknown>> = {}
  for (const key of DIM_STYLE_FIELDS) {
    const raw = form[key]
    if (raw == null) continue
    if (STRING_FIELDS.has(key)) {
      out[key] = raw
      continue
    }
    const numeric = Number(raw)
    out[key] = raw.trim() === '' || Number.isNaN(numeric) ? raw : numeric
  }
  return out
}

/** Preview record reflecting the in-progress edits of the current tab. */
const previewRecord = computed(() => {
  const record = new AcDbDimStyleTableRecord()
  const values: Partial<Record<DimStyleField, unknown>> = {}
  for (const key of DIM_STYLE_FIELDS) {
    const raw = form[key]
    if (raw == null) continue
    if (STRING_FIELDS.has(key)) {
      values[key] = raw
      continue
    }
    const numeric = Number(raw)
    if (raw.trim() !== '' && Number.isFinite(numeric)) values[key] = numeric
  }
  writeDimStyleFields(record, values)
  return record
})

function numberValue(field: DimStyleField): number {
  const value = Number(form[field])
  return Number.isFinite(value) ? value : 0
}

function setNumberField(
  field: DimStyleField,
  value: number | null | undefined
) {
  form[field] = value == null || !Number.isFinite(value) ? '' : String(value)
}

function flagValue(field: DimStyleField): boolean {
  return numberValue(field) !== 0
}

function setFlagField(field: DimStyleField, value: boolean | string | number) {
  form[field] = value ? '1' : '0'
}

function stringValue(field: DimStyleField): string {
  return String(form[field] ?? '')
}

function setStringField(field: DimStyleField, value: string) {
  form[field] = value
}

/** Arrow block choices: block-name value and AutoCAD-style display name. */
const ARROW_BLOCKS: { value: string; key: string }[] = [
  { value: '', key: 'closedFilled' },
  { value: '_NONE', key: 'none' },
  { value: '_CLOSED', key: 'closed' },
  { value: '_CLOSEDBLANK', key: 'closedBlank' },
  { value: '_OPEN', key: 'open' },
  { value: '_DOT', key: 'dot' },
  { value: '_DOTSMALL', key: 'dotSmall' },
  { value: '_BOXBLANK', key: 'box' },
  { value: '_BOXFILLED', key: 'boxFilled' },
  { value: '_ARCHTICK', key: 'archTick' },
  { value: '_OBLIQUE', key: 'oblique' },
  { value: '_ORIGIN', key: 'origin' }
]

/** Static i18n labels keyed by block name, so lint sees literal keys. */
function arrowBlockLabels(): Record<string, string> {
  const keys = {
    '': 'dialog.dimStyleDlg.symbolsTab.arrows.closedFilled',
    _NONE: 'dialog.dimStyleDlg.symbolsTab.arrows.none',
    _CLOSED: 'dialog.dimStyleDlg.symbolsTab.arrows.closed',
    _CLOSEDBLANK: 'dialog.dimStyleDlg.symbolsTab.arrows.closedBlank',
    _OPEN: 'dialog.dimStyleDlg.symbolsTab.arrows.open',
    _DOT: 'dialog.dimStyleDlg.symbolsTab.arrows.dot',
    _DOTSMALL: 'dialog.dimStyleDlg.symbolsTab.arrows.dotSmall',
    _BOXBLANK: 'dialog.dimStyleDlg.symbolsTab.arrows.box',
    _BOXFILLED: 'dialog.dimStyleDlg.symbolsTab.arrows.boxFilled',
    _ARCHTICK: 'dialog.dimStyleDlg.symbolsTab.arrows.archTick',
    _OBLIQUE: 'dialog.dimStyleDlg.symbolsTab.arrows.oblique',
    _ORIGIN: 'dialog.dimStyleDlg.symbolsTab.arrows.origin'
  } as Record<string, string>
  for (const [value, key] of Object.entries(keys)) {
    // eslint-disable-next-line @intlify/vue-i18n/no-dynamic-keys -- labels are data-driven literals
    keys[value] = t(key)
  }
  return keys
}

const arrowOptions = computed(() => {
  const labels = arrowBlockLabels()
  return ARROW_BLOCKS.map(opt => ({
    value: opt.value,
    label: labels[opt.value]
  }))
})

/**
 * First/second arrow selects behave like AutoCAD: picking the same arrow for
 * both sides clears DIMSAH so DIMBLK wins, picking different arrows sets it so
 * DIMBLK1/DIMBLK2 win.
 */
function setArrowField(
  field: 'dimblk1' | 'dimblk2',
  value: string
) {
  setStringField(field, value)
  if (field === 'dimblk1') {
    // DIMBLK drives the preview rendition of the first arrow.
    setStringField('dimblk', value)
  }
  setFlagField('dimsah', form.dimblk1 !== form.dimblk2)
}

const leaderArrowOptions = computed(() => [
  {
    value: '',
    label: t('dialog.dimStyleDlg.symbolsTab.leaderInherit')
  },
  ...arrowOptions.value.filter(opt => opt.value !== '')
])

/** DIMCEN sign encodes the center-mark type: 0 = none, positive = mark, negative = centerlines. */
const centerMarkType = computed(() => {
  const value = numberValue('dimcen')
  if (Math.abs(value) < 0.0001) return 'none'
  return value > 0 ? 'mark' : 'line'
})

function setCenterMarkType(type: string | number) {
  if (type === 'none') {
    setNumberField('dimcen', 0)
    return
  }
  const size = Math.abs(numberValue('dimcen')) || 2.5
  setNumberField('dimcen', type === 'mark' ? size : -size)
}

function setCenterMarkSize(value: number | null | undefined) {
  const size = value == null || !Number.isFinite(value) ? 0 : Math.abs(value)
  const type = centerMarkType.value
  if (type === 'none' && size > 0) {
    setNumberField('dimcen', size)
    return
  }
  setNumberField(
    'dimcen',
    type === 'line' ? -size : type === 'mark' ? size : 0
  )
}

/**
 * Text tab helpers.
 *
 * - 文字样式 dropdown reads the drawing text style table; the ". . ." button
 *   opens the registered Text Style dialog like AutoCAD does.
 * - 填充颜色 encodes into DIMTFILL (0 = none, 1 = drawing background,
 *   2 = DIMTFILLCLR color).
 * - 文字对齐 radio encodes into DIMTIH/DIMTOH pairs.
 */
const { toggleDialog } = useDialogManager()

const textStyleNames = computed(() => {
  const db = database()
  if (!db) return []
  const names: string[] = []
  for (const record of db.tables.textStyleTable.newIterator()) {
    if (!record.name.startsWith('*')) names.push(record.name)
  }
  return names
})

function toggleTextStyleDlg() {
  toggleDialog('TextStyleDlg', true)
}

/** Fill-color presets mirroring the standard color dropdown entries. */
const FILL_COLOR_PRESETS: { key: string; name: string }[] = [
  { key: 'bylayer', name: 'ByLayer' },
  { key: 'byblock', name: 'ByBlock' },
  { key: 'aci-1', name: 'Red' },
  { key: 'aci-2', name: 'Yellow' },
  { key: 'aci-3', name: 'Green' },
  { key: 'aci-4', name: 'Cyan' },
  { key: 'aci-5', name: 'Blue' },
  { key: 'aci-6', name: 'Magenta' }
]

const fillColorOptions = computed(() =>
  FILL_COLOR_PRESETS.map(item => ({
    key: item.key,
    label: colorName(item.name),
    css: fillColorKeyToCss(item.key)
  }))
)

function fillColorKeyToColor(key: string): AcCmColor {
  const c = new AcCmColor()
  if (key === 'bylayer') c.setByLayer()
  else if (key === 'byblock') c.setByBlock()
  else if (key.startsWith('aci-')) c.colorIndex = Number(key.substring(4))
  else if (key.startsWith('rgb-')) {
    const [_, r, g, b] = key.split('-')
    c.setRGB(Number(r), Number(g), Number(b))
  }
  return c
}

function fillColorKeyToCss(key: string): string {
  if (key === 'bylayer') return '#7b8794'
  if (key === 'byblock') return '#a0a8b8'
  if (key.startsWith('aci-')) {
    const cm = new AcCmColor(AcCmColorMethod.ByACI, Number(key.substring(4)))
    return cm.cssColor ?? ''
  }
  if (key.startsWith('rgb-')) {
    const [_, r, g, b] = key.split('-')
    return `rgb(${r}, ${g}, ${b})`
  }
  return ''
}

function fillColorKeyOf(color: AcCmColor): string | undefined {
  if (color.isByLayer) return 'bylayer'
  if (color.isByBlock) return 'byblock'
  if (color.isByACI && color.colorIndex != null) {
    const key = `aci-${color.colorIndex}`
    return FILL_COLOR_PRESETS.some(item => item.key === key) ? key : undefined
  }
  const rgb = color.RGB
  if (typeof rgb === 'number') {
    return `rgb-${(rgb >> 16) & 0xff}-${(rgb >> 8) & 0xff}-${rgb & 0xff}`
  }
  return undefined
}

const fillColorChoice = computed<string>(() => {
  const fill = numberValue('dimtfill')
  if (fill === 1) return 'background'
  if (fill === 2) {
    const color = acdbDecodeDimStyleColor(numberValue('dimtfillclr'))
    return fillColorKeyOf(color) ?? 'custom'
  }
  return 'none'
})

function setFillColorChoice(value: string) {
  if (value === 'none') {
    setNumberField('dimtfill', 0)
    return
  }
  if (value === 'background') {
    setNumberField('dimtfill', 1)
    return
  }
  if (value === 'custom') {
    fillPickerOpen.value = true
    return
  }
  setNumberField('dimtfill', 2)
  setNumberField(
    'dimtfillclr',
    dimStyleColorNumber(fillColorKeyToColor(value))
  )
}

const fillPickerOpen = ref(false)

const fillPickerColor = computed<string | undefined>(() =>
  numberValue('dimtfill') === 2 ? acdbDecodeDimStyleColor(
    numberValue('dimtfillclr')
  ).toString() : undefined
)

function applyFillColor(color: AcCmColor) {
  setNumberField('dimtfill', 2)
  setNumberField('dimtfillclr', dimStyleColorNumber(color))
}

/** 绘制文字边框 flips the sign of DIMGAP without changing the offset value. */
function setFrameText(frame: boolean | string | number) {
  const size = Math.abs(numberValue('dimgap')) || 1
  setNumberField('dimgap', frame ? -size : size)
}

function setOffsetFromDimLine(value: number | null | undefined) {
  const framed = numberValue('dimgap') < 0
  const offset = value == null || !Number.isFinite(value) ? 0 : Math.abs(value)
  // Keep a non-zero magnitude while the frame is on so the negative sign survives.
  const magnitude = framed ? offset || 1e-6 : offset
  setNumberField('dimgap', framed ? -magnitude : magnitude)
}

/**
 * Text alignment radio: DIMTIH/DIMTOH pairs encode 水平 (1/1),
 * 与尺寸线对齐 (0/0) and ISO 标准 (0/1).
 */
const textAlignment = computed<string>(() => {
  if (numberValue('dimtih') !== 0) return 'horizontal'
  if (numberValue('dimtoh') !== 0) return 'iso'
  return 'along'
})

function setTextAlignment(value: string) {
  if (value === 'horizontal') {
    setNumberField('dimtih', 1)
    setNumberField('dimtoh', 1)
  } else if (value === 'iso') {
    setNumberField('dimtih', 0)
    setNumberField('dimtoh', 1)
  } else {
    setNumberField('dimtih', 0)
    setNumberField('dimtoh', 0)
  }
}

/**
 * Alternate Units tab: DIMALTU unit-format choices, mirroring the AutoCAD
 * Alternate Units tab (values 1-8; 4/6 stacked/plain architectural and
 * 5/7 stacked/plain fractional).
 */
const ALT_UNIT_FORMATS: { value: number; key: string }[] = [
  { value: 1, key: 'scientific' },
  { value: 2, key: 'decimal' },
  { value: 3, key: 'engineering' },
  { value: 4, key: 'architecturalStacked' },
  { value: 5, key: 'fractionalStacked' },
  { value: 6, key: 'architectural' },
  { value: 7, key: 'fractional' },
  { value: 8, key: 'windowsDesktop' }
]

const alternateUnitOptions = computed(() =>
  ALT_UNIT_FORMATS.map(opt => ({
    value: opt.value,
    // eslint-disable-next-line @intlify/vue-i18n/no-dynamic-keys -- labels are data-driven literals
    label: t(`dialog.dimStyleDlg.alternateTab.unitFormats.${opt.key}`)
  }))
)
// Precision dropdown entries are shared with the Primary Units tab below.

/**
 * DIMAPOST stores the alternate prefix and suffix as `<prefix><><suffix>`;
 * without a `<>` marker the whole string is a suffix. The Alternate Units
 * tab edits each half through separate inputs.
 */
function alternatePostParts(): { prefix: string; suffix: string } {
  const raw = stringValue('dimapost')
  const marker = raw.indexOf('<>')
  if (marker < 0) return { prefix: '', suffix: raw === '.' ? '' : raw }
  return { prefix: raw.slice(0, marker), suffix: raw.slice(marker + 2) }
}

const alternatePrefix = computed({
  get: () => alternatePostParts().prefix,
  set: value => {
    const { suffix } = alternatePostParts()
    form.dimapost = value ? `${value}<>${suffix}` : suffix
  }
})

const alternateSuffix = computed({
  get: () => alternatePostParts().suffix,
  set: value => {
    const { prefix } = alternatePostParts()
    form.dimapost = prefix ? `${prefix}<>${value}` : value
  }
})

type AlternateZeroPart = 'leading' | 'trailing' | 'zeroFeet' | 'zeroInches'

/**
 * DIMALTZ is bit-coded: 4 suppresses leading zeros and 8 trailing zeros,
 * while values 0-3 describe feet-and-inch zero handling (0 = suppress zero
 * feet and zero inches, 1 = keep both, 2 = suppress zero inches only,
 * 3 = suppress zero feet only).
 */
const alternateZero = computed(() => {
  const value = numberValue('dimaltz') & 0xff
  const base = value & 3
  return {
    leading: (value & 4) !== 0,
    trailing: (value & 8) !== 0,
    zeroFeet: base === 0 || base === 3,
    zeroInches: base === 0 || base === 2
  }
})

function setAlternateZero(
  part: AlternateZeroPart,
  checked: boolean | string | number
) {
  const current = alternateZero.value
  const next = {
    leading: current.leading,
    trailing: current.trailing,
    zeroFeet: current.zeroFeet,
    zeroInches: current.zeroInches,
    [part]: Boolean(checked)
  }
  let base: number
  if (next.zeroFeet && next.zeroInches) base = 0
  else if (next.zeroInches) base = 2
  else if (next.zeroFeet) base = 3
  else base = 1
  form.dimaltz = String(
    base | (next.leading ? 4 : 0) | (next.trailing ? 8 : 0)
  )
}

/**
 * Fit-tab "Fit Options" radio. DIMTIX on means "text always between
 * extension lines"; otherwise DIMATFIT picks the move-first element
 * (0 = both outside, 1 = arrows, 2 = text, 3 = best fit).
 */
const fitChoice = computed(() => {
  if (flagValue('dimtix')) return 'alwaysInside'
  switch (numberValue('dimatfit')) {
    case 0:
      return 'textAndArrows'
    case 1:
      return 'arrows'
    case 2:
      return 'text'
    default:
      return 'best'
  }
})

function setFitChoice(choice: string | number) {
  if (choice === 'alwaysInside') {
    setFlagField('dimtix', true)
    return
  }
  const dimatfit = choice === 'arrows' ? 1 : choice === 'text' ? 2 : choice === 'textAndArrows' ? 0 : 3
  setFlagField('dimtix', false)
  setNumberField('dimatfit', dimatfit)
}

/** Fit-tab "Text Placement" radios driven by DIMTMOVE (0/1/2). */
const textPlacement = computed(() => {
  switch (numberValue('dimtmove')) {
    case 1:
      return 'leader'
    case 2:
      return 'free'
    default:
      return 'beside'
  }
})

function setTextPlacement(choice: string | number) {
  setNumberField(
    'dimtmove',
    choice === 'leader' ? 1 : choice === 'free' ? 2 : 0
  )
}

/** DIMSCALE 0 = scale to layout (paper space); any other value = global scale. */
const scaleMode = computed(() =>
  numberValue('dimscale') > 0 ? 'global' : 'layout'
)

function setScaleMode(mode: string | number) {
  if (mode === 'global') {
    // Keep the previous scale when switching back from "scale to layout".
    if (numberValue('dimscale') <= 0) setNumberField('dimscale', 1)
  } else {
    setNumberField('dimscale', 0)
  }
}

function setOverallScale(value: number | null | undefined) {
  setNumberField('dimscale', value != null && Number.isFinite(value) && value > 0 ? value : 0)
}

function lineWeightValue(field: DimStyleField): AcGiLineWeight {
  return numberValue(field) as AcGiLineWeight
}

function dimStyleColor(field: DimStyleField): AcCmColor {
  return acdbDecodeDimStyleColor(numberValue(field))
}

/**
 * DXF packed true-color flag used by DIMSTYLE color fields. Mirrors the
 * `RAW_COLOR_TYPE_RGB` constant of the data-model color codec.
 */
const DIM_COLOR_TYPE_RGB = 0xc2

/** Converts a color to the numeric form stored by DIMSTYLE color fields. */
function dimStyleColorNumber(color: AcCmColor): number {
  if (color.isByBlock) return 0
  if (color.isByLayer) return 256
  const aci = color.colorIndex
  if (color.isByACI && aci != null && aci > 0 && aci < 256) return aci
  const rgb = color.RGB
  if (typeof rgb === 'number') {
    return ((DIM_COLOR_TYPE_RGB << 24) | (rgb & 0xffffff)) >> 0
  }
  return 0
}

function setDimStyleColor(field: DimStyleField, color?: AcCmColor) {
  if (!color) return
  form[field] = String(dimStyleColorNumber(color))
}

/* ---------- Primary Units tab: shared dropdown options ---------- */

/** Precision dropdown entries; DIMDEC/DIMADEC accept 0..8 decimal places. */
const precisionOptions = Array.from({ length: 9 }, (_, value) => ({
  value,
  label: value === 0 ? '0' : `0.${'0'.repeat(value)}`
}))

function clampedNumber(
  field: DimStyleField,
  min: number,
  max: number,
  fallback: number
): number {
  const value = Math.round(numberValue(field))
  return value >= min && value <= max ? value : fallback
}

/* ---------- Primary Units tab: linear dimensions (DIMLUNIT/DIMDEC/DIMFRAC/DIMDSEP) ---------- */

/**
 * DIMLUNIT choices: 1 Scientific, 2 Decimal, 3 Engineering, 4 Architectural,
 * 5 Fractional, 6 Windows Desktop. Out-of-range stored values (e.g. the
 * pre-2000 DIMUNIT 0) display as Decimal without rewriting the file value.
 */
const linearFormat = computed(() => clampedNumber('dimlunit', 1, 6, 2))
const linearPrecision = computed(() => clampedNumber('dimdec', 0, 8, 4))
const fractionFormat = computed(() => clampedNumber('dimfrac', 0, 2, 0))

/** DIMFRAC only applies to the Architectural/Fractional unit formats. */
const fractionEnabled = computed(
  () => linearFormat.value === 4 || linearFormat.value === 5
)

/** DIMDSEP only applies to the Decimal unit format. */
const separatorEnabled = computed(() => linearFormat.value === 2)

const decimalSeparator = computed(() => {
  const value = stringValue('dimdsep')
  return value === ',' || value === ' ' ? value : '.'
})

function setLinearFormat(value: string | number) {
  setStringField('dimlunit', String(Number(value)))
  // Feet/inch suppression follows the unit format, so refresh DIMZIN low bits.
  refreshDimzin()
}

/* ---------- Primary Units tab: measurement scale (DIMLFAC) ---------- */

const scaleFactor = computed(() => Math.abs(numberValue('dimlfac')))

/** A negative DIMLFAC applies the scale factor to layout dimensions only. */
const scaleLayoutOnly = computed(() => numberValue('dimlfac') < 0)

function setScaleFactor(value: number | null | undefined) {
  const amount = value == null || !Number.isFinite(value) ? 0 : Math.abs(value)
  form.dimlfac = String(scaleLayoutOnly.value ? -amount : amount)
}

function setScaleLayoutOnly(value: boolean | string | number) {
  const amount = Math.abs(numberValue('dimlfac'))
  form.dimlfac = String(value ? -amount : amount)
}

/* ---------- Primary Units tab: zero suppression (DIMZIN) ---------- */

/** Engineering (3) and Architectural (4) formats display feet and inches. */
const feetInchEnabled = computed(() => {
  const format = linearFormat.value
  return format === 3 || format === 4
})

const zeroLeading = computed(() => (numberValue('dimzin') & 4) !== 0)
const zeroTrailing = computed(() => (numberValue('dimzin') & 8) !== 0)

const zeroFeet = computed(() => {
  if (!feetInchEnabled.value) return false
  const base = numberValue('dimzin') & 3
  // 0 (suppress both) and 3 (suppress zero feet) hide the zero feet portion.
  return base === 0 || base === 3
})

const zeroInches = computed(() => {
  if (!feetInchEnabled.value) return false
  const base = numberValue('dimzin') & 3
  // 0 (suppress both) and 2 (suppress zero inches) hide the zero inch portion.
  return base === 0 || base === 2
})

/** DIMZIN low bits mirror the zero feet/inches checkboxes. */
function zinBase(feet: boolean, inches: boolean): number {
  if (!feetInchEnabled.value) return 0
  if (feet && inches) return 0
  if (feet) return 3
  if (inches) return 2
  return 1
}

/** Writes DIMZIN from the feet/inch low bits plus the 4 (leading) / 8 (trailing) flags. */
function writeDimzin(base: number, leading: boolean, trailing: boolean): void {
  form.dimzin = String(base | (leading ? 4 : 0) | (trailing ? 8 : 0))
}

function setZeroLeading(value: boolean | string | number) {
  writeDimzin(
    zinBase(zeroFeet.value, zeroInches.value),
    !!value,
    zeroTrailing.value
  )
}

function setZeroTrailing(value: boolean | string | number) {
  writeDimzin(
    zinBase(zeroFeet.value, zeroInches.value),
    zeroLeading.value,
    !!value
  )
}

function setZeroFeet(value: boolean | string | number) {
  writeDimzin(
    zinBase(!!value, zeroInches.value),
    zeroLeading.value,
    zeroTrailing.value
  )
}

function setZeroInches(value: boolean | string | number) {
  writeDimzin(
    zinBase(zeroFeet.value, !!value),
    zeroLeading.value,
    zeroTrailing.value
  )
}

/** Recomputes the DIMZIN low bits after the unit format changes. */
function refreshDimzin(): void {
  writeDimzin(
    zinBase(zeroFeet.value, zeroInches.value),
    zeroLeading.value,
    zeroTrailing.value
  )
}

/* ---------- Primary Units tab: prefix and suffix (DIMPOST) ---------- */

const dimPostPrefix = ref('')
const dimPostSuffix = ref('')

const dimPrefix = computed({
  get: () => dimPostPrefix.value,
  set: (value: string) => {
    dimPostPrefix.value = value ?? ''
    writeDimPost()
  }
})

const dimSuffix = computed({
  get: () => dimPostSuffix.value,
  set: (value: string) => {
    dimPostSuffix.value = value ?? ''
    writeDimPost()
  }
})

/** Splits DIMPOST (`prefix<>suffix`) into the two editable input fields. */
function loadDimPostParts(raw: string): void {
  const value = String(raw ?? '')
  if (value.includes('<>')) {
    const [prefix, ...rest] = value.split('<>')
    dimPostPrefix.value = prefix
    dimPostSuffix.value = rest.join('<>')
  } else {
    dimPostPrefix.value = ''
    dimPostSuffix.value = value
  }
}

function writeDimPost(): void {
  const prefix = dimPostPrefix.value
  const suffix = dimPostSuffix.value
  form.dimpost = !prefix && !suffix ? '' : `${prefix}<>${suffix}`
}

/**
 * AutoCAD 2016+ sub-unit values shown when Leading suppression is on. The DXF
 * DIMSTYLE record keeps no fields for them, so they hold the AutoCAD defaults
 * for the session only and are not written back into the style record.
 */
const subUnitFactor = ref(100)
const subUnitSuffix = ref('')

/* ---------- Primary Units tab: angular dimensions (DIMAUNIT/DIMADEC/DIMAZIN) ---------- */

/**
 * DIMAUNIT choices: 0 Decimal Degrees, 1 Degrees/Minutes/Seconds,
 * 2 Gradians, 3 Radians.
 */
const angularFormat = computed(() => clampedNumber('dimaunit', 0, 3, 0))

const angularPrecision = computed(() => {
  const value = Math.round(numberValue('dimadec'))
  // DIMADEC < 0 means "follow DIMDEC".
  if (value < 0) return linearPrecision.value
  return Math.min(8, Math.max(0, value))
})

const angularZeroLeading = computed(() => (numberValue('dimazin') & 1) !== 0)
const angularZeroTrailing = computed(() => (numberValue('dimazin') & 2) !== 0)

function setAngularZeroLeading(value: boolean | string | number) {
  form.dimazin = String((value ? 1 : 0) | (angularZeroTrailing.value ? 2 : 0))
}

function setAngularZeroTrailing(value: boolean | string | number) {
  form.dimazin = String((angularZeroLeading.value ? 1 : 0) | (value ? 2 : 0))
}

function setCurrent() {
  const db = database()
  if (!db || !selected.value) return
  db.dimstyle = selected.value
  setDimStyleOverride(db, null)
  currentName.value = selected.value
}

function beginNew() {
  newName.value = ''
  newStart.value = selected.value || styleNames.value[0] || ''
  newOpen.value = true
}

function confirmNew() {
  const name = newName.value.trim()
  const db = database()
  if (!db || !name) return
  const source = db.tables.dimStyleTable.getAt(newStart.value)
  const record = new AcDbDimStyleTableRecord()
  record.name = name
  if (source) writeDimStyleFields(record, readDimStyleFields(source))
  record.dimtxsty = source?.dimtxsty || record.dimtxsty
  db.tables.dimStyleTable.add(record)
  newOpen.value = false
  reload()
  selected.value = name
  editMode.value = 'new'
  loadForm(record)
  editOpen.value = true
}

function beginEdit(mode: 'modify' | 'override') {
  const db = database()
  if (!db) return
  editMode.value = mode
  const name = mode === 'override' ? db.dimstyle : selected.value
  loadForm(db.tables.dimStyleTable.getAt(name))
  const override = mode === 'override' ? getDimStyleOverride(db) : null
  if (override) {
    for (const [key, value] of Object.entries(override)) {
      form[key] = value == null ? '' : String(value)
    }
  }
  // Overrides may merge after loadForm, so keep the DIMPOST parts in sync.
  loadDimPostParts(String(form.dimpost ?? ''))
  // Sub-units have no backing DXF field; keep the AutoCAD defaults per session.
  subUnitFactor.value = 100
  subUnitSuffix.value = ''
  editOpen.value = true
}

function confirmEdit() {
  const db = database()
  if (!db) return
  const values = parsedForm()
  if (editMode.value === 'override') {
    setDimStyleOverride(db, values)
    return
  }
  const name = editMode.value === 'new' ? newName.value.trim() : selected.value
  const record = db.tables.dimStyleTable.getAt(name)
  if (record) {
    writeDimStyleFields(record, values)
    record.annotative = annotativeFlag.value
  }
  reload()
}

const differences = computed(() => {
  const db = database()
  if (!db || !compareOpen.value) return []
  const a = db.tables.dimStyleTable.getAt(compareA.value)
  const b = db.tables.dimStyleTable.getAt(compareB.value)
  if (!a || !b) return []
  const fa = readDimStyleFields(a)
  const fb = readDimStyleFields(b)
  return DIM_STYLE_FIELDS.filter(
    key => String(fa[key]) !== String(fb[key])
  ).map(key => ({
    key,
    a: String(fa[key]),
    b: String(fb[key])
  }))
})

/* ---------- Tolerances tab (DIMTOL/DIMLIM/DIMTP/DIMTM/DIMTDEC/DIMTFAC/DIMTOLJ/DIMTZIN/DIMALTD/DIMALTZ) ---------- */

/**
 * "Tolerance Format" mode, driven by DIMTOL / DIMLIM / DIMGAP.
 * Symmetric keeps the lower deviation equal to the upper (DIMTM = -DIMTP).
 * Basic clears tol/lim and draws a text frame via a negative DIMGAP (same
 * encoding as the Text tab "Draw text frame" checkbox).
 */
type TolerFormat = 'none' | 'symmetric' | 'deviation' | 'limits' | 'basic'

/**
 * When |DIMTP| == |DIMTM|, field inspection cannot tell Symmetric from
 * Deviation; remember the user's last explicit choice for the edit session.
 */
const tolSymDevOverride = ref<'symmetric' | 'deviation' | null>(null)

const tolFormat = computed<TolerFormat>(() => {
  if (flagValue('dimtol')) {
    if (tolSymDevOverride.value) return tolSymDevOverride.value
    const upper = Math.abs(numberValue('dimtp'))
    const lower = Math.abs(numberValue('dimtm'))
    return Math.abs(upper - lower) < 1e-9 ? 'symmetric' : 'deviation'
  }
  if (flagValue('dimlim')) return 'limits'
  // Negative DIMGAP is AutoCAD's "Basic" / "Draw text frame" encoding.
  if (numberValue('dimgap') < 0) return 'basic'
  return 'none'
})

function setDimGapSign(negative: boolean) {
  const size = Math.abs(numberValue('dimgap')) || 1
  setNumberField('dimgap', negative ? -size : size)
}

function setTolerFormat(mode: string | number) {
  switch (mode) {
    case 'symmetric':
      tolSymDevOverride.value = 'symmetric'
      setFlagField('dimtol', true)
      setFlagField('dimlim', false)
      setDimGapSign(false)
      // Symmetric mirrors the upper deviation into the (magnitude) lower one.
      setNumberField('dimtm', -Math.abs(numberValue('dimtp')))
      break
    case 'deviation':
      tolSymDevOverride.value = 'deviation'
      setFlagField('dimtol', true)
      setFlagField('dimlim', false)
      setDimGapSign(false)
      break
    case 'limits':
      tolSymDevOverride.value = null
      setFlagField('dimtol', false)
      setFlagField('dimlim', true)
      setDimGapSign(false)
      break
    case 'basic':
      tolSymDevOverride.value = null
      setFlagField('dimtol', false)
      setFlagField('dimlim', false)
      setDimGapSign(true)
      break
    default:
      tolSymDevOverride.value = null
      setFlagField('dimtol', false)
      setFlagField('dimlim', false)
      setDimGapSign(false)
  }
}

/** Keep DIMTM mirrored while Symmetric is active. */
function setUpperDeviation(value: number | null | undefined) {
  setNumberField('dimtp', value)
  if (tolFormat.value === 'symmetric') {
    setNumberField('dimtm', -Math.abs(numberValue('dimtp')))
  }
}

/** Upper/lower deviations are editable only for tolerance-style modes. */
const toleranceValuesEditable = computed(
  () => tolFormat.value === 'symmetric' || tolFormat.value === 'deviation'
)

/**
 * DIMTM stores the lower deviation as a non-positive number; the dialog
 * shows (and accepts) its magnitude like AutoCAD.
 */
const lowerDeviation = computed(() => Math.abs(numberValue('dimtm')))

function setLowerDeviation(value: number | null | undefined) {
  const amount = value == null || !Number.isFinite(value) ? 0 : value
  setNumberField('dimtm', -Math.abs(amount))
}

function precisionValue(field: DimStyleField): number {
  return Math.min(8, Math.max(0, Math.round(numberValue(field))))
}

function setPrecisionField(field: DimStyleField, decimals: number) {
  form[field] = String(decimals)
}

/** Zero-suppression checkbox state for DIMTZIN / DIMALTZ. */
interface TolerZeroFlags {
  feet: boolean
  inch: boolean
  leading: boolean
  trailing: boolean
}

function zeroFlags(field: DimStyleField): TolerZeroFlags {
  const value = Math.max(0, Math.round(numberValue(field))) & 15
  const base = value & 3
  return {
    // Base value 0 suppresses both zero feet and zero inches.
    feet: base === 0 || base === 2,
    inch: base === 0 || base === 1,
    leading: (value & 4) != 0,
    trailing: (value & 8) != 0
  }
}

function setZeroFlag(
  field: DimStyleField,
  part: keyof TolerZeroFlags,
  checked: boolean | string | number
) {
  const next = { ...zeroFlags(field), [part]: checked === true }
  // Low bits: 0 = suppress both, 1 = show feet only,
  // 2 = suppress feet only, 3 = show both.
  const base = next.feet ? (next.inch ? 0 : 2) : next.inch ? 1 : 3
  const bits = (next.leading ? 4 : 0) | (next.trailing ? 8 : 0)
  form[field] = String(base | bits)
}

/**
 * Tolerance alignment (decimal separators vs. operational signs) has no
 * dedicated DIMSTYLE variable; keep it as an edit-session-only choice that
 * mirrors the AutoCAD dialog.
 */
const tolAlignment = ref<'decimal' | 'operational'>('decimal')
</script>

<style scoped>
.ml-dim-style__current {
  margin-bottom: 8px;
}
.ml-dim-style__body {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr) max-content;
  gap: 12px;
}
.ml-dim-style__list .ml-dim-style__label {
  margin-bottom: 8px;
}
.ml-dim-style__preview-title {
  margin-bottom: 8px;
}
.ml-dim-style__desc-label {
  margin: 10px 0 4px;
}
.ml-dim-style__names {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  border: 1px solid var(--el-border-color);
  height: 210px;
  overflow: auto;
}
.ml-dim-style__names li {
  padding: 4px 8px;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ml-dim-style__names li.is-active {
  background: var(--el-color-primary-light-8);
}
.ml-dim-style__actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ml-dim-style__actions :deep(.el-button) {
  min-width: 84px;
  margin-left: 0;
  padding-inline: 10px;
  white-space: nowrap;
}
.ml-dim-style__preview {
  min-width: 0;
}
.ml-dim-style__desc {
  font-size: 12px;
  white-space: pre-wrap;
}
.ml-dim-style__lines {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 292px;
  gap: 16px;
  align-items: start;
}
.ml-dim-style__lines-main {
  display: grid;
  gap: 12px;
  align-content: start;
}
.ml-dim-style__lines-main :deep(.ml-fieldset-group) {
  height: auto;
}
.ml-dim-style__lines-side {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
.ml-dim-style__stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.ml-dim-style__stack :deep(.el-radio) {
  height: auto;
  margin-right: 24px;
  padding-block: 1px;
  align-items: center;
  white-space: nowrap;
}
.ml-dim-style__stack-item {
  margin-top: 4px;
}
.ml-dim-style__stack-item :deep(.el-checkbox__label) {
  white-space: normal;
}
.ml-dim-style__style-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ml-dim-style__style-row :deep(.el-select) {
  min-width: 0;
  flex: 1;
}
.ml-dim-style__style-btn {
  padding-inline: 8px;
}
.ml-dim-style__frame-check {
  display: flex;
  height: auto;
  margin-top: 6px;
  margin-left: 132px;
}
.ml-dim-style__fill-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ml-dim-style__fill-preview {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 2px;
}
.ml-dim-style__group-hint {
  font-size: 12px;
  color: var(--el-text-color-regular);
  margin-bottom: 4px;
}
.ml-dim-style__scale-global {
  display: flex;
  height: auto;
  align-items: center;
  gap: 6px;
}
.ml-dim-style__row {
  display: grid;
  grid-template-columns: 132px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-height: 24px;
}
.ml-dim-style__row + .ml-dim-style__row {
  margin-top: 6px;
}
.ml-dim-style__row-label {
  color: var(--el-text-color-regular);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ml-dim-style__alt-display {
  height: auto;
  margin-bottom: 6px;
}
.ml-dim-style__row-gap {
  margin-top: 6px;
}
.ml-dim-style__row-control {
  min-width: 0;
}
.ml-dim-style__row-control :deep(.el-select) {
  width: 176px;
}
.ml-dim-style__row-control :deep(.ml-lineweight-select__trigger) {
  min-height: 24px;
  font-size: 12px;
}
.ml-dim-style__checks {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 12px;
  min-width: 0;
}
.ml-dim-style__checks :deep(.el-checkbox) {
  margin-right: 0;
}
.ml-dim-style__number {
  width: 132px;
}
.ml-dim-style__checks-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px 12px;
}
.ml-dim-style__checks-grid :deep(.el-checkbox) {
  margin-right: 0;
}
.ml-dim-style__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 12px;
  max-height: 360px;
  overflow: auto;
}
.ml-dim-style__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}
.ml-dim-style__nested {
  margin-top: 10px;
}
.ml-dim-style__indent {
  margin-left: 18px;
}
.ml-dim-style__angular-row {
  grid-template-columns: 112px minmax(0, 1fr);
}
.ml-dim-style__angular-row .ml-dim-style__row-control :deep(.el-select) {
  width: 100%;
}
.ml-dim-style__compare {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.ml-dim-style__table {
  width: 100%;
  border-collapse: collapse;
}
.ml-dim-style__table th,
.ml-dim-style__table td {
  border-bottom: 1px solid var(--el-border-color);
  text-align: left;
  padding: 4px;
  font-size: 12px;
}
</style>
