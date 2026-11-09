<template>
  <div
    v-if="state.active"
    class="ml-bsearch-bar"
    data-testid="bsearch-review-bar"
  >
    <el-config-provider size="small">
      <div class="ml-bsearch-bar__row">
        <span class="ml-bsearch-bar__title">
          {{ t('main.bsearch.title') }}
        </span>
        <span class="ml-bsearch-bar__count" data-testid="bsearch-count">
          {{
            t('main.bsearch.found', {
              count: state.total,
              included: state.included
            })
          }}
        </span>
        <el-button-group>
          <el-button
            :disabled="state.total === 0"
            :title="t('main.bsearch.previous')"
            :icon="ArrowLeft"
            @click="prev"
          />
          <el-button disabled class="ml-bsearch-bar__index">
            {{
              t('main.bsearch.position', {
                index: state.current >= 0 ? state.current + 1 : '-',
                count: state.total
              })
            }}
          </el-button>
          <el-button
            :disabled="state.total === 0"
            :title="t('main.bsearch.next')"
            :icon="ArrowRight"
            data-testid="bsearch-next"
            @click="next"
          />
        </el-button-group>
        <el-checkbox
          :model-value="state.currentIncluded"
          :disabled="state.current < 0"
          data-testid="bsearch-include-current"
          @change="toggleCurrent"
        >
          {{ t('main.bsearch.includeCurrent') }}
        </el-checkbox>
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
      <div class="ml-bsearch-bar__row ml-bsearch-bar__filters">
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
          @change="(v: unknown) => setOptions({ includeExistingBlocks: !!v })"
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
    </el-config-provider>
  </div>
</template>

<script setup lang="ts">
/**
 * Review toolbar of `BSEARCH` (Smart Blocks: Search and Convert), shown over
 * the canvas while the command reviews found instances.
 */
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import {
  ElButton,
  ElButtonGroup,
  ElCheckbox,
  ElConfigProvider
} from 'element-plus'
import { useI18n } from 'vue-i18n'

import { useBSearch } from '../../composable'

const { t } = useI18n()
const { state, next, prev, toggleCurrent, setOptions, convert, cancel } =
  useBSearch()
</script>

<style scoped>
.ml-bsearch-bar {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  background: var(--el-bg-color-overlay);
  box-shadow: var(--el-box-shadow-light);
  max-width: calc(100% - 16px);
}

.ml-bsearch-bar__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.ml-bsearch-bar__title {
  font-weight: 600;
}

.ml-bsearch-bar__count {
  color: var(--el-text-color-regular);
}

.ml-bsearch-bar__index {
  min-width: 52px;
}

.ml-bsearch-bar__filters .el-checkbox {
  margin-right: 0;
}
</style>
