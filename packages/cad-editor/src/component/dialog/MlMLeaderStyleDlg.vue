<template>
  <ml-base-dialog
    v-model:modelValue="visible"
    :title="t('dialog.mleaderStyleDlg.title')"
    :width="640"
    :show-footer="true"
    @open="onOpen"
  >
    <div class="ml-mleader-style">
      <div class="ml-mleader-style__current">
        {{ t('dialog.mleaderStyleDlg.current', { name: currentName || '—' }) }}
      </div>
      <div class="ml-mleader-style__body">
        <div class="ml-mleader-style__list">
          <div class="ml-mleader-style__label">
            {{ t('dialog.mleaderStyleDlg.styles') }}
          </div>
          <ul class="ml-mleader-style__names">
            <li
              v-for="name in visibleNames"
              :key="name"
              :class="{ 'is-active': name === selected }"
              @click="selectStyle(name)"
            >
              {{ name }}
            </li>
          </ul>
          <div class="ml-mleader-style__list-filter">
            <span>{{ t('dialog.mleaderStyleDlg.list') }}</span>
            <el-select v-model="filter" size="small" class="ml-mleader-style__filter">
              <el-option
                value="all"
                :label="t('dialog.mleaderStyleDlg.filterAll')"
              />
              <el-option
                value="used"
                :label="t('dialog.mleaderStyleDlg.filterUsed')"
              />
            </el-select>
          </div>
        </div>
        <div class="ml-mleader-style__preview">
          <div class="ml-mleader-style__preview-title">
            {{ t('dialog.mleaderStyleDlg.previewOf', { name: selected || '—' }) }}
          </div>
          <ml-m-leader-style-preview
            :style="managerPreviewStyle"
            :background-rgb="backgroundRgb"
            :revision="previewRevision"
          />
        </div>
        <div class="ml-mleader-style__actions">
          <el-button @click="setCurrent">{{
            t('dialog.mleaderStyleDlg.setCurrent')
          }}</el-button>
          <el-button @click="beginNew">{{
            t('dialog.mleaderStyleDlg.new')
          }}</el-button>
          <el-button :disabled="!selected" @click="beginModify">
            {{ t('dialog.mleaderStyleDlg.modify') }}
          </el-button>
          <el-button
            :disabled="!selected || !canDelete(selected)"
            @click="onDelete"
          >
            {{ t('dialog.mleaderStyleDlg.delete') }}
          </el-button>
        </div>
      </div>
    </div>
    <template #footer>
      <div class="ml-base-dialog-footer-actions">
        <el-button @click="visible = false">{{
          t('dialog.mleaderStyleDlg.close')
        }}</el-button>
        <el-button @click="openHelp('manager')">{{
          t('dialog.mleaderStyleDlg.help')
        }}</el-button>
      </div>
    </template>
  </ml-base-dialog>

  <ml-base-dialog
    v-if="newOpen"
    v-model:modelValue="newOpen"
    :title="t('dialog.mleaderStyleDlg.newTitle')"
    :width="420"
    :z-index="2200"
    @ok="confirmNew"
  >
    <el-form label-position="top">
      <el-form-item :label="t('dialog.mleaderStyleDlg.newName')">
        <el-input v-model="newName" />
      </el-form-item>
      <el-form-item :label="t('dialog.mleaderStyleDlg.startWith')">
        <el-select v-model="newStart" style="width: 100%">
          <el-option
            v-for="name in styleNames"
            :key="name"
            :label="name"
            :value="name"
          />
        </el-select>
      </el-form-item>
    </el-form>
  </ml-base-dialog>

  <ml-base-dialog
    v-if="editOpen"
    v-model:modelValue="editOpen"
    :title="
      t('dialog.mleaderStyleDlg.modifyTitle', { name: selected || '—' })
    "
    :width="720"
    :z-index="2200"
    :auto-close="false"
    @ok="confirmEdit"
    @cancel="cancelEdit"
  >
    <div class="ml-mleader-modify">
      <div class="ml-mleader-modify__main">
        <el-tabs v-model="tab">
          <el-tab-pane
            :label="t('dialog.mleaderStyleDlg.tabs.format')"
            name="format"
          >
            <ml-fieldset-group
              :title="t('dialog.mleaderStyleDlg.format.general')"
            >
              <div class="ml-mleader-modify__row">
                <span class="ml-mleader-modify__label">{{
                  t('dialog.mleaderStyleDlg.format.type')
                }}</span>
                <div class="ml-mleader-modify__control">
                  <el-select
                    v-model="form.leaderLineType"
                    @change="bumpPreview"
                  >
                    <el-option
                      :value="1"
                      :label="t('dialog.mleaderStyleDlg.format.typeStraight')"
                    />
                    <el-option
                      :value="2"
                      :label="t('dialog.mleaderStyleDlg.format.typeSpline')"
                    />
                    <el-option
                      :value="0"
                      :label="t('dialog.mleaderStyleDlg.format.typeNone')"
                    />
                  </el-select>
                </div>
              </div>
              <div class="ml-mleader-modify__row">
                <span class="ml-mleader-modify__label">{{
                  t('dialog.mleaderStyleDlg.format.color')
                }}</span>
                <div class="ml-mleader-modify__control">
                  <ml-color-dropdown
                    :model-value="form.leaderLineColor"
                    @update:model-value="onLeaderColor"
                  />
                </div>
              </div>
              <div class="ml-mleader-modify__row">
                <span class="ml-mleader-modify__label">{{
                  t('dialog.mleaderStyleDlg.format.linetype')
                }}</span>
                <div class="ml-mleader-modify__control">
                  <ml-line-type-select
                    v-model="form.leaderLineTypeName"
                    :options="lineTypeOptions"
                    @change="bumpPreview"
                  />
                </div>
              </div>
              <div class="ml-mleader-modify__row">
                <span class="ml-mleader-modify__label">{{
                  t('dialog.mleaderStyleDlg.format.lineweight')
                }}</span>
                <div class="ml-mleader-modify__control">
                  <ml-line-weight-select
                    v-model="form.leaderLineWeight"
                    @change="bumpPreview"
                  />
                </div>
              </div>
            </ml-fieldset-group>
            <ml-fieldset-group
              :title="t('dialog.mleaderStyleDlg.format.arrowhead')"
            >
              <div class="ml-mleader-modify__row">
                <span class="ml-mleader-modify__label">{{
                  t('dialog.mleaderStyleDlg.format.symbol')
                }}</span>
                <div class="ml-mleader-modify__control">
                  <el-select
                    v-model="form.arrowSymbolId"
                    @change="bumpPreview"
                  >
                    <el-option
                      v-for="opt in arrowOptions"
                      :key="opt.value || 'filled'"
                      :label="opt.label"
                      :value="opt.value"
                    />
                  </el-select>
                </div>
              </div>
              <div class="ml-mleader-modify__row">
                <span class="ml-mleader-modify__label">{{
                  t('dialog.mleaderStyleDlg.format.size')
                }}</span>
                <div
                  class="ml-mleader-modify__control ml-mleader-modify__control--narrow"
                >
                  <el-input-number
                    v-model="form.arrowSize"
                    :step="0.01"
                    :min="0"
                    controls-position="right"
                    @change="bumpPreview"
                  />
                </div>
              </div>
            </ml-fieldset-group>
            <ml-fieldset-group
              :title="t('dialog.mleaderStyleDlg.format.leaderBreak')"
            >
              <div class="ml-mleader-modify__row">
                <span class="ml-mleader-modify__label">{{
                  t('dialog.mleaderStyleDlg.format.breakSize')
                }}</span>
                <div
                  class="ml-mleader-modify__control ml-mleader-modify__control--narrow"
                >
                  <el-input-number
                    v-model="form.breakSize"
                    :step="0.01"
                    :min="0"
                    controls-position="right"
                    @change="bumpPreview"
                  />
                </div>
              </div>
            </ml-fieldset-group>
          </el-tab-pane>

          <el-tab-pane
            :label="t('dialog.mleaderStyleDlg.tabs.structure')"
            name="structure"
          >
            <ml-fieldset-group
              :title="t('dialog.mleaderStyleDlg.structure.constraints')"
            >
              <div class="ml-mleader-modify__check-row">
                <el-checkbox
                  v-model="form.constrainMaxPoints"
                  @change="bumpPreview"
                >
                  {{ t('dialog.mleaderStyleDlg.structure.maxPoints') }}
                </el-checkbox>
                <el-input-number
                  v-model="form.maxLeaderSegmentsPoints"
                  class="ml-mleader-modify__compact-number"
                  :min="2"
                  :step="1"
                  :disabled="!form.constrainMaxPoints"
                  controls-position="right"
                  @change="bumpPreview"
                />
              </div>
              <div class="ml-mleader-modify__check-row">
                <el-checkbox
                  v-model="form.constrainFirstAngle"
                  @change="bumpPreview"
                >
                  {{ t('dialog.mleaderStyleDlg.structure.firstAngle') }}
                </el-checkbox>
                <el-select
                  v-model="form.firstSegmentAngleDegrees"
                  class="ml-mleader-modify__compact-select"
                  :disabled="!form.constrainFirstAngle"
                  @change="bumpPreview"
                >
                  <el-option
                    v-for="deg in angleOptions"
                    :key="`first-${deg}`"
                    :value="deg"
                    :label="String(deg)"
                  />
                </el-select>
              </div>
              <div class="ml-mleader-modify__check-row">
                <el-checkbox
                  v-model="form.constrainSecondAngle"
                  @change="bumpPreview"
                >
                  {{ t('dialog.mleaderStyleDlg.structure.secondAngle') }}
                </el-checkbox>
                <el-select
                  v-model="form.secondSegmentAngleDegrees"
                  class="ml-mleader-modify__compact-select"
                  :disabled="!form.constrainSecondAngle"
                  @change="bumpPreview"
                >
                  <el-option
                    v-for="deg in angleOptions"
                    :key="`second-${deg}`"
                    :value="deg"
                    :label="String(deg)"
                  />
                </el-select>
              </div>
            </ml-fieldset-group>
            <ml-fieldset-group
              :title="t('dialog.mleaderStyleDlg.structure.landing')"
            >
              <el-checkbox
                v-model="form.enableLanding"
                class="ml-mleader-modify__stack-check"
                @change="bumpPreview"
              >
                {{ t('dialog.mleaderStyleDlg.structure.includeLanding') }}
              </el-checkbox>
              <el-checkbox
                v-model="form.setLandingDistance"
                class="ml-mleader-modify__stack-check"
                :disabled="!form.enableLanding"
                @change="bumpPreview"
              >
                {{ t('dialog.mleaderStyleDlg.structure.setLandingDistance') }}
              </el-checkbox>
              <div class="ml-mleader-modify__indent">
                <el-input-number
                  v-model="form.doglegLength"
                  class="ml-mleader-modify__compact-number"
                  :step="0.01"
                  :min="0"
                  :disabled="!form.enableLanding || !form.setLandingDistance"
                  controls-position="right"
                  @change="bumpPreview"
                />
              </div>
            </ml-fieldset-group>
            <ml-fieldset-group
              :title="t('dialog.mleaderStyleDlg.structure.scale')"
            >
              <el-checkbox
                v-model="form.annotative"
                class="ml-mleader-modify__stack-check"
                @change="bumpPreview"
              >
                {{ t('dialog.mleaderStyleDlg.structure.annotative') }}
              </el-checkbox>
              <el-radio-group
                v-model="form.scaleMode"
                :disabled="form.annotative"
                class="ml-mleader-modify__radios"
                @change="bumpPreview"
              >
                <el-radio value="layout">
                  {{ t('dialog.mleaderStyleDlg.structure.scaleToLayout') }}
                </el-radio>
                <div class="ml-mleader-modify__radio-with-control">
                  <el-radio value="specify">
                    {{ t('dialog.mleaderStyleDlg.structure.specifyScale') }}
                  </el-radio>
                  <el-input-number
                    v-model="form.scale"
                    class="ml-mleader-modify__compact-number"
                    :step="0.1"
                    :min="0"
                    :disabled="form.annotative || form.scaleMode !== 'specify'"
                    controls-position="right"
                    @change="bumpPreview"
                  />
                </div>
              </el-radio-group>
            </ml-fieldset-group>
          </el-tab-pane>

          <el-tab-pane
            :label="t('dialog.mleaderStyleDlg.tabs.content')"
            name="content"
          >
            <div class="ml-mleader-modify__row">
              <span class="ml-mleader-modify__label">{{
                t('dialog.mleaderStyleDlg.content.type')
              }}</span>
              <div class="ml-mleader-modify__control">
                <el-select v-model="form.contentType" @change="bumpPreview">
                  <el-option
                    :value="2"
                    :label="t('dialog.mleaderStyleDlg.content.typeMtext')"
                  />
                  <el-option
                    :value="1"
                    :label="t('dialog.mleaderStyleDlg.content.typeBlock')"
                  />
                  <el-option
                    :value="0"
                    :label="t('dialog.mleaderStyleDlg.content.typeNone')"
                  />
                </el-select>
              </div>
            </div>

            <template v-if="form.contentType === 2">
              <ml-fieldset-group
                :title="t('dialog.mleaderStyleDlg.content.textOptions')"
              >
                <div class="ml-mleader-modify__row">
                  <span class="ml-mleader-modify__label">{{
                    t('dialog.mleaderStyleDlg.content.defaultText')
                  }}</span>
                  <div class="ml-mleader-modify__control ml-mleader-modify__with-btn">
                    <el-input
                      v-model="form.defaultMTextContents"
                      @change="bumpPreview"
                    />
                    <el-button @click="defaultTextOpen = true">{{
                      t('dialog.mleaderStyleDlg.content.ellipsis')
                    }}</el-button>
                  </div>
                </div>
                <div class="ml-mleader-modify__row">
                  <span class="ml-mleader-modify__label">{{
                    t('dialog.mleaderStyleDlg.content.textStyle')
                  }}</span>
                  <div class="ml-mleader-modify__control ml-mleader-modify__with-btn">
                    <el-select
                      v-model="form.textStyleName"
                      @change="bumpPreview"
                    >
                      <el-option
                        v-for="name in textStyleNames"
                        :key="name"
                        :label="name"
                        :value="name"
                      />
                    </el-select>
                    <el-button @click="openTextStyleDlg">{{
                      t('dialog.mleaderStyleDlg.content.ellipsis')
                    }}</el-button>
                  </div>
                </div>
                <div class="ml-mleader-modify__row">
                  <span class="ml-mleader-modify__label">{{
                    t('dialog.mleaderStyleDlg.content.textAngle')
                  }}</span>
                  <div class="ml-mleader-modify__control">
                    <el-select
                      v-model="form.textAngleType"
                      @change="bumpPreview"
                    >
                      <el-option
                        :value="0"
                        :label="
                          t('dialog.mleaderStyleDlg.content.angleRightReading')
                        "
                      />
                      <el-option
                        :value="1"
                        :label="
                          t('dialog.mleaderStyleDlg.content.angleHorizontal')
                        "
                      />
                      <el-option
                        :value="2"
                        :label="
                          t('dialog.mleaderStyleDlg.content.angleAsInserted')
                        "
                      />
                    </el-select>
                  </div>
                </div>
                <div class="ml-mleader-modify__row">
                  <span class="ml-mleader-modify__label">{{
                    t('dialog.mleaderStyleDlg.content.textColor')
                  }}</span>
                  <div class="ml-mleader-modify__control">
                    <ml-color-dropdown
                      :model-value="form.textColor"
                      @update:model-value="onTextColor"
                    />
                  </div>
                </div>
                <div class="ml-mleader-modify__row">
                  <span class="ml-mleader-modify__label">{{
                    t('dialog.mleaderStyleDlg.content.textHeight')
                  }}</span>
                  <div
                    class="ml-mleader-modify__control ml-mleader-modify__control--narrow"
                  >
                    <el-input-number
                      v-model="form.textHeight"
                      :step="0.01"
                      :min="0"
                      controls-position="right"
                      @change="bumpPreview"
                    />
                  </div>
                </div>
                <el-checkbox
                  v-model="form.textAlignAlwaysLeft"
                  class="ml-mleader-modify__stack-check"
                  @change="bumpPreview"
                >
                  {{ t('dialog.mleaderStyleDlg.content.alwaysLeftJustify') }}
                </el-checkbox>
                <el-checkbox
                  v-model="form.enableFrameText"
                  class="ml-mleader-modify__stack-check"
                  @change="bumpPreview"
                >
                  {{ t('dialog.mleaderStyleDlg.content.frameText') }}
                </el-checkbox>
              </ml-fieldset-group>

              <ml-fieldset-group
                :title="t('dialog.mleaderStyleDlg.content.leaderConnection')"
              >
                <el-radio-group
                  v-model="form.textAttachmentDirection"
                  class="ml-mleader-modify__radios"
                  @change="bumpPreview"
                >
                  <el-radio :value="0">
                    {{
                      t('dialog.mleaderStyleDlg.content.horizontalAttachment')
                    }}
                  </el-radio>
                  <el-radio :value="1">
                    {{
                      t('dialog.mleaderStyleDlg.content.verticalAttachment')
                    }}
                  </el-radio>
                </el-radio-group>

                <template v-if="form.textAttachmentDirection === 0">
                  <div class="ml-mleader-modify__row">
                    <span class="ml-mleader-modify__label">{{
                      t('dialog.mleaderStyleDlg.content.leftAttachment')
                    }}</span>
                    <div class="ml-mleader-modify__control">
                      <el-select
                        v-model="form.textLeftAttachmentType"
                        @change="bumpPreview"
                      >
                        <el-option
                          v-for="opt in horizontalAttachmentOptions"
                          :key="`L-${opt.value}`"
                          :value="opt.value"
                          :label="opt.label"
                        />
                      </el-select>
                    </div>
                  </div>
                  <div class="ml-mleader-modify__row">
                    <span class="ml-mleader-modify__label">{{
                      t('dialog.mleaderStyleDlg.content.rightAttachment')
                    }}</span>
                    <div class="ml-mleader-modify__control">
                      <el-select
                        v-model="form.textRightAttachmentType"
                        @change="bumpPreview"
                      >
                        <el-option
                          v-for="opt in horizontalAttachmentOptions"
                          :key="`R-${opt.value}`"
                          :value="opt.value"
                          :label="opt.label"
                        />
                      </el-select>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <div class="ml-mleader-modify__row">
                    <span class="ml-mleader-modify__label">{{
                      t('dialog.mleaderStyleDlg.content.topAttachment')
                    }}</span>
                    <div class="ml-mleader-modify__control">
                      <el-select
                        v-model="form.topTextAttachmentType"
                        @change="bumpPreview"
                      >
                        <el-option
                          v-for="opt in verticalAttachmentOptions"
                          :key="`T-${opt.value}`"
                          :value="opt.value"
                          :label="opt.label"
                        />
                      </el-select>
                    </div>
                  </div>
                  <div class="ml-mleader-modify__row">
                    <span class="ml-mleader-modify__label">{{
                      t('dialog.mleaderStyleDlg.content.bottomAttachment')
                    }}</span>
                    <div class="ml-mleader-modify__control">
                      <el-select
                        v-model="form.bottomTextAttachmentType"
                        @change="bumpPreview"
                      >
                        <el-option
                          v-for="opt in verticalAttachmentOptions"
                          :key="`B-${opt.value}`"
                          :value="opt.value"
                          :label="opt.label"
                        />
                      </el-select>
                    </div>
                  </div>
                </template>

                <div class="ml-mleader-modify__row">
                  <span class="ml-mleader-modify__label">{{
                    t('dialog.mleaderStyleDlg.content.landingGap')
                  }}</span>
                  <div
                    class="ml-mleader-modify__control ml-mleader-modify__control--narrow"
                  >
                    <el-input-number
                      v-model="form.landingGap"
                      :step="0.01"
                      :min="0"
                      controls-position="right"
                      @change="bumpPreview"
                    />
                  </div>
                </div>
                <el-checkbox
                  v-if="form.textAttachmentDirection === 0"
                  v-model="form.extendLeaderToText"
                  class="ml-mleader-modify__stack-check"
                  @change="bumpPreview"
                >
                  {{ t('dialog.mleaderStyleDlg.content.extendLeaderToText') }}
                </el-checkbox>
              </ml-fieldset-group>
            </template>

            <template v-else-if="form.contentType === 1">
              <ml-fieldset-group
                :title="t('dialog.mleaderStyleDlg.content.blockOptions')"
              >
                <div class="ml-mleader-modify__row">
                  <span class="ml-mleader-modify__label">{{
                    t('dialog.mleaderStyleDlg.content.sourceBlock')
                  }}</span>
                  <div class="ml-mleader-modify__control">
                    <el-select
                      v-model="form.blockName"
                      filterable
                      allow-create
                      @change="bumpPreview"
                    >
                      <el-option
                        v-for="name in blockNames"
                        :key="name"
                        :label="name"
                        :value="name"
                      />
                    </el-select>
                  </div>
                </div>
                <div class="ml-mleader-modify__row">
                  <span class="ml-mleader-modify__label">{{
                    t('dialog.mleaderStyleDlg.content.blockAttachment')
                  }}</span>
                  <div class="ml-mleader-modify__control">
                    <el-select
                      v-model="form.blockConnectionType"
                      @change="bumpPreview"
                    >
                      <el-option
                        :value="0"
                        :label="
                          t('dialog.mleaderStyleDlg.content.blockAttachCenter')
                        "
                      />
                      <el-option
                        :value="1"
                        :label="
                          t(
                            'dialog.mleaderStyleDlg.content.blockAttachInsertion'
                          )
                        "
                      />
                    </el-select>
                  </div>
                </div>
                <div class="ml-mleader-modify__row">
                  <span class="ml-mleader-modify__label">{{
                    t('dialog.mleaderStyleDlg.content.blockColor')
                  }}</span>
                  <div class="ml-mleader-modify__control">
                    <ml-color-dropdown
                      :model-value="form.blockColor"
                      @update:model-value="onBlockColor"
                    />
                  </div>
                </div>
                <div class="ml-mleader-modify__row">
                  <span class="ml-mleader-modify__label">{{
                    t('dialog.mleaderStyleDlg.content.blockScale')
                  }}</span>
                  <div class="ml-mleader-modify__control">
                    <el-input-number
                      v-model="form.blockScale"
                      :step="0.1"
                      :min="0"
                      controls-position="right"
                      @change="bumpPreview"
                    />
                  </div>
                </div>
              </ml-fieldset-group>
            </template>
          </el-tab-pane>
        </el-tabs>
      </div>
      <div class="ml-mleader-modify__preview">
        <ml-m-leader-style-preview
          :style="editPreviewStyle"
          :background-rgb="backgroundRgb"
          :revision="previewRevision"
        />
      </div>
    </div>
    <template #footer>
      <div class="ml-base-dialog-footer-actions">
        <el-button type="primary" @click="confirmEdit">{{
          t('dialog.baseDialog.ok')
        }}</el-button>
        <el-button @click="cancelEdit">{{
          t('dialog.baseDialog.cancel')
        }}</el-button>
        <el-button @click="openHelp('modify')">{{
          t('dialog.mleaderStyleDlg.help')
        }}</el-button>
      </div>
    </template>
  </ml-base-dialog>

  <ml-base-dialog
    v-if="defaultTextOpen"
    v-model:modelValue="defaultTextOpen"
    :title="t('dialog.mleaderStyleDlg.content.defaultTextTitle')"
    :width="420"
    :z-index="2300"
    @ok="bumpPreview"
  >
    <el-input
      v-model="form.defaultMTextContents"
      type="textarea"
      :rows="6"
    />
  </ml-base-dialog>
