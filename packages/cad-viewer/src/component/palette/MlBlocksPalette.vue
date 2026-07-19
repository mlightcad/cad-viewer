<script setup lang="ts">
import {
  ArrowDown,
  ArrowUp,
  Search,
  Star,
  StarFilled
} from '@element-plus/icons-vue'
import {
  AcApBlockInsertSession,
  AcApDocManager
} from '@mlightcad/cad-simple-viewer'
import {
  ElCheckbox,
  ElIcon,
  ElInput,
  ElInputNumber
} from 'element-plus'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  isFavoriteBlock,
  isInsertableBlockName,
  listFavoriteBlockNames,
  listRecentBlockNames,
  rememberRecentBlock,
  toggleFavoriteBlock,
  useInsertableBlocks
} from '../../composable/useInsertableBlocks'
import { insertBlock } from '../../svg'

defineOptions({
  name: 'MlBlocksPalette'
})

type BlocksSourceTab = 'current' | 'recent' | 'favorites' | 'libraries'

const OPTIONS_KEY = 'ml-cad-block-insert-options'

const { t } = useI18n()
const sourceTab = ref<BlocksSourceTab>('current')
const filterText = ref('')
const optionsExpanded = ref(true)
const { blocks, cancelRefresh, refreshBlocks } = useInsertableBlocks()

const options = reactive({
  specifyInsertionPoint: true,
  specifyScale: false,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
  specifyRotation: false,
  rotationDeg: 0,
  autoPlacement: true,
  repeatPlacement: false,
  explode: false
})

const sourceTabs = computed(() => [
  {
    name: 'current' as const,
    label: t('main.toolPalette.blocks.tabCurrentDrawing')
  },
  {
    name: 'recent' as const,
    label: t('main.toolPalette.blocks.tabRecent')
  },
  {
    name: 'favorites' as const,
    label: t('main.toolPalette.blocks.tabFavorites')
  },
  {
    name: 'libraries' as const,
    label: t('main.toolPalette.blocks.tabLibraries')
  }
])

const sectionTitle = computed(() => {
  switch (sourceTab.value) {
    case 'recent':
      return t('main.toolPalette.blocks.sectionRecent')
    case 'favorites':
      return t('main.toolPalette.blocks.sectionFavorites')
    case 'libraries':
      return t('main.toolPalette.blocks.sectionLibraries')
    default:
      return t('main.toolPalette.blocks.sectionCurrentDrawing')
  }
})

const emptyText = computed(() => {
  switch (sourceTab.value) {
    case 'recent':
      return t('main.toolPalette.blocks.emptyRecent')
    case 'favorites':
      return t('main.toolPalette.blocks.emptyFavorites')
    case 'libraries':
      return t('main.toolPalette.blocks.emptyLibraries')
    default:
      return t('main.toolPalette.blocks.empty')
  }
})

const filteredBlocks = computed(() => {
  const q = filterText.value.trim().toLowerCase()
  if (!q) return blocks.value
  return blocks.value.filter(b => b.name.toLowerCase().includes(q))
})

