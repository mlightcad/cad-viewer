<template>
  <div class="ml-layer-select">
    <el-select
      :model-value="resolvedModelValue"
      :disabled="props.disabled || !props.options.length"
      :placeholder="props.placeholder ?? t('main.ribbonProperty.layer')"
      class="ml-layer-select__control"
      popper-class="ml-layer-select-popper"
      style="width: 100%"
      @change="onSelect"
      @visible-change="onVisibleChange"
    >
      <template #label>
        <div
          v-if="selectedOption"
          class="ml-layer-select-trigger"
          :title="selectedOptionTooltip"
        >
          <button
            type="button"
            class="ml-layer-select-state-button"
            :title="
              selectedOption.isOn
                ? t('main.layerSelect.tooltip.hidden')
                : t('main.layerSelect.tooltip.visible')
            "
            @mousedown.stop.prevent
            @click.stop="onStateIconClick(selectedOption, 'on')"
          >
            <span
              class="ml-layer-select-state-icon"
              :class="selectedOption.isOn ? 'is-on' : 'is-off'"
              aria-hidden="true"
            >
              <component :is="layerLight" />
            </span>
          </button>
          <button
            type="button"
            class="ml-layer-select-state-button"
            :title="
              selectedOption.isFrozen
                ? t('main.layerSelect.tooltip.thawed')
                : t('main.layerSelect.tooltip.frozen')
            "
            @mousedown.stop.prevent
            @click.stop="onStateIconClick(selectedOption, 'frozen')"
          >
            <span
              class="ml-layer-select-state-icon"
              :class="selectedOption.isFrozen ? 'is-frozen' : 'is-unfrozen'"
              aria-hidden="true"
            >
              <component :is="layerSnow" />
            </span>
          </button>
          <button
            type="button"
            class="ml-layer-select-state-button"
            :title="
              selectedOption.isLocked
                ? t('main.layerSelect.tooltip.unlocked')
                : t('main.layerSelect.tooltip.locked')
            "
            @mousedown.stop.prevent
            @click.stop="onStateIconClick(selectedOption, 'locked')"
          >
            <span
              class="ml-layer-select-state-icon"
              :class="selectedOption.isLocked ? 'is-locked' : 'is-unlocked'"
              aria-hidden="true"
            >
              <component :is="layerLocker" />
            </span>
          </button>
          <span
            class="ml-layer-select-color"
            :style="{ backgroundColor: selectedOption.cssColor || '#8a8a8a' }"
          />
          <span class="ml-layer-select-trigger-text">
            {{ selectedOption.name }}
          </span>
        </div>
      </template>

      <template #header>
        <div class="ml-layer-select-header">
          <el-input
            ref="searchInputRef"
            v-model="searchQuery"
            clearable
            :placeholder="
              props.searchPlaceholder ?? t('main.layerSelect.searchPlaceholder')
            "
            class="ml-layer-select-search"
            @keydown.stop
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </template>

      <el-option
        v-for="item in filteredOptions"
        :key="item.value"
        :label="item.name"
        :value="item.value"
      >
        <div class="ml-layer-select-option" :title="buildLayerTooltip(item)">
          <button
            type="button"
            class="ml-layer-select-state-button"
            :title="
              item.isOn
                ? t('main.layerSelect.tooltip.hidden')
                : t('main.layerSelect.tooltip.visible')
            "
            @mousedown.stop.prevent
            @click.stop="onStateIconClick(item, 'on')"
          >
            <span
              class="ml-layer-select-state-icon"
              :class="item.isOn ? 'is-on' : 'is-off'"
              aria-hidden="true"
            >
              <component :is="layerLight" />
            </span>
          </button>
          <button
            type="button"
            class="ml-layer-select-state-button"
            :title="
              item.isFrozen
                ? t('main.layerSelect.tooltip.thawed')
                : t('main.layerSelect.tooltip.frozen')
            "
            @mousedown.stop.prevent
            @click.stop="onStateIconClick(item, 'frozen')"
          >
            <span
              class="ml-layer-select-state-icon"
              :class="item.isFrozen ? 'is-frozen' : 'is-unfrozen'"
              aria-hidden="true"
            >
              <component :is="layerSnow" />
            </span>
          </button>
          <button
            type="button"
            class="ml-layer-select-state-button"
            :title="
              item.isLocked
                ? t('main.layerSelect.tooltip.unlocked')
                : t('main.layerSelect.tooltip.locked')
            "
            @mousedown.stop.prevent
            @click.stop="onStateIconClick(item, 'locked')"
          >
            <span
              class="ml-layer-select-state-icon"
              :class="item.isLocked ? 'is-locked' : 'is-unlocked'"
              aria-hidden="true"
            >
              <component :is="layerLocker" />
            </span>
          </button>
          <span
            class="ml-layer-select-line-preview"
            :style="resolvePreviewStyle(item)"
          />
          <span
            class="ml-layer-select-color"
            :style="{ backgroundColor: item.cssColor || '#8a8a8a' }"
          />
          <span class="ml-layer-select-text">{{ item.name }}</span>
        </div>
      </el-option>

      <template #empty>
        <div class="ml-layer-select-empty">
          {{ emptyText }}
        </div>
      </template>
    </el-select>
  </div>