</template>

<script lang="ts" setup>
import type { AcCmColor } from '@mlightcad/data-model'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useDialogManager, useMLeaderStyle } from '../../composable'
import {
  buildLineTypeOptions,
  type LineTypeOption
} from '../common/lineTypeOptions'
import MlBaseDialog from '../common/MlBaseDialog.vue'
import MlColorDropdown from '../common/MlColorDropdown.vue'
import MlFieldsetGroup from '../common/MlFieldsetGroup.vue'
import MlLineTypeSelect from '../common/MlLineTypeSelect.vue'
import MlLineWeightSelect from '../common/MlLineWeightSelect.vue'
import { MLEADER_ANGLE_OPTIONS_DEG } from './mleaderStyleForm'
import MlMLeaderStylePreview from './MlMLeaderStylePreview.vue'

const HELP_MANAGER =
  'https://help.autodesk.com/view/ACDLT/2026/ENU/?guid=GUID-C4202790-AA18-4516-862D-110FE6A5E43B'
const HELP_MODIFY =
  'https://help.autodesk.com/view/ACD/2026/ENU/?guid=GUID-9A26BE7C-34BC-4E84-AD0B-67C320C9DD77'

const visible = defineModel<boolean>('modelValue', { default: false })
const { t } = useI18n()
const { toggleDialog } = useDialogManager()

