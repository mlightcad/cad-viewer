<template>
  <div class="ml-design-review">
    <div class="ml-design-review-toolbar">
      <el-input
        v-model="search"
        clearable
        size="small"
        class="ml-design-review-search"
        :placeholder="t('main.toolPalette.designReview.searchPlaceholder')"
      />
      <el-button
        size="small"
        :disabled="markups.length === 0"
        @click="clearAll"
      >
        {{ t('main.toolPalette.designReview.clear') }}
      </el-button>
    </div>

    <el-table
      :data="filtered"
      class="ml-design-review-table"
      size="small"
      highlight-current-row
      table-layout="fixed"
      :current-row-key="selectedId"
      row-key="id"
      :empty-text="t('main.toolPalette.designReview.empty')"
      @row-click="handleRowClick"
    >
      <el-table-column
        prop="type"
        :label="t('main.toolPalette.designReview.type')"
        width="88"
      />
      <el-table-column
        prop="status"
        :label="t('main.toolPalette.designReview.status')"
        width="96"
      />
      <el-table-column
        prop="author"
        :label="t('main.toolPalette.designReview.author')"
        min-width="72"
        :show-overflow-tooltip="{ showAfter: 1000 }"
      />
      <el-table-column
        :label="t('main.toolPalette.designReview.summary')"
        min-width="100"
        :show-overflow-tooltip="{ showAfter: 1000 }"
      >
        <template #default="{ row }">
          {{ row.text || row.comment || '—' }}
        </template>
      </el-table-column>
    </el-table>

    <div v-if="selected" class="ml-design-review-detail">
      <div class="ml-design-review-detail-title">
        {{ t('main.toolPalette.designReview.details') }}
      </div>
      <el-form label-position="top" size="small">
        <el-form-item :label="t('main.toolPalette.designReview.status')">
          <el-select
            :model-value="selected.status"
            @update:model-value="(v: string) => patchStatus(v)"
          >
            <el-option
              v-for="s in statuses"
              :key="s"
              :label="statusLabel(s)"
              :value="s"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('main.toolPalette.designReview.author')">
          <el-input :model-value="selected.author" disabled />
        </el-form-item>
        <el-form-item :label="t('main.toolPalette.designReview.label')">
          <el-input
            :model-value="selected.text ?? ''"
            @change="(v: string) => updateMeta(selected!.id, { text: v })"
          />
        </el-form-item>
        <el-form-item :label="t('main.toolPalette.designReview.comment')">
          <el-input
            type="textarea"
            :rows="3"
            :model-value="selected.comment"
            @change="(v: string) => updateMeta(selected!.id, { comment: v })"
          />
        </el-form-item>
        <div class="ml-design-review-detail-actions">
          <el-button size="small" @click="focus(selected!)">
            {{ t('main.toolPalette.designReview.zoomTo') }}
          </el-button>
          <el-button size="small" type="danger" @click="remove(selected!.id)">
            {{ t('main.toolPalette.designReview.delete') }}
          </el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AcApMarkupStatus } from '@mlightcad/cad-simple-viewer'
import {
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn
} from 'element-plus'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useMarkup } from '../../composable/useMarkup'

const { t } = useI18n()
const search = ref('')
const {
  markups,
  selectedId,
  statuses,
  select,
  focus,
  updateMeta,
  remove,
  clearAll
} = useMarkup()

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return markups.value
  return markups.value.filter(m => {
    const hay = `${m.type} ${m.status} ${m.author} ${m.text ?? ''} ${m.comment}`
    return hay.toLowerCase().includes(q)
  })
})

const selected = computed(
  () => markups.value.find(m => m.id === selectedId.value) ?? null
)

const handleRowClick = (row: { id: string }) => {
  select(row.id)
}

const patchStatus = (value: string) => {
  if (!selected.value) return
  updateMeta(selected.value.id, { status: value as AcApMarkupStatus })
}

const statusLabel = (status: AcApMarkupStatus) => {
  switch (status) {
    case 'open':
      return t('main.toolPalette.designReview.statusValues.open')
    case 'question':
      return t('main.toolPalette.designReview.statusValues.question')
    case 'answered':
      return t('main.toolPalette.designReview.statusValues.answered')
    case 'closed':
      return t('main.toolPalette.designReview.statusValues.closed')
  }
}
</script>

<style scoped>
.ml-design-review {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 8px;
  padding: 8px;
  box-sizing: border-box;
}

.ml-design-review-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
}

.ml-design-review-search {
  flex: 1;
}

.ml-design-review-table {
  flex: 1;
  min-height: 120px;
}

.ml-design-review-detail {
  border-top: 1px solid var(--el-border-color-lighter);
  padding-top: 8px;
  max-height: 46%;
  overflow: auto;
}

.ml-design-review-detail-title {
  font-weight: 600;
  margin-bottom: 6px;
}

.ml-design-review-detail-actions {
  display: flex;
  gap: 8px;
}
</style>
