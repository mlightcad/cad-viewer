<template>
  <div
    class="ml-bdetect-panel"
    :class="{ 'is-busy': state.phase === 'reviewing' }"
    data-testid="bdetect-panel"
  >
    <el-config-provider size="small">
      <el-collapse
        v-model="openSections"
        class="ml-bdetect-panel__options"
        data-testid="bdetect-options"
      >
        <el-collapse-item :title="t('main.bdetect.options')" name="options">
          <div
            class="ml-bdetect-panel__filters"
            :class="{ 'is-disabled': !optionsEditable }"
          >
            <div class="ml-bdetect-panel__option">
              <el-checkbox
                :model-value="state.options.allowRotation"
                :disabled="!optionsEditable"
                @change="(v: unknown) => setOptions({ allowRotation: !!v })"
              >
                {{ t('main.bdetect.rotation') }}
              </el-checkbox>
              <MlBDetectOptionHelp
                :text="t('main.bdetect.help.rotation')"
                :label="
                  t('main.bdetect.explain', {
                    option: t('main.bdetect.rotation')
                  })
                "
              />
            </div>
            <div class="ml-bdetect-panel__option">
              <el-checkbox
                :model-value="state.options.allowMirror"
                :disabled="!optionsEditable"
                @change="(v: unknown) => setOptions({ allowMirror: !!v })"
              >
                {{ t('main.bdetect.mirror') }}
              </el-checkbox>
              <MlBDetectOptionHelp
                :text="t('main.bdetect.help.mirror')"
                :label="
                  t('main.bdetect.explain', {
                    option: t('main.bdetect.mirror')
                  })
                "
              />
            </div>
            <div class="ml-bdetect-panel__option">
              <el-checkbox
                :model-value="state.options.allowScale"
                :disabled="!optionsEditable"
                @change="(v: unknown) => setOptions({ allowScale: !!v })"
              >
                {{ t('main.bdetect.scale') }}
              </el-checkbox>
              <MlBDetectOptionHelp
                :text="t('main.bdetect.help.scale')"
                :label="
                  t('main.bdetect.explain', { option: t('main.bdetect.scale') })
                "
              />
            </div>
            <div class="ml-bdetect-panel__option">
              <el-checkbox
                :model-value="state.options.matchLayer"
                :disabled="!optionsEditable"
                @change="(v: unknown) => setOptions({ matchLayer: !!v })"
              >
                {{ t('main.bdetect.sameLayer') }}
              </el-checkbox>
              <MlBDetectOptionHelp
                :text="t('main.bdetect.help.sameLayer')"
                :label="
                  t('main.bdetect.explain', {
                    option: t('main.bdetect.sameLayer')
                  })
                "
              />
            </div>
            <div class="ml-bdetect-panel__option">
              <el-checkbox
                :model-value="state.options.textVariations"
                :disabled="!optionsEditable"
                @change="(v: unknown) => setOptions({ textVariations: !!v })"
              >
                {{ t('main.bdetect.textVariations') }}
              </el-checkbox>
              <MlBDetectOptionHelp
                :text="t('main.bdetect.help.textVariations')"
                :label="
                  t('main.bdetect.explain', {
                    option: t('main.bdetect.textVariations')
                  })
                "
              />
            </div>
          </div>
          <div
            class="ml-bdetect-panel__thresholds"
            :class="{ 'is-disabled': !optionsEditable }"
          >
            <div class="ml-bdetect-panel__field">
              <span class="ml-bdetect-panel__field-label">
                <label :for="minInstancesId">
                  {{ t('main.bdetect.minInstances') }}
                </label>
                <MlBDetectOptionHelp
                  :text="t('main.bdetect.help.minInstances')"
                  :label="
                    t('main.bdetect.explain', {
                      option: t('main.bdetect.minInstances')
                    })
                  "
                />
              </span>
              <el-input-number
                :id="minInstancesId"
                :model-value="state.options.minInstances"
                :min="2"
                :step="1"
                :disabled="!optionsEditable"
                controls-position="right"
                data-testid="bdetect-min-instances"
                @update:model-value="
                  (v: number | undefined) =>
                    setOptions({ minInstances: v ?? 2 })
                "
              />
            </div>
            <div class="ml-bdetect-panel__field">
              <span class="ml-bdetect-panel__field-label">
                <label :for="minSavingsId">
                  {{ t('main.bdetect.minSavings') }}
                </label>
                <MlBDetectOptionHelp
                  :text="t('main.bdetect.help.minSavings')"
                  :label="
                    t('main.bdetect.explain', {
                      option: t('main.bdetect.minSavings')
                    })
                  "
                />
              </span>
              <el-input-number
                :id="minSavingsId"
                :model-value="state.options.minSavings"
                :min="0"
                :step="1"
                :disabled="!optionsEditable"
                controls-position="right"
                data-testid="bdetect-min-savings"
                @update:model-value="
                  (v: number | undefined) => setOptions({ minSavings: v ?? 0 })
                "
              />
            </div>
            <div class="ml-bdetect-panel__field">
              <span class="ml-bdetect-panel__field-label">
                <label :for="maxEntitiesId">
                  {{ t('main.bdetect.maxEntities') }}
                </label>
                <MlBDetectOptionHelp
                  :text="t('main.bdetect.help.maxEntities')"
                  :label="
                    t('main.bdetect.explain', {
                      option: t('main.bdetect.maxEntities')
                    })
                  "
                />
              </span>
              <el-input-number
                :id="maxEntitiesId"
                :model-value="state.options.maxEntities"
                :min="2"
                :step="1"
                :disabled="!optionsEditable"
                controls-position="right"
                data-testid="bdetect-max-entities"
                @update:model-value="
                  (v: number | undefined) =>
                    setOptions({ maxEntities: v ?? 64 })
                "
              />
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>

      <div
        v-if="state.phase === 'detecting'"
        class="ml-bdetect-panel__progress"
        data-testid="bdetect-progress"
      >
        <span>{{ t('main.bdetect.detecting') }}</span>
        <el-progress :percentage="Math.round(state.progress * 100)" />
        <div class="ml-bdetect-panel__progress-row">
          <span class="ml-bdetect-panel__muted">
            {{ t('main.bdetect.foundSoFar', { count: state.found }) }}
          </span>
          <el-button data-testid="bdetect-stop" @click="stop">
            {{ t('main.bdetect.stop') }}
          </el-button>
        </div>
      </div>

      <template v-else>
        <div
          v-if="state.phase === 'ready'"
          class="ml-bdetect-panel__empty"
          data-testid="bdetect-ready"
        >
          {{ t('main.bdetect.ready') }}
        </div>
        <div
          v-else-if="state.groups.length === 0"
          class="ml-bdetect-panel__empty"
        >
          {{ t('main.bdetect.none') }}
        </div>
        <template v-else>
          <div class="ml-bdetect-panel__summary">
            <el-checkbox
              :model-value="allChecked"
              :indeterminate="someChecked && !allChecked"
              @change="(v: unknown) => setAllChecked(!!v)"
            >
              {{ t('main.bdetect.selectAll') }}
            </el-checkbox>
            <span class="ml-bdetect-panel__muted" data-testid="bdetect-count">
              {{ t('main.bdetect.groups', { count: state.groups.length }) }}
            </span>
          </div>
          <el-scrollbar class="ml-bdetect-panel__list">
            <div
              v-for="group in state.groups"
              :key="group.key"
              class="ml-bdetect-panel__row"
              :class="{ 'is-selected': group.key === state.selected }"
              data-testid="bdetect-group"
              @click="select(group.key)"
            >
              <el-checkbox
                :model-value="group.checked"
                @click.stop
                @change="(v: unknown) => setChecked(group.key, !!v)"
              />
              <div class="ml-bdetect-panel__thumb">
                <img v-if="group.thumbnail" :src="group.thumbnail" alt="" />
              </div>
              <div class="ml-bdetect-panel__info">
                <el-input
                  :model-value="group.name"
                  :title="t('main.bdetect.blockName')"
                  :class="{ 'is-error': !!state.errors[group.key] }"
                  data-testid="bdetect-name"
                  @click.stop
                  @update:model-value="(v: string) => rename(group.key, v)"
                />
                <div
                  v-if="state.errors[group.key]"
                  class="ml-bdetect-panel__error"
                >
                  {{ state.errors[group.key] }}
                </div>
                <div class="ml-bdetect-panel__count">
                  {{
                    t('main.bdetect.instances', {
                      count: group.instanceCount,
                      objects: group.entityCount
                    })
                  }}
                </div>
                <div
                  class="ml-bdetect-panel__meta ml-bdetect-panel__muted"
                  :title="group.layers.join(', ')"
                >
                  {{
                    t('main.bdetect.layers', {
                      layers: group.layers.join(', ')
                    })
                  }}
                </div>
                <el-tag
                  v-if="group.hasVariableText"
                  size="small"
                  type="primary"
                  effect="plain"
                  :title="t('main.bdetect.attributesHint')"
                >
                  {{ t('main.bdetect.attributes') }}
                </el-tag>
              </div>
              <el-button
                text
                :icon="View"
                :title="t('main.bdetect.review')"
                data-testid="bdetect-review"
                @click.stop="review(group.key)"
              />
            </div>
          </el-scrollbar>
        </template>
        <div class="ml-bdetect-panel__footer">
          <el-button type="primary" data-testid="bdetect-run" @click="detect">
            {{
              state.phase === 'ready'
                ? t('main.bdetect.detect')
                : t('main.bdetect.detectAgain')
            }}
          </el-button>
          <el-button
            v-if="state.phase === 'list'"
            type="primary"
            plain
            :disabled="checkedCount === 0"
            data-testid="bdetect-convert"
            @click="convert"
          >
            {{ t('main.bdetect.convertSelected', { count: checkedCount }) }}
          </el-button>
          <el-button data-testid="bdetect-close" @click="close">
            {{ t('main.bdetect.close') }}
          </el-button>
        </div>
      </template>
    </el-config-provider>
  </div>