const {
  styleNames,
  currentName,
  selected,
  filter,
  form,
  previewRevision,
  visibleNames,
  reload,
  loadSelectedIntoForm,
  setCurrent,
  canDelete,
  deleteSelected,
  createStyle,
  applyFormToSelected,
  bumpPreview,
  previewStyle,
  canvasBackgroundRgb,
  listTextStyleNames,
  listBlockNames,
  getDb
} = useMLeaderStyle()

const newOpen = ref(false)
const editOpen = ref(false)
const defaultTextOpen = ref(false)
const newName = ref('')
const newStart = ref('')
const tab = ref('format')
const textStyleNames = ref<string[]>(['Standard'])
const blockNames = ref<string[]>([])
const backgroundRgb = ref<number | undefined>(undefined)
const lineTypeOptions = ref<LineTypeOption[]>([])
const angleOptions = MLEADER_ANGLE_OPTIONS_DEG

const ARROW_BLOCKS = [
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
] as const

const arrowOptions = computed(() =>
  ARROW_BLOCKS.map(opt => ({
    value: opt.value,
    // eslint-disable-next-line @intlify/vue-i18n/no-dynamic-keys -- arrow labels are data-driven literals
    label: t(`dialog.mleaderStyleDlg.arrows.${opt.key}`)
  }))
)