function loadOptions() {
  try {
    const raw = localStorage.getItem(OPTIONS_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Partial<typeof options>
    Object.assign(options, {
      specifyInsertionPoint: parsed.specifyInsertionPoint !== false,
      specifyScale: !!parsed.specifyScale,
      scaleX: positiveOr(parsed.scaleX, 1),
      scaleY: positiveOr(parsed.scaleY, 1),
      scaleZ: positiveOr(parsed.scaleZ, 1),
      specifyRotation: !!parsed.specifyRotation,
      rotationDeg: Number.isFinite(parsed.rotationDeg)
        ? (parsed.rotationDeg as number)
        : 0,
      autoPlacement: parsed.autoPlacement !== false,
      repeatPlacement: !!parsed.repeatPlacement,
      explode: !!parsed.explode
    })
  } catch {
    /* ignore */
  }
}

function persistOptions() {
  try {
    localStorage.setItem(OPTIONS_KEY, JSON.stringify({ ...options }))
  } catch {
    /* ignore */
  }
}

function positiveOr(value: number | undefined, fallback: number): number {
  return value !== undefined && value > 0 ? value : fallback
}

async function reload() {
  cancelRefresh()
  if (sourceTab.value === 'libraries') {
    blocks.value = []
    return
  }
  if (sourceTab.value === 'recent') {
    await refreshBlocks(listRecentBlockNames(), () => sourceTab.value === 'recent')
    return
  }
  if (sourceTab.value === 'favorites') {
    await refreshBlocks(
      listFavoriteBlockNames(),
      () => sourceTab.value === 'favorites'
    )
    return
  }
  await refreshBlocks(null, () => sourceTab.value === 'current')
}

function selectSourceTab(tab: BlocksSourceTab) {
  sourceTab.value = tab
}

/**
 * Starts `-INSERT` for the chosen block, applying Blocks palette Options.
 */
function insertBlockByName(blockName: string) {
  if (!isInsertableBlockName(blockName)) return
  rememberRecentBlock(blockName)
  persistOptions()

  AcApBlockInsertSession.set({
    specifyScale: options.specifyScale,
    scaleX: options.scaleX,
    scaleY: options.scaleY,
    scaleZ: options.scaleZ,
    specifyRotation: options.specifyRotation,
    rotationDeg: options.rotationDeg,
    repeatPlacement: options.repeatPlacement
  })

  AcApDocManager.instance.sendStringToExecute(`-insert\n${blockName}`)
}

function onToggleFavorite(blockName: string, event: Event) {
  event.stopPropagation()
  toggleFavoriteBlock(blockName)
  if (sourceTab.value === 'favorites') {
    void reload()
  }
}

function favoriteActive(blockName: string) {
  return isFavoriteBlock(blockName)
}

function onDocumentActivated() {
  void reload()
}

watch(sourceTab, () => {
  void reload()
})

watch(
  options,
  () => {
    persistOptions()
  },
  { deep: true }
)

onMounted(() => {
  loadOptions()
  void reload()
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
</script>

<template>
  <div class="ml-blocks-palette">
    <nav class="ml-blocks-palette__sources" aria-label="Blocks sources">
      <button
        v-for="tab in sourceTabs"
        :key="tab.name"
        type="button"
        class="ml-blocks-palette__source"
        :class="{ 'is-active': sourceTab === tab.name }"
        :title="tab.label"
        @click="selectSourceTab(tab.name)"
      >
        <span class="ml-blocks-palette__source-label">{{ tab.label }}</span>
      </button>
    </nav>

    <div class="ml-blocks-palette__main">
      <div class="ml-blocks-palette__toolbar">
        <ElInput
          v-model="filterText"
          clearable
          class="ml-blocks-palette__filter"
          :placeholder="t('main.toolPalette.blocks.filterPlaceholder')"
        >
          <template #prefix>
            <ElIcon><Search /></ElIcon>
          </template>
        </ElInput>
      </div>

      <div class="ml-blocks-palette__section-title">{{ sectionTitle }}</div>

      <div class="ml-blocks-palette__grid-wrap">
        <div v-if="filteredBlocks.length === 0" class="ml-blocks-palette__empty">
          {{ emptyText }}
        </div>
        <div v-else class="ml-blocks-palette__grid">
          <button
            v-for="block in filteredBlocks"
            :key="block.name"
            type="button"
            class="ml-blocks-palette__item"
            :title="block.name"
            @click="insertBlockByName(block.name)"
          >
            <div class="ml-blocks-palette__preview">
              <img
                v-if="block.previewUrl"
                class="ml-blocks-palette__preview-img"
                :src="block.previewUrl"
                alt=""
              />
              <span
                v-else
                class="ml-blocks-palette__placeholder"
                aria-hidden="true"
              >
                <component :is="insertBlock" />
              </span>
              <button
                v-if="sourceTab !== 'libraries'"
                type="button"
                class="ml-blocks-palette__fav"
                :class="{ 'is-active': favoriteActive(block.name) }"
                :title="t('main.toolPalette.blocks.toggleFavorite')"
                @click="onToggleFavorite(block.name, $event)"
              >
                <ElIcon>
                  <component
                    :is="favoriteActive(block.name) ? StarFilled : Star"
                  />
                </ElIcon>
              </button>
            </div>
            <div class="ml-blocks-palette__name">{{ block.name }}</div>
          </button>
        </div>
      </div>

      <div class="ml-blocks-palette__options">
        <button
          type="button"
          class="ml-blocks-palette__options-header"
          @click="optionsExpanded = !optionsExpanded"
        >
          <span>{{ t('main.toolPalette.blocks.options') }}</span>
          <ElIcon>
            <component :is="optionsExpanded ? ArrowUp : ArrowDown" />
          </ElIcon>
        </button>

        <div v-show="optionsExpanded" class="ml-blocks-palette__options-body">
          <label class="ml-blocks-palette__option-row">
            <ElCheckbox v-model="options.specifyInsertionPoint" disabled />
            <span>{{ t('main.toolPalette.blocks.insertionPoint') }}</span>
          </label>

          <div class="ml-blocks-palette__option-row ml-blocks-palette__option-row--scale">
            <label class="ml-blocks-palette__option-check">
              <ElCheckbox v-model="options.specifyScale" />
              <span>{{ t('main.toolPalette.blocks.scale') }}</span>
            </label>
            <div
              class="ml-blocks-palette__scale-fields"
              :class="{ 'is-disabled': options.specifyScale }"
            >
              <label>
                X
                <ElInputNumber
                  v-model="options.scaleX"
                  :min="0.0001"
                  :step="0.1"
                  :controls="false"
                  size="small"
                  :disabled="options.specifyScale"
                />
              </label>
              <label>
                Y
                <ElInputNumber
                  v-model="options.scaleY"
                  :min="0.0001"
                  :step="0.1"
                  :controls="false"
                  size="small"
                  :disabled="options.specifyScale"
                />
              </label>
              <label>
                Z
                <ElInputNumber
                  v-model="options.scaleZ"
                  :min="0.0001"
                  :step="0.1"
                  :controls="false"
                  size="small"
                  :disabled="options.specifyScale"
                />
              </label>
            </div>
          </div>

          <div class="ml-blocks-palette__option-row ml-blocks-palette__option-row--rotation">
            <label class="ml-blocks-palette__option-check">
              <ElCheckbox v-model="options.specifyRotation" />
              <span>{{ t('main.toolPalette.blocks.rotation') }}</span>
            </label>
            <label
              class="ml-blocks-palette__angle-field"
              :class="{ 'is-disabled': options.specifyRotation }"
            >
              <ElInputNumber
                v-model="options.rotationDeg"
                :step="1"
                :controls="false"
                size="small"
                :disabled="options.specifyRotation"
              />
              <span>{{ t('main.toolPalette.blocks.angle') }}</span>
            </label>
          </div>

          <label class="ml-blocks-palette__option-row">
            <ElCheckbox v-model="options.autoPlacement" disabled />
            <span>{{ t('main.toolPalette.blocks.autoPlacement') }}</span>
          </label>

          <label class="ml-blocks-palette__option-row">
            <ElCheckbox v-model="options.repeatPlacement" />
            <span>{{ t('main.toolPalette.blocks.repeatPlacement') }}</span>
          </label>

          <label class="ml-blocks-palette__option-row">
            <ElCheckbox v-model="options.explode" disabled />
            <span>{{ t('main.toolPalette.blocks.explode') }}</span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ml-blocks-palette {
  display: flex;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--el-bg-color, #1d1e1f);
  color: var(--el-text-color-regular, #cfd3dc);
}

.ml-blocks-palette__sources {
  display: flex;
  flex-direction: column;
  flex: 0 0 28px;
  border-right: 1px solid var(--el-border-color-lighter, rgba(255, 255, 255, 0.1));
  background: var(--el-fill-color-darker, #2b2d31);
}

.ml-blocks-palette__source {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 88px;
  padding: 8px 2px;
  border: 0;
  border-bottom: 1px solid var(--el-border-color-lighter, rgba(255, 255, 255, 0.08));
  background: transparent;
  color: var(--el-text-color-secondary, #a3a6ad);
  cursor: pointer;
}

.ml-blocks-palette__source.is-active {
  background: var(--el-fill-color-light, rgba(255, 255, 255, 0.08));
  color: var(--el-text-color-primary, #e5eaf3);
}

.ml-blocks-palette__source-label {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-size: 11px;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.ml-blocks-palette__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.ml-blocks-palette__toolbar {
  padding: 8px 8px 4px;
}

.ml-blocks-palette__filter {
  width: 100%;
}

.ml-blocks-palette__section-title {
  padding: 4px 10px 6px;
  color: var(--el-text-color-regular, #cfd3dc);
  font-size: 12px;
  font-weight: 600;
}

.ml-blocks-palette__grid-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 8px 8px;
}

.ml-blocks-palette__empty {
  padding: 24px 8px;
  color: var(--el-text-color-secondary, #a3a6ad);
  font-size: 12px;
  text-align: center;
}

.ml-blocks-palette__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.ml-blocks-palette__item {
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

.ml-blocks-palette__item:hover {
  background: var(--el-fill-color-light, rgba(255, 255, 255, 0.08));
  border-color: var(--el-border-color-lighter, rgba(255, 255, 255, 0.12));
}

.ml-blocks-palette__preview {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 2px;
  background: var(--el-fill-color-darker, #2b2d31);
  overflow: hidden;
}

.ml-blocks-palette__preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
}

.ml-blocks-palette__placeholder {
  display: inline-flex;
  width: 28px;
  height: 28px;
  opacity: 0.7;
}

.ml-blocks-palette__placeholder :deep(svg) {
  width: 100%;
  height: 100%;
  fill: none;
}

.ml-blocks-palette__fav {
  position: absolute;
  top: 2px;
  right: 2px;
  display: inline-flex;
  padding: 2px;
  border: 0;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.35);
  color: var(--el-text-color-secondary, #a3a6ad);
  cursor: pointer;
  opacity: 0;
}

.ml-blocks-palette__item:hover .ml-blocks-palette__fav,
.ml-blocks-palette__fav.is-active {
  opacity: 1;
}

.ml-blocks-palette__fav.is-active {
  color: #e6a23c;
}

.ml-blocks-palette__name {
  max-width: 80px;
  overflow: hidden;
  font-size: 11px;
  line-height: 1.2;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ml-blocks-palette__options {
  flex: 0 0 auto;
  border-top: 1px solid var(--el-border-color-lighter, rgba(255, 255, 255, 0.1));
  background: var(--el-fill-color-darker, #2b2d31);
}

.ml-blocks-palette__options-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 6px 10px;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.ml-blocks-palette__options-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 10px 10px;
}

.ml-blocks-palette__option-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.ml-blocks-palette__option-row--scale,
.ml-blocks-palette__option-row--rotation {
  flex-wrap: wrap;
  align-items: flex-start;
}

.ml-blocks-palette__option-check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 0 1 auto;
}

.ml-blocks-palette__scale-fields {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}

.ml-blocks-palette__scale-fields label,
.ml-blocks-palette__angle-field {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}

.ml-blocks-palette__scale-fields :deep(.el-input-number),
.ml-blocks-palette__angle-field :deep(.el-input-number) {
  width: 64px;
}

.ml-blocks-palette__scale-fields.is-disabled,
.ml-blocks-palette__angle-field.is-disabled {
  opacity: 0.55;
}
</style>
