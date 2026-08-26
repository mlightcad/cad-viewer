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
      @row-dblclick="handleRowDblClick"
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

    <div v-if="selected && detailsOpen" class="ml-design-review-detail">
      <div class="ml-design-review-detail-header">
        <div class="ml-design-review-detail-title">
          {{ t('main.toolPalette.designReview.details') }}
        </div>
        <el-button
          text
          circle
          size="small"
          class="ml-design-review-detail-close"
          :title="t('main.toolPalette.designReview.closeDetails')"
          :aria-label="t('main.toolPalette.designReview.closeDetails')"
          @click="closeDetails"
        >
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
      <el-form label-position="top" size="small" class="ml-design-review-detail-form">
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
            v-model="draftText"
            @blur="commitText"
            @keydown.enter="onLabelEnter"
          />
        </el-form-item>
        <el-form-item :label="t('main.toolPalette.designReview.comment')">
          <el-input
            v-model="draftComment"
            type="textarea"
            :rows="2"
            @blur="commitComment"
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
import { Close } from '@element-plus/icons-vue'
import type {
  AcApMarkupRecord,
  AcApMarkupStatus
} from '@mlightcad/cad-simple-viewer'
import {
  ElButton,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn
} from 'element-plus'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useMarkup } from '../../composable/useMarkup'

const { t } = useI18n()
const search = ref('')
const draftText = ref('')
const draftComment = ref('')
const detailsOpen = ref(true)
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

watch(
  selectedId,
  (id, prevId) => {
    if (prevId && prevId !== id) {
      const prevRow = markups.value.find(m => m.id === prevId)
      if (prevRow) {
        if (draftText.value !== (prevRow.text ?? '')) {
          updateMeta(prevId, { text: draftText.value })
        }
        if (draftComment.value !== (prevRow.comment ?? '')) {
          updateMeta(prevId, { comment: draftComment.value })
        }
      }
    }
    const row = markups.value.find(m => m.id === id)
    draftText.value = row?.text ?? ''
    draftComment.value = row?.comment ?? ''
    if (id) detailsOpen.value = true
  },
  { immediate: true }
)

const handleRowClick = (row: { id: string }) => {
  detailsOpen.value = true
  select(row.id)
}

const handleRowDblClick = (row: AcApMarkupRecord) => {
  detailsOpen.value = true
  focus(row)
}

const closeDetails = () => {
  commitText()
  commitComment()
  detailsOpen.value = false
}

const commitText = () => {
  const id = selectedId.value
  if (!id) return
  const current = markups.value.find(m => m.id === id)
  const next = draftText.value
  const prev = current?.text ?? ''
  if (next === prev) return
  updateMeta(id, { text: next })
}

const commitComment = () => {
  const id = selectedId.value
  if (!id) return
  const current = markups.value.find(m => m.id === id)
  const next = draftComment.value
  const prev = current?.comment ?? ''
  if (next === prev) return
  updateMeta(id, { comment: next })
}

const onLabelEnter = (event: KeyboardEvent) => {
  if (event.isComposing || event.keyCode === 229) return
  event.preventDefault()
  commitText()
  ;(event.target as HTMLInputElement | null)?.blur()
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
  padding-top: 6px;
  max-height: 46%;
  overflow: auto;
}

.ml-design-review-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  margin-bottom: 4px;
}

.ml-design-review-detail-title {
  font-weight: 600;
}

.ml-design-review-detail-close {
  flex-shrink: 0;
  margin-left: auto;
}

.ml-design-review-detail-form {
  --el-form-item-margin-bottom: 4px;
}

.ml-design-review-detail-form :deep(.el-form-item) {
  margin-bottom: 4px;
}

.ml-design-review-detail-form :deep(.el-form-item .el-form-item__label) {
  margin-bottom: 2px;
  line-height: 1.2;
  height: auto;
}

.ml-design-review-detail-form :deep(.el-select),
.ml-design-review-detail-form :deep(.el-input) {
  width: 100%;
}

.ml-design-review-detail-actions {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
}

.ml-design-review-detail-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}
</style>