const horizontalAttachmentOptions = computed(() =>
  [
    { value: 0, key: 'topOfTop' },
    { value: 1, key: 'middleOfTop' },
    { value: 2, key: 'middle' },
    { value: 3, key: 'middleOfBottom' },
    { value: 4, key: 'bottomOfBottom' },
    { value: 5, key: 'bottomLine' },
    { value: 6, key: 'bottomOfTopLine' },
    { value: 7, key: 'bottomOfTop' },
    { value: 8, key: 'underlineBottom' },
    { value: 9, key: 'underlineAll' }
  ].map(opt => ({
    value: opt.value,
    // eslint-disable-next-line @intlify/vue-i18n/no-dynamic-keys -- attachment labels are data-driven literals
    label: t(`dialog.mleaderStyleDlg.attachments.${opt.key}`)
  }))
)

const verticalAttachmentOptions = computed(() =>
  [
    { value: 9, key: 'center' },
    { value: 10, key: 'linedCenter' }
  ].map(opt => ({
    value: opt.value,
    // eslint-disable-next-line @intlify/vue-i18n/no-dynamic-keys -- attachment labels are data-driven literals
    label: t(`dialog.mleaderStyleDlg.attachments.${opt.key}`)
  }))
)

const managerPreviewStyle = computed(() => previewStyle())
const editPreviewStyle = computed(() => previewStyle())

