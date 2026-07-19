<script setup lang="ts">
import { ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import {
  AcApBlockInsertSession,
  AcApDocManager
} from '@mlightcad/cad-simple-viewer'
import {
  ElButton,
  ElDropdown,
  ElIcon,
  useGlobalConfig
} from 'element-plus'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  isInsertableBlockName,
  rememberRecentBlock,
  useInsertableBlocks
} from '../../composable/useInsertableBlocks'
import { insertBlock } from '../../svg'

defineOptions({
  name: 'MlBlockInsertGallery'
})

const props = withDefaults(
  defineProps<{
    label?: string
    tooltip?: string
    disabled?: boolean
  }>(),
  {
    label: '',
    tooltip: '',
    disabled: false
  }
)

const OPTIONS_KEY = 'ml-cad-block-insert-options'

const { t } = useI18n()
const isOpen = ref(false)
const globalSize = useGlobalConfig('size', '')
const resolvedSize = computed(() => globalSize.value || 'default')
const { blocks, cancelRefresh, refreshBlocks } = useInsertableBlocks()

/**
 * Icon click (Circle-style): open Blocks palette via `INSERT`.
 * Uses stopPropagation so the dropdown does not open.
 */
function onIconClick() {
  if (props.disabled) return
  isOpen.value = false
  cancelRefresh()
  AcApDocManager.instance.sendStringToExecute('insert')
}

/**
 * Handles dropdown visibility; refreshes block list when opening.
 */
function onVisibleChange(visible: boolean) {
  if (props.disabled) {
    isOpen.value = false
    return
  }
  isOpen.value = visible
  if (visible) {
    void refreshBlocks(null, () => isOpen.value)
  } else {
    cancelRefresh()
  }
}

function readPaletteOptions(): {
  specifyScale: boolean
  scaleX: number
  scaleY: number
  scaleZ: number
  specifyRotation: boolean
  rotationDeg: number
  repeatPlacement: boolean
} {
  try {
    const raw = localStorage.getItem(OPTIONS_KEY)
    if (!raw) {
      return {
        specifyScale: false,
        scaleX: 1,
        scaleY: 1,
        scaleZ: 1,
        specifyRotation: false,
        rotationDeg: 0,
        repeatPlacement: false
      }
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      specifyScale: !!parsed.specifyScale,
      scaleX:
        typeof parsed.scaleX === 'number' && parsed.scaleX > 0
          ? parsed.scaleX
          : 1,
      scaleY:
        typeof parsed.scaleY === 'number' && parsed.scaleY > 0
          ? parsed.scaleY
          : 1,
      scaleZ:
        typeof parsed.scaleZ === 'number' && parsed.scaleZ > 0
          ? parsed.scaleZ
          : 1,
      specifyRotation: !!parsed.specifyRotation,
      rotationDeg:
        typeof parsed.rotationDeg === 'number' ? parsed.rotationDeg : 0,
      repeatPlacement: !!parsed.repeatPlacement
    }
  } catch {
    return {
      specifyScale: false,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      specifyRotation: false,
      rotationDeg: 0,
      repeatPlacement: false
    }
  }
}

/**
 * Starts `-INSERT` with the selected block name as a scripted argument.
 */
function selectBlock(blockName: string) {
  if (!isInsertableBlockName(blockName)) return
  isOpen.value = false
  cancelRefresh()
  rememberRecentBlock(blockName)
  AcApBlockInsertSession.set(readPaletteOptions())
  AcApDocManager.instance.sendStringToExecute(`-insert\n${blockName}`)
}

function onDocumentActivated() {
  cancelRefresh()
  isOpen.value = false
  blocks.value = []
}

onMounted(() => {
  AcApDocManager.instance.events.documentActivated.addEventListener(
    onDocumentActivated
  )
})

onUnmounted(() => {
  cancelRefresh()
  AcApDocManager.instance.events.documentActivated.removeEventListener(
    onDocumentActivated
  )
})

const displayLabel = computed(
  () => props.label || t('main.ribbon.command.insert')
)
const resolvedTooltip = computed(
  () => props.tooltip || displayLabel.value
)
const emptyText = computed(() => t('main.ribbon.insertBlock.empty'))
const currentDrawingLabel = computed(() =>
  t('main.ribbon.insertBlock.currentDrawing')
)
const dropdownPopperClass = computed(() =>
  [
    'ml-block-insert-gallery-popper',
    'ml-ribbon-popper',
    `ml-ribbon-popper--size-${resolvedSize.value}`
  ].join(' ')
)
</script>

