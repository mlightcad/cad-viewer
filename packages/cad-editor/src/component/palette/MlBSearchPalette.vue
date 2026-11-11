<template>
  <div class="ml-bsearch-panel" data-testid="bsearch-panel">
    <el-config-provider size="small">
      <div class="ml-bsearch-panel__source">
        <div class="ml-bsearch-panel__thumb">
          <img v-if="state.thumbnail" :src="state.thumbnail" alt="" />
        </div>
        <div class="ml-bsearch-panel__source-info">
          <span class="ml-bsearch-panel__muted">
            {{ t('main.bsearch.source', { count: state.sourceCount }) }}
          </span>
          <span data-testid="bsearch-count">
            {{
              t('main.bsearch.found', {
                count: state.total,
                included: state.included
              })
            }}
          </span>
        </div>
      </div>

      <el-collapse v-model="openSections" class="ml-bsearch-panel__options">
        <el-collapse-item :title="t('main.bsearch.options')" name="options">
          <div class="ml-bsearch-panel__filters">
            <el-checkbox
              :model-value="state.options.allowRotation ?? true"
              @change="(v: unknown) => setOptions({ allowRotation: !!v })"
            >
              {{ t('main.bsearch.rotation') }}
            </el-checkbox>
            <el-checkbox
              :model-value="state.options.allowMirror ?? true"
              @change="(v: unknown) => setOptions({ allowMirror: !!v })"
            >
              {{ t('main.bsearch.mirror') }}
            </el-checkbox>
            <el-checkbox
              :model-value="!!state.options.allowScale"
              @change="(v: unknown) => setOptions({ allowScale: !!v })"
            >
              {{ t('main.bsearch.scale') }}
            </el-checkbox>
            <el-checkbox
              :model-value="state.options.matchLayer ?? true"
              @change="(v: unknown) => setOptions({ matchLayer: !!v })"
            >
              {{ t('main.bsearch.sameLayer') }}
            </el-checkbox>
            <el-checkbox
              :model-value="!!state.options.includeExistingBlocks"
              @change="
                (v: unknown) => setOptions({ includeExistingBlocks: !!v })
              "
            >
              {{ t('main.bsearch.existingBlocks') }}
            </el-checkbox>
            <el-checkbox
              v-if="state.hasText"
              :model-value="!!state.options.textVariations"
              @change="(v: unknown) => setOptions({ textVariations: !!v })"
            >
              {{ t('main.bsearch.textVariations') }}
            </el-checkbox>
          </div>
        </el-collapse-item>
      </el-collapse>

      <div v-if="state.total === 0" class="ml-bsearch-panel__empty">
        {{ t('main.bsearch.none') }}
      </div>
      <template v-else>
        <div class="ml-bsearch-panel__summary">
          <el-checkbox
            :model-value="state.included === state.total"
            :indeterminate="state.included > 0 && state.included < state.total"
            data-testid="bsearch-include-all"
            @change="(v: unknown) => setAllIncluded(!!v)"
          >
            {{ t('main.bsearch.includeAll') }}
          </el-checkbox>
          <el-button-group>
            <el-button
              :title="t('main.bsearch.previous')"
              :icon="ArrowLeft"
              data-testid="bsearch-prev"
              @click="prev"
            />
            <el-button
              :title="t('main.bsearch.next')"
              :icon="ArrowRight"
              data-testid="bsearch-next"
              @click="next"
            />
          </el-button-group>
        </div>
        <el-scrollbar ref="listRef" class="ml-bsearch-panel__list">
          <div
            v-for="row in state.matches"
            :key="row.index"
            class="ml-bsearch-panel__row"
            :class="{
              'is-current': row.index === state.current,
              'is-excluded': !row.included
            }"
            :data-index="row.index"
            data-testid="bsearch-match"
            @click="select(row.index)"
          >
            <el-checkbox
              :model-value="row.included"
              :title="t('main.bsearch.include')"
              data-testid="bsearch-include"
              @click.stop
              @change="(v: unknown) => setIncluded(row.index, !!v)"
            />
            <div class="ml-bsearch-panel__info">
              <div class="ml-bsearch-panel__name">
                {{ t('main.bsearch.instance', { index: row.index + 1 }) }}
                <span class="ml-bsearch-panel__muted">
                  {{ describe(row) }}
                </span>
              </div>
              <div
                v-if="row.texts.length > 0"
                class="ml-bsearch-panel__texts ml-bsearch-panel__muted"
                :title="row.texts.join('\n')"
              >
                {{ row.texts.join(' · ') }}
              </div>
            </div>
          </div>
        </el-scrollbar>
      </template>

      <div class="ml-bsearch-panel__hint ml-bsearch-panel__muted">
        {{ t('main.bsearch.hint') }}
      </div>
      <div class="ml-bsearch-panel__footer">
        <el-button
          type="primary"
          data-testid="bsearch-convert"
          @click="convert"
        >
          {{ t('main.bsearch.convert') }}
        </el-button>
        <el-button data-testid="bsearch-cancel" @click="cancel">
          {{ t('main.bsearch.cancel') }}
        </el-button>
      </div>
    </el-config-provider>
  </div>