watch(selected, () => {
  if (!editOpen.value) loadSelectedIntoForm()
})

function onOpen() {
  reload()
  loadSelectedIntoForm()
  backgroundRgb.value = canvasBackgroundRgb()
  textStyleNames.value = listTextStyleNames()
  blockNames.value = listBlockNames()
  lineTypeOptions.value = buildLineTypeOptions(getDb())
}

function selectStyle(name: string) {
  selected.value = name
  loadSelectedIntoForm()
}

function beginNew() {
  newName.value = ''
  newStart.value = selected.value || currentName.value || styleNames.value[0] || ''
  newOpen.value = true
}

function confirmNew() {
  if (!createStyle(newName.value, newStart.value)) return
  newOpen.value = false
  beginModify()
}

function beginModify() {
  if (!selected.value) return
  loadSelectedIntoForm()
  tab.value = 'format'
  backgroundRgb.value = canvasBackgroundRgb()
  textStyleNames.value = listTextStyleNames()
  blockNames.value = listBlockNames()
  lineTypeOptions.value = buildLineTypeOptions(getDb())
  editOpen.value = true
}

function confirmEdit() {
  if (!applyFormToSelected()) return
  editOpen.value = false
  reload()
  loadSelectedIntoForm()
}

function cancelEdit() {
  editOpen.value = false
  loadSelectedIntoForm()
}