<template>
  <!--
    Match Home-tab Circle dropdown layout:
    - Icon on top (click → INSERT / Blocks palette)
    - Label + arrow on one row (click → block preview gallery)
  -->
  <ElDropdown
    v-model:visible="isOpen"
    class="ml-ribbon-dropdown ml-ribbon-dropdown--item-large ml-block-insert-gallery"
    trigger="click"
    :disabled="props.disabled"
    :teleported="true"
    :popper-class="dropdownPopperClass"
    @visible-change="onVisibleChange"
  >
    <ElButton
      type="default"
      :disabled="props.disabled"
      :aria-label="displayLabel"
      :title="resolvedTooltip"
    >
      <span class="ml-ribbon-item-host__content ml-ribbon-dropdown__content">
        <span
          class="ml-ribbon-item-host__icon ml-ribbon-item-host__icon--dropdown-primary ml-ribbon-dropdown__icon ml-block-insert-gallery__icon"
          aria-hidden="true"
          @click.stop="onIconClick"
        >
          <!-- Render without ElIcon: its `fill: currentColor` would flatten the multi-color SVG. -->
          <component
            :is="insertBlock"
            class="ml-block-insert-gallery__icon-svg"
          />
        </span>
        <span class="ml-ribbon-item-host__text-row ml-ribbon-dropdown__text-row">
          <span class="ml-ribbon-item-host__label ml-ribbon-dropdown__label">
            {{ displayLabel }}
          </span>
          <ElIcon
            class="ml-ribbon-item-host__dropdown-arrow ml-ribbon-dropdown__arrow"
            :class="{ 'is-open': isOpen }"
          >
            <component :is="isOpen ? ArrowUp : ArrowDown" />
          </ElIcon>
        </span>
      </span>
    </ElButton>

    <template #dropdown>
      <div class="ml-block-insert-gallery__panel" @click.stop @mousedown.stop>
        <div class="ml-block-insert-gallery__header">
          {{ currentDrawingLabel }}
        </div>
        <div v-if="blocks.length === 0" class="ml-block-insert-gallery__empty">
          {{ emptyText }}
        </div>
        <div v-else class="ml-block-insert-gallery__grid">
          <button
            v-for="block in blocks"
            :key="block.name"
            type="button"
            class="ml-block-insert-gallery__item"
            :title="block.name"
            @click="selectBlock(block.name)"
          >
            <div class="ml-block-insert-gallery__preview">
              <img
                v-if="block.previewUrl"
                class="ml-block-insert-gallery__preview-img"
                :src="block.previewUrl"
                alt=""
              />
              <span
                v-else
                class="ml-block-insert-gallery__placeholder"
                aria-hidden="true"
              >
                <component :is="insertBlock" />
              </span>
            </div>
            <div class="ml-block-insert-gallery__name">{{ block.name }}</div>
          </button>
        </div>
      </div>
    </template>
  </ElDropdown>
</template>

<style scoped>
.ml-block-insert-gallery :deep(.el-button) {
  height: auto;
  padding: 4px 6px;
  border-color: transparent;
  background: transparent;
}

.ml-block-insert-gallery :deep(.el-button > span) {
  display: inline-flex;
}

.ml-block-insert-gallery .ml-ribbon-dropdown__content {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.ml-block-insert-gallery .ml-ribbon-dropdown__icon {
  display: inline-flex;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}

.ml-block-insert-gallery__icon-svg {
  display: block;
  width: 1em;
  height: 1em;
  fill: none;
}

.ml-block-insert-gallery .ml-ribbon-dropdown__text-row {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border-radius: 4px;
  padding: 1px 4px;
}

.ml-block-insert-gallery .ml-ribbon-dropdown__label {
  max-width: 64px;
  font-size: 11px;
  line-height: 1.15;
  text-align: center;
  white-space: pre-line;
  word-break: break-word;
}

.ml-block-insert-gallery .ml-ribbon-dropdown__arrow {
  font-size: 10px;
}
</style>

<!-- Panel is teleported; unscoped styles for popper content -->
<style>
.ml-block-insert-gallery-popper.el-dropdown__popper,
.ml-block-insert-gallery-popper {
  padding: 0 !important;
  min-width: 240px;
}

.ml-block-insert-gallery__panel {
  max-height: 300px;
  padding: 0 0 8px;
  overflow: auto;
}

.ml-block-insert-gallery__header {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 8px 10px 6px;
  border-bottom: 1px solid
    var(--el-border-color-lighter, rgba(255, 255, 255, 0.1));
  background: var(--el-bg-color-overlay, var(--el-bg-color, #1d1e1f));
  color: var(--el-text-color-regular, #cfd3dc);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.ml-block-insert-gallery__empty {
  padding: 16px 8px;
  color: var(--el-text-color-secondary, #a3a6ad);
  font-size: 12px;
  text-align: center;
}

.ml-block-insert-gallery__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  padding: 8px 8px 0;
}

.ml-block-insert-gallery__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 4px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.ml-block-insert-gallery__item:hover {
  background: var(--el-fill-color-light, rgba(255, 255, 255, 0.08));
  border-color: var(--el-border-color-lighter, rgba(255, 255, 255, 0.12));
}

.ml-block-insert-gallery__preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 2px;
  background: var(--el-fill-color-darker, #2b2d31);
  overflow: hidden;
}

.ml-block-insert-gallery__preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
}

.ml-block-insert-gallery__placeholder {
  display: inline-flex;
  width: 28px;
  height: 28px;
  color: var(--el-text-color-secondary, #a3a6ad);
  opacity: 0.7;
}

.ml-block-insert-gallery__placeholder svg {
  width: 100%;
  height: 100%;
  fill: none;
}

.ml-block-insert-gallery__name {
  max-width: 64px;
  overflow: hidden;
  font-size: 11px;
  line-height: 1.2;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