</template>

<script setup lang="ts">
/**
 * Search and Convert tab of the tool palette, shown while `BSEARCH` reviews
 * the instances it found: the selected source, the search filters and the
 * list of instances. Click a row to zoom to that instance, check or uncheck
 * it to include or exclude it, then convert.
 *
 * The rows carry no thumbnails: every instance is the same geometry, so the
 * one preview of the source is enough and each row shows only what differs
 * (rotation, mirroring, scale and texts).
 */
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import {
  ElButton,
  ElButtonGroup,
  ElCheckbox,
  ElCollapse,
  ElCollapseItem,
  ElConfigProvider,
  ElScrollbar
} from 'element-plus'
import { nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { type MlBSearchMatchRow, useBSearch } from '../../composable'

const { t } = useI18n()
const {
  state,
  next,
  prev,
  select,
  setIncluded,
  setAllIncluded,
  setOptions,
  convert,
  cancel
} = useBSearch()

const openSections = ref<string[]>([])
const listRef = ref<InstanceType<typeof ElScrollbar>>()

/** How the instance sits relative to the selected source. */
function describe(row: Readonly<Omit<MlBSearchMatchRow, 'texts'>>): string {
  const parts: string[] = []
  if (row.blockReference) parts.push(t('main.bsearch.blockReference'))
  if (row.rotation !== 0) {
    parts.push(t('main.bsearch.rotatedBy', { angle: row.rotation }))
  }
  if (row.mirrored) parts.push(t('main.bsearch.mirrored'))
  if (row.scale !== 1) {
    parts.push(t('main.bsearch.scaledBy', { scale: row.scale }))
  }
  return parts.join(' · ')
}

// Keep the current instance visible when it changes from the drawing or
// the previous / next buttons.
watch(
  () => state.current,
  async current => {
    if (current < 0) return
    await nextTick()
    const wrap = listRef.value?.wrapRef
    const row = wrap?.querySelector<HTMLElement>(`[data-index="${current}"]`)
    row?.scrollIntoView({ block: 'nearest' })
  }
)
</script>

<style scoped>
/* Same scale as the Detect and Convert palette: 13px text, 11px secondary. */
.ml-bsearch-panel {
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

.ml-bsearch-panel :deep(.el-config-provider) {
  display: contents;
}

.ml-bsearch-panel__source {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ml-bsearch-panel__thumb {
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

.ml-bsearch-panel__thumb img {
  max-width: 100%;
  max-height: 100%;
}

.ml-bsearch-panel__source-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.ml-bsearch-panel__options {
  flex: 0 0 auto;
  /* Blend into the palette instead of drawing its own panel. */
  --el-collapse-header-bg-color: transparent;
  --el-collapse-content-bg-color: transparent;
}

.ml-bsearch-panel__options :deep(.el-collapse-item__header) {
  height: 28px;
  padding: 0 4px;
  font-size: 13px;
}

.ml-bsearch-panel__options :deep(.el-collapse-item__content) {
  padding: 0 4px 6px;
}

.ml-bsearch-panel__filters {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 2px 8px;
}

.ml-bsearch-panel__filters .el-checkbox {
  margin-right: 0;
}

.ml-bsearch-panel__summary,
.ml-bsearch-panel__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ml-bsearch-panel__footer {
  justify-content: flex-end;
  padding-top: 4px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.ml-bsearch-panel__muted {
  color: var(--el-text-color-secondary);
  font-size: 11px;
}

.ml-bsearch-panel__empty {
  flex: 1 1 auto;
  padding: 12px 0;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.ml-bsearch-panel__list {
  flex: 1 1 auto;
  min-height: 0;
}

.ml-bsearch-panel__row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 4px;
  border-radius: 4px;
  cursor: pointer;
}

.ml-bsearch-panel__row:hover {
  background: var(--el-fill-color-light);
}

.ml-bsearch-panel__row.is-current {
  background: var(--el-color-primary-light-9);
}

.ml-bsearch-panel__row.is-excluded .ml-bsearch-panel__name {
  color: var(--el-text-color-secondary);
}

.ml-bsearch-panel__info {
  flex: 1 1 auto;
  min-width: 0;
}

.ml-bsearch-panel__name,
.ml-bsearch-panel__texts {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ml-bsearch-panel__hint {
  overflow-wrap: anywhere;
}
</style>