function onDelete() {
  deleteSelected()
  loadSelectedIntoForm()
}

function onLeaderColor(color: AcCmColor | undefined) {
  if (!color) return
  form.leaderLineColor = color
  bumpPreview()
}

function onTextColor(color: AcCmColor | undefined) {
  if (!color) return
  form.textColor = color
  bumpPreview()
}

function onBlockColor(color: AcCmColor | undefined) {
  if (!color) return
  form.blockColor = color
  bumpPreview()
}

function openTextStyleDlg() {
  toggleDialog('TextStyleDlg', true)
}

function openHelp(kind: 'manager' | 'modify') {
  const url = kind === 'manager' ? HELP_MANAGER : HELP_MODIFY
  window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<style scoped>
.ml-mleader-style__current {
  margin-bottom: 10px;
  font-weight: 600;
}

.ml-mleader-style__body {
  display: grid;
  grid-template-columns: 180px 1fr 120px;
  gap: 12px;
  min-height: 280px;
}

.ml-mleader-style__label {
  margin-bottom: 4px;
}

.ml-mleader-style__names {
  list-style: none;
  margin: 0;
  padding: 4px;
  height: 220px;
  overflow: auto;
  border: 1px solid var(--el-border-color);
  background: var(--el-fill-color-blank);
}

.ml-mleader-style__names li {
  padding: 2px 6px;
  cursor: pointer;
  border-radius: 2px;
}

.ml-mleader-style__names li.is-active {
  background: var(--el-color-primary);
  color: var(--el-color-white);
}

.ml-mleader-style__list-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.ml-mleader-style__filter {
  flex: 1;
}

.ml-mleader-style__preview-title {
  margin-bottom: 6px;
}

.ml-mleader-style__actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ml-mleader-style__actions :deep(.el-button) {
  margin: 0;
  width: 100%;
}

.ml-mleader-modify {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px;
  gap: 12px;
  align-items: start;
}

.ml-mleader-modify__main {
  min-width: 0;
}

.ml-mleader-modify__main :deep(.ml-fieldset-group) {
  height: auto;
  margin-top: 10px;
  padding: 10px 12px 12px;
}

.ml-mleader-modify__main :deep(.ml-fieldset-group:first-child) {
  margin-top: 6px;
}

.ml-mleader-modify__preview {
  align-self: start;
  margin-top: 32px;
}

.ml-mleader-modify__row {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-height: 28px;
  margin-bottom: 8px;
}

.ml-mleader-modify__row:last-child {
  margin-bottom: 0;
}

.ml-mleader-modify__label {
  text-align: left;
  color: var(--el-text-color-regular);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Full-width controls hug the group right edge. */
.ml-mleader-modify__control {
  min-width: 0;
  width: 100%;
  justify-self: stretch;
}

.ml-mleader-modify__control :deep(.el-select),
.ml-mleader-modify__control :deep(.el-input),
.ml-mleader-modify__control :deep(.el-input-number),
.ml-mleader-modify__control :deep(.ml-color-dropdown),
.ml-mleader-modify__control :deep(.ml-linetype-select),
.ml-mleader-modify__control :deep(.ml-lineweight-select) {
  width: 100%;
}

/*
 * Narrow spinners keep their size but share the same left edge as full-width
 * controls (Size / Break size / Text height / Landing gap).
 */
.ml-mleader-modify__control--narrow {
  width: 120px;
  max-width: 120px;
  justify-self: start;
}

.ml-mleader-modify__control--narrow :deep(.el-input-number) {
  width: 100%;
}

.ml-mleader-modify__check-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  margin-bottom: 8px;
}

.ml-mleader-modify__check-row:last-child {
  margin-bottom: 0;
}

.ml-mleader-modify__check-row :deep(.el-checkbox) {
  margin-right: 0;
  height: auto;
  flex: 1 1 auto;
  min-width: 0;
}

/* Constraints / scale editors share one width and hug the group right edge. */
.ml-mleader-modify__compact-number,
.ml-mleader-modify__compact-select {
  flex: 0 0 120px;
  width: 120px;
  margin-left: auto;
}

.ml-mleader-modify__with-btn {
  display: flex;
  gap: 6px;
  align-items: center;
  width: 100%;
}

.ml-mleader-modify__with-btn :deep(.el-input),
.ml-mleader-modify__with-btn :deep(.el-select) {
  flex: 1;
  min-width: 0;
}

.ml-mleader-modify__with-btn :deep(.el-button) {
  flex: 0 0 auto;
  padding-inline: 8px;
}

.ml-mleader-modify__indent {
  margin: 4px 0 8px 22px;
}

.ml-mleader-modify__stack-check {
  display: flex;
  height: auto;
  margin-top: 6px;
  margin-right: 0;
}

.ml-mleader-modify__radios {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  margin: 6px 0 8px;
  width: 100%;
}

.ml-mleader-modify__radios :deep(.el-radio) {
  height: auto;
  margin-right: 0;
  padding-block: 1px;
}

.ml-mleader-modify__radio-with-control {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.ml-mleader-modify__radio-with-control :deep(.el-radio) {
  flex: 1 1 auto;
  min-width: 0;
}

.ml-mleader-modify__radio-with-control .ml-mleader-modify__compact-number {
  margin-left: auto;
}
</style>