</template>

<script setup lang="ts">
import { Search } from '@element-plus/icons-vue'
import { ElInput } from 'element-plus'
import { computed, nextTick, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { layerLight, layerLocker, layerSnow } from '../../svg'

defineOptions({
  inheritAttrs: false
})

/**
 * Render-ready layer entry shown by the select control.
 */
interface LayerSelectOption {
  value: string
  name: string
  cssColor: string
  isOn: boolean
  isLocked: boolean
  isFrozen: boolean
  lineType?: string
}
type LayerStateKey = 'on' | 'frozen' | 'locked'

interface LayerSelectProps {
  modelValue?: string
  options: LayerSelectOption[]
  disabled?: boolean
  placeholder?: string
  searchPlaceholder?: string
}

const props = defineProps<LayerSelectProps>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
  (
    e: 'layer-state-toggle',
    payload: { layerName: string; state: LayerStateKey }
  ): void
}>()

const { t } = useI18n()
const searchQuery = ref('')
const searchInputRef = ref<InstanceType<typeof ElInput>>()

const selectedOption = computed(
  () =>
    props.options.find(item => item.value === props.modelValue) ??
    props.options[0]
)
const resolvedModelValue = computed(() => selectedOption.value?.value)
const selectedOptionTooltip = computed(() => {
  if (!selectedOption.value) return ''
  return buildLayerTooltip(selectedOption.value)
})

const filteredOptions = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return props.options
  return props.options.filter(item => item.name.toLowerCase().includes(q))
})

const emptyText = computed(() => {
  if (!props.options.length) return t('main.layerSelect.noLayerAvailable')
  return t('main.layerSelect.noMatchedLayer')
})

function resolvePreviewStyle(item: LayerSelectOption) {
  const color = item.cssColor || '#8a8a8a'
  const lineType = item.lineType?.toLowerCase() ?? ''

  if (lineType.includes('dot')) {
    return {
      background: `repeating-linear-gradient(to right, ${color} 0 2px, transparent 2px 6px)`
    }
  }

  if (lineType.includes('dash') || lineType.includes('hidden')) {
    return {
      background: `repeating-linear-gradient(to right, ${color} 0 10px, transparent 10px 14px)`
    }
  }

  if (lineType.includes('center') || lineType.includes('phantom')) {
    return {
      background: `repeating-linear-gradient(to right, ${color} 0 12px, transparent 12px 16px, ${color} 16px 19px, transparent 19px 24px)`
    }
  }

  return { backgroundColor: color }
}

