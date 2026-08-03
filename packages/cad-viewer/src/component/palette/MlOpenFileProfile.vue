<template>
  <div class="ml-open-file-profile">
    <div class="ml-open-file-profile-toolbar">
      <div class="ml-open-file-profile-meta">
        <span v-if="collectedAtLabel">
          {{
            t('main.toolPalette.openFileProfile.collectedAt', {
              time: collectedAtLabel
            })
          }}
        </span>
      </div>
      <div class="ml-open-file-profile-actions">
        <el-button size="small" type="primary" @click="refreshFromLast">
          {{ t('main.toolPalette.openFileProfile.refresh') }}
        </el-button>
        <el-tooltip
          :content="t('main.toolPalette.openFileProfile.copy')"
          placement="bottom-end"
          :hide-after="0"
        >
          <el-button
            size="small"
            :disabled="!snapshot"
            :aria-label="t('main.toolPalette.openFileProfile.copy')"
            @click="copyProfile"
          >
            <el-icon><DocumentCopy /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <el-tooltip
      :content="t('main.toolPalette.openFileProfile.hint')"
      placement="bottom"
      :show-after="1500"
      :hide-after="0"
    >
      <div class="ml-open-file-profile-hint" role="note">
        <el-icon class="ml-open-file-profile-hint-icon">
          <InfoFilled />
        </el-icon>
        <span class="ml-open-file-profile-hint-text">
          {{ t('main.toolPalette.openFileProfile.hint') }}
        </span>
      </div>
    </el-tooltip>

    <template v-if="snapshot">
      <div class="ml-open-file-profile-section">
        <button
          type="button"
          class="ml-open-file-profile-section-title"
          @click="timingExpanded = !timingExpanded"
        >
          <el-icon
            class="ml-open-file-profile-caret"
            :class="{ 'is-expanded': timingExpanded }"
          >
            <ArrowRight />
          </el-icon>
          {{ t('main.toolPalette.openFileProfile.timing') }}
        </button>
        <el-table
          v-show="timingExpanded"
          :data="timingRows"
          size="small"
          class="ml-open-file-profile-table"
          table-layout="fixed"
        >
          <el-table-column
            prop="label"
            :label="t('main.toolPalette.openFileProfile.columns.stage')"
            min-width="140"
          />
          <el-table-column
            prop="value"
            :label="t('main.toolPalette.openFileProfile.columns.duration')"
            width="100"
            align="right"
            header-align="right"
          />
          <el-table-column
            prop="pct"
            :label="t('main.toolPalette.openFileProfile.columns.share')"
            width="80"
            align="right"
            header-align="right"
          />
        </el-table>
      </div>

      <div class="ml-open-file-profile-section">
        <button
          type="button"
          class="ml-open-file-profile-section-title"
          @click="cacheExpanded = !cacheExpanded"
        >
          <el-icon
            class="ml-open-file-profile-caret"
            :class="{ 'is-expanded': cacheExpanded }"
          >
            <ArrowRight />
          </el-icon>
          {{ t('main.toolPalette.openFileProfile.cache') }}
        </button>
        <el-table
          v-show="cacheExpanded"
          :data="cacheRows"
          size="small"
          class="ml-open-file-profile-table"
          table-layout="fixed"
        >
          <el-table-column
            prop="label"
            :label="t('main.toolPalette.openFileProfile.columns.metric')"
            min-width="160"
          />
          <el-table-column
            prop="value"
            :label="t('main.toolPalette.openFileProfile.columns.value')"
            width="120"
            align="right"
            header-align="right"
          />
        </el-table>
      </div>

      <div class="ml-open-file-profile-section">
        <button
          type="button"
          class="ml-open-file-profile-section-title"
          @click="slowBlocksExpanded = !slowBlocksExpanded"
        >
          <el-icon
            class="ml-open-file-profile-caret"
            :class="{ 'is-expanded': slowBlocksExpanded }"
          >
            <ArrowRight />
          </el-icon>
          {{ t('main.toolPalette.openFileProfile.slowBlocks') }}
        </button>
        <el-table
          v-show="slowBlocksExpanded"
          :data="slowBlocks"
          size="small"
          class="ml-open-file-profile-table"
          table-layout="fixed"
          :empty-text="t('main.toolPalette.openFileProfile.empty')"
        >
          <el-table-column
            prop="blockName"
            :label="t('main.toolPalette.openFileProfile.columns.block')"
            min-width="140"
            show-overflow-tooltip
          />
          <el-table-column
            :label="t('main.toolPalette.openFileProfile.columns.build')"
            width="88"
            align="right"
            header-align="right"
          >
            <template #default="{ row }">
              {{ formatMs(row.buildMs) }}
            </template>
          </el-table-column>
          <el-table-column
            :label="t('main.toolPalette.openFileProfile.columns.compact')"
            width="88"
            align="right"
            header-align="right"
          >
            <template #default="{ row }">
              {{ formatMs(row.compactMs) }}
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>

    <el-empty
      v-else
      :description="t('main.toolPalette.openFileProfile.noData')"
    />
  </div>
</template>

<script setup lang="ts">
import { ArrowRight, DocumentCopy, InfoFilled } from '@element-plus/icons-vue'
import {
  ElButton,
  ElEmpty,
  ElIcon,
  ElMessage,
  ElTable,
  ElTableColumn,
  ElTooltip
} from 'element-plus'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useOpenFileProfile } from '../../composable/useOpenFileProfile'

const { t } = useI18n()
const {
  snapshot,
  collectedAtLabel,
  timingRows,
  cacheRows,
  slowBlocks,
  adoptPublishedSnapshot,
  refreshFromLast,
  copyText,
  formatMs
} = useOpenFileProfile()

const timingExpanded = ref(true)
const cacheExpanded = ref(true)
const slowBlocksExpanded = ref(true)

async function copyProfile() {
  const text = copyText()
  if (text == null) return

  try {
    await navigator.clipboard.writeText(text)
    ElMessage({
      message: t('main.toolPalette.openFileProfile.copied'),
      grouping: true,
      type: 'success'
    })
  } catch {
    ElMessage({
      message: t('main.toolPalette.openFileProfile.copyFailed'),
      grouping: true,
      type: 'error'
    })
  }
}

onMounted(() => {
  if (!adoptPublishedSnapshot()) {
    refreshFromLast()
  }
})
</script>

<style scoped>
.ml-open-file-profile {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 4px 2px 8px;
}

.ml-open-file-profile-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}

.ml-open-file-profile-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.ml-open-file-profile-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  min-width: 0;
}

.ml-open-file-profile-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 6px 10px;
  border-radius: 4px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-size: 12px;
  line-height: 1.4;
  flex-shrink: 0;
  cursor: default;
}

.ml-open-file-profile-hint-icon {
  flex-shrink: 0;
  color: var(--el-color-info);
  font-size: 14px;
}

.ml-open-file-profile-hint-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.ml-open-file-profile-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex-shrink: 0;
}

.ml-open-file-profile-section-title {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
  width: 100%;
}

.ml-open-file-profile-section-title:hover {
  color: var(--el-color-primary);
}

.ml-open-file-profile-caret {
  transition: transform 0.15s ease;
  font-size: 12px;
}

.ml-open-file-profile-caret.is-expanded {
  transform: rotate(90deg);
}

.ml-open-file-profile-table {
  width: 100%;
  flex: 0 0 auto;
}
</style>
