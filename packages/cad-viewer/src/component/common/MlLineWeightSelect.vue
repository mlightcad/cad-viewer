<template>
  <el-dropdown trigger="click" @command="onSelect">
    <el-button class="ml-lineweight-btn">
      <el-space>
        <span class="ml-lineweight-label">{{ currentLabel }}</span>

        <!-- line weight preview in button -->
        <span
          v-if="currentPreviewWidth !== null"
          class="ml-lineweight-preview ml-lineweight-preview--btn"
          :style="{ height: currentPreviewWidth + 'px' }"
        />

        <el-icon class="ml-lineweight-caret">
          <ArrowDown />
        </el-icon>
      </el-space>
    </el-button>

    <template #dropdown>
      <el-dropdown-menu class="ml-lineweight-menu">
        <el-dropdown-item
          v-for="item in lineWeightItems"
          :key="item.value"
          :command="item.value"
          class="ml-lineweight-item"
        >
          <el-space>
            <span class="ml-lineweight-text">{{ item.label }}</span>
            <span
              v-if="item.previewWidth !== null"
              class="ml-lineweight-preview"
              :style="{ height: item.previewWidth + 'px' }"
            />
          </el-space>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
import { AcGiLineWeight } from '@mlightcad/data-model'
import { computed } from 'vue'

interface LineWeightItem {
  value: AcGiLineWeight
  label: string
  previewWidth: number | null
}

const props = defineProps<{
  modelValue: AcGiLineWeight
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: AcGiLineWeight): void
  (e: 'change', value: AcGiLineWeight): void
}>()

/**
 * Convert enum value to display text
 */
function formatLabel(value: AcGiLineWeight): string {
  switch (value) {
    case AcGiLineWeight.ByLayer:
      return 'ByLayer'
    case AcGiLineWeight.ByBlock:
      return 'ByBlock'
    case AcGiLineWeight.ByDIPs:
      return 'ByDIPs'
    case AcGiLineWeight.ByLineWeightDefault:
      return 'Default'
    default:
      return `${(value / 100).toFixed(2)} mm`
  }
}

/**
 * Line width preview (clamped for UI)
 */
function previewPx(value: AcGiLineWeight): number | null {
  if (value < 0) return null
  return Math.max(1, Math.min(6, value / 40))
}

const lineWeightItems = computed<LineWeightItem[]>(() =>
  Object.values(AcGiLineWeight)
    .filter(v => typeof v === 'number')
    .map(v => ({
      value: v as AcGiLineWeight,
      label: formatLabel(v as AcGiLineWeight),
      previewWidth: previewPx(v as AcGiLineWeight)
    }))
)

const currentLabel = computed(() => formatLabel(props.modelValue))
const currentPreviewWidth = computed(() => previewPx(props.modelValue))

function onSelect(value: AcGiLineWeight) {
  emit('update:modelValue', value)
  emit('change', value)
}
</script>

<style scoped>
.ml-lineweight-btn {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ml-lineweight-caret {
  font-size: 12px;
}

.ml-lineweight-menu {
  padding: 4px 0;
  max-height: 260px;
  overflow-y: auto;
}

.ml-lineweight-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px; /* blank space between text and preview */
  min-width: 160px;
}

.ml-lineweight-text,
.ml-lineweight-label {
  font-size: 13px;
}

.ml-lineweight-preview {
  width: 40px;
  background-color: currentColor;
  border-radius: 2px;
}

/* smaller preview inside the button */
.ml-lineweight-preview--btn {
  width: 32px;
}
</style>