function buildLayerTooltip(item: LayerSelectOption) {
  const lineType = item.lineType || t('main.ribbonProperty.lineType')
  const color = item.cssColor || '#8a8a8a'
  const visibility = item.isOn
    ? t('main.layerSelect.tooltip.visible')
    : t('main.layerSelect.tooltip.hidden')
  const frozen = item.isFrozen
    ? t('main.layerSelect.tooltip.frozen')
    : t('main.layerSelect.tooltip.thawed')
  const locked = item.isLocked
    ? t('main.layerSelect.tooltip.locked')
    : t('main.layerSelect.tooltip.unlocked')

  return [
    `${t('main.layerSelect.tooltip.layer')}: ${item.name}`,
    `${t('main.layerSelect.tooltip.visibility')}: ${visibility}`,
    `${t('main.layerSelect.tooltip.freeze')}: ${frozen}`,
    `${t('main.layerSelect.tooltip.lock')}: ${locked}`,
    `${t('main.layerSelect.tooltip.lineType')}: ${lineType}`,
    `${t('main.layerSelect.tooltip.color')}: ${color}`
  ].join('\n')
}

function onVisibleChange(visible: boolean) {
  if (!visible) {
    searchQuery.value = ''
    return
  }

  nextTick(() => {
    searchInputRef.value?.focus()
  })
}

function onSelect(value: string) {
  emit('update:modelValue', value)
  emit('change', value)
}

function onStateIconClick(item: LayerSelectOption, state: LayerStateKey) {
  emit('layer-state-toggle', {
    layerName: item.value,
    state
  })
}
</script>

<style scoped>
.ml-layer-select {
  display: flex;
  width: 100%;
  min-width: 0;
}

.ml-layer-select__control {
  width: 100%;
  min-width: 0;
}

.ml-layer-select :deep(.el-select__wrapper),
.ml-layer-select :deep(.el-select__selection),
.ml-layer-select :deep(.el-select__selected-item),
.ml-layer-select :deep(.el-select__placeholder) {
  width: 100%;
  min-width: 0;
}

.ml-layer-select-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.ml-layer-select-trigger-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ml-layer-select-option {
  display: grid;
  grid-template-columns: 16px 16px 16px 84px 12px 1fr;
  align-items: center;
  column-gap: 8px;
  width: 100%;
  min-width: 0;
}

.ml-layer-select-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ml-layer-select-state-icon {
  display: inline-flex;
  width: 16px;
  height: 16px;
  color: var(--el-text-color-disabled);
}

.ml-layer-select-state-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.ml-layer-select-state-icon.is-on {
  color: var(--el-color-primary);
}

.ml-layer-select-state-icon.is-frozen,
.ml-layer-select-state-icon.is-locked {
  color: var(--el-text-color-regular);
}

.ml-layer-select-state-icon :deep(svg) {
  width: 16px;
  height: 16px;
}

.ml-layer-select-state-icon :deep(path),
.ml-layer-select-state-icon :deep(rect),
.ml-layer-select-state-icon :deep(polygon),
.ml-layer-select-state-icon :deep(ellipse) {
  fill: currentColor;
  stroke: currentColor;
}

.ml-layer-select-line-preview {
  height: 3px;
  border-radius: 2px;
}

.ml-layer-select-color {
  display: inline-flex;
  width: 12px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid var(--el-border-color);
  box-sizing: border-box;
}

.ml-layer-select-empty {
  padding: 8px 12px;
  color: var(--el-text-color-secondary);
}

:global(.ml-layer-select-popper) {
  width: 340px;
}

:global(.ml-layer-select-popper .el-select-dropdown__wrap) {
  max-height: 360px;
}

:global(.ml-layer-select-popper .el-select-dropdown__item) {
  height: 36px;
  line-height: 36px;
}

.ml-layer-select-header {
  padding: 6px 8px 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.ml-layer-select-search :deep(.el-input__wrapper) {
  border-radius: 8px;
}
</style>
