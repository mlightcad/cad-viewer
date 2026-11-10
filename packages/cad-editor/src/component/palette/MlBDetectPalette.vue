<template>
  <div
    class="ml-bdetect-panel"
    :class="{ 'is-busy': state.phase === 'reviewing' }"
    data-testid="bdetect-panel"
  >
    <el-config-provider size="small">
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
        <div v-if="state.groups.length === 0" class="ml-bdetect-panel__empty">
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
          <el-button
            type="primary"
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
 * detection progress, then the groups of repeated objects found in the
 * drawing. Click a group to highlight its instances, review one group with
 * the Search and Convert toolbar, or convert the checked groups at once.
 */
import { View } from '@element-plus/icons-vue'
import {
  ElButton,
  ElCheckbox,
  ElConfigProvider,
  ElInput,
  ElProgress,
  ElScrollbar,
  ElTag
} from 'element-plus'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useBDetect } from '../../composable'

const { t } = useI18n()
const {
  state,
  select,
  review,
  convert,
  close,
  stop,
  setChecked,
  setAllChecked,
  rename
} = useBDetect()

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