</template>

<script setup lang="ts">
/**
 * Detect and Convert tab of the tool palette, shown while `BDETECT` runs:
 * detection options, then progress, then the groups of repeated objects.
 * Click Detect to search; click a group to highlight its instances, review
 * one group with Search and Convert, or convert the checked groups at once.
 */
import { View } from '@element-plus/icons-vue'
import {
  ElButton,
  ElCheckbox,
  ElCollapse,
  ElCollapseItem,
  ElConfigProvider,
  ElInput,
  ElInputNumber,
  ElProgress,
  ElScrollbar,
  ElTag
} from 'element-plus'
import { computed, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'

import { useBDetect } from '../../composable'
import MlBDetectOptionHelp from './MlBDetectOptionHelp.vue'

const { t } = useI18n()
const {
  state,
  detect,
  select,
  review,
  convert,
  close,
  stop,
  setOptions,
  setChecked,
  setAllChecked,
  rename
} = useBDetect()

const openSections = ref(['options'])
const minInstancesId = useId()
const minSavingsId = useId()
const maxEntitiesId = useId()
const optionsEditable = computed(
  () => state.phase === 'ready' || state.phase === 'list'
)
const checkedCount = computed(() => state.groups.filter(g => g.checked).length)
const allChecked = computed(
  () => state.groups.length > 0 && checkedCount.value === state.groups.length
)
const someChecked = computed(() => checkedCount.value > 0)
</script>

<style scoped>
/* Same scale as the Find palette: 13px text, 11px secondary lines. */
.ml-bdetect-panel {
  font-size: 13px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 6px 8px;
  box-sizing: border-box;
}

/* The list stays visible while one group is reviewed, but inactive. */
.ml-bdetect-panel.is-busy {
  opacity: 0.6;
  pointer-events: none;
}

.ml-bdetect-panel :deep(.el-config-provider) {
  display: contents;
}

.ml-bdetect-panel__options {
  flex: 0 0 auto;
  --el-collapse-header-bg-color: transparent;
  --el-collapse-content-bg-color: transparent;
}

.ml-bdetect-panel__options :deep(.el-collapse-item__header) {
  height: 28px;
  padding: 0 4px;
  font-size: 13px;
}

.ml-bdetect-panel__options :deep(.el-collapse-item__content) {
  padding: 0 4px 6px;
}

.ml-bdetect-panel__filters {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 2px 8px;
}

.ml-bdetect-panel__option {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.ml-bdetect-panel__filters .el-checkbox {
  height: auto;
  margin-right: 0;
  white-space: normal;
}

.ml-bdetect-panel__filters :deep(.el-checkbox__label) {
  line-height: 1.3;
  white-space: normal;
}

.ml-bdetect-panel__thresholds {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.ml-bdetect-panel__field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.ml-bdetect-panel__field-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.ml-bdetect-panel__field-label label {
  cursor: pointer;
}

.ml-bdetect-panel__field .el-input-number {
  width: 100%;
}

.ml-bdetect-panel__filters.is-disabled,
.ml-bdetect-panel__thresholds.is-disabled {
  opacity: 0.6;
}

.ml-bdetect-panel__summary,
.ml-bdetect-panel__progress-row,
.ml-bdetect-panel__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ml-bdetect-panel__footer {
  justify-content: flex-end;
  flex-wrap: wrap;
  padding-top: 4px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.ml-bdetect-panel__progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 0;
}

.ml-bdetect-panel__muted {
  color: var(--el-text-color-secondary);
  font-size: 11px;
}

.ml-bdetect-panel__empty {
  padding: 12px 0;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.ml-bdetect-panel__list {
  flex: 1 1 auto;
  min-height: 0;
}

.ml-bdetect-panel__row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 4px;
  border-radius: 4px;
  cursor: pointer;
}

.ml-bdetect-panel__row:hover {
  background: var(--el-fill-color-light);
}

.ml-bdetect-panel__row.is-selected {
  background: var(--el-color-primary-light-9);
}

.ml-bdetect-panel__thumb {
  flex: 0 0 56px;
  height: 56px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  background: var(--el-fill-color-lighter);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.ml-bdetect-panel__thumb img {
  max-width: 100%;
  max-height: 100%;
}

.ml-bdetect-panel__info {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.ml-bdetect-panel__count {
  max-width: 100%;
  overflow-wrap: anywhere;
}

.ml-bdetect-panel__meta {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ml-bdetect-panel__info .el-input.is-error :deep(.el-input__wrapper) {
  box-shadow: 0 0 0 1px var(--el-color-danger) inset;
}

.ml-bdetect-panel__error {
  color: var(--el-color-danger);
  font-size: 11px;
}
</style>
