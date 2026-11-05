<template>
  <div class="file-upload-container">
    <div class="upload-panel">
      <div class="upload-main">
        <section class="upload-hero">
          <div class="upload-icon">
            <el-icon :size="20">
              <UploadFilled />
            </el-icon>
          </div>
          <div class="upload-hero-text">
            <h1 class="upload-title">
            {{ t('example.fileUpload.title') }}
          </h1>
            <p class="upload-subtitle">
              {{ t('example.fileUpload.subtitle') }}
            </p>
          </div>
        </section>

        <div class="upload-actions">
          <div ref="fileOpenHost" class="file-open-host"></div>
        </div>

        <p class="font-cdn-notice">
          {{ t('example.fileUpload.fontCdnNotice') }}
        </p>
      </div>

      <section
        class="settings-section"
        :class="{ 'is-expanded': isSettingsExpanded }"
      >
        <button
          type="button"
          class="settings-header"
          :aria-expanded="isSettingsExpanded"
          aria-controls="open-options-panel"
          @click="toggleSettings"
        >
          <h2 class="settings-title">
            {{ t('example.fileUpload.openOptions') }}
          </h2>
          <span class="settings-chevron" aria-hidden="true">&#x25BC;</span>
        </button>

        <div
          id="open-options-panel"
          class="settings-grid"
          :hidden="!isSettingsExpanded"
        >
          <div class="setting-block setting-block--full">
            <h3 class="setting-label">
              {{ t('example.fileUpload.initialView') }}
            </h3>
            <div
              class="pill-segment"
              role="radiogroup"
              :aria-label="t('example.fileUpload.initialView')"
            >
              <button
                v-for="option in openViewModes"
                :key="option.value"
                type="button"
                class="pill-option"
                :class="{ 'is-active': selectedOpenViewMode === option.value }"
                role="radio"
                :aria-checked="selectedOpenViewMode === option.value"
                :title="option.description"
                @click="selectedOpenViewMode = option.value"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <div class="setting-block setting-block--full">
            <h3 class="setting-label">
              {{ t('example.fileUpload.accessMode') }}
            </h3>
            <div
              class="pill-segment"
              role="radiogroup"
              :aria-label="t('example.fileUpload.accessMode')"
            >
              <button
                v-for="mode in accessModes"
                :key="mode.value"
                type="button"
                class="pill-option"
                :class="{ 'is-active': selectedMode === mode.value }"
                role="radio"
                :aria-checked="selectedMode === mode.value"
                :title="mode.description"
                @click="selectedMode = mode.value"
              >
                {{ mode.label }}
              </button>
            </div>
          </div>

          <div class="setting-block setting-block--full">
            <h3 class="setting-label">
              {{ t('example.fileUpload.curveQuality') }}
            </h3>
            <div
              class="pill-segment"
              role="radiogroup"
              :aria-label="t('example.fileUpload.curveQuality')"
            >
              <button
                v-for="option in curveQualityOptions"
                :key="option.value"
                type="button"
                class="pill-option"
                :class="{ 'is-active': selectedCircleSides === option.value }"
                role="radio"
                :aria-checked="selectedCircleSides === option.value"
                :title="option.description"
                @click="selectedCircleSides = option.value"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <div class="setting-block">
            <h3 class="setting-label">
              {{ t('example.fileUpload.textRendering') }}
            </h3>
            <div
              class="pill-segment"
              role="radiogroup"
              :aria-label="t('example.fileUpload.textRendering')"
            >
              <button
                type="button"
                class="pill-option"
                :class="{ 'is-active': !useMainThreadDraw }"
                role="radio"
                :aria-checked="!useMainThreadDraw"
                :title="t('example.fileUpload.workerHint')"
                @click="useMainThreadDraw = false"
              >
                {{ t('example.fileUpload.worker') }}
              </button>
              <button
                type="button"
                class="pill-option"
                :class="{ 'is-active': useMainThreadDraw }"
                role="radio"
                :aria-checked="useMainThreadDraw"
                :title="t('example.fileUpload.mainThreadHint')"
                @click="useMainThreadDraw = true"
              >
                {{ t('example.fileUpload.mainThread') }}
              </button>
            </div>
          </div>

          <div class="setting-block">
            <h3 class="setting-label">
              {{ t('example.fileUpload.progressive') }}
            </h3>
            <div
              class="pill-segment"
              role="radiogroup"
              :aria-label="t('example.fileUpload.progressiveRendering')"
            >
              <button
                type="button"
                class="pill-option"
                :class="{ 'is-active': progressiveRendering }"
                role="radio"
                :aria-checked="progressiveRendering"
                :title="t('example.fileUpload.progressiveOnHint')"
                @click="progressiveRendering = true"
              >
                {{ t('example.fileUpload.on') }}
              </button>
              <button
                type="button"
                class="pill-option"
                :class="{ 'is-active': !progressiveRendering }"
                role="radio"
                :aria-checked="!progressiveRendering"
                :title="t('example.fileUpload.progressiveOffHint')"
                @click="progressiveRendering = false"
              >
                {{ t('example.fileUpload.off') }}
              </button>
            </div>
          </div>

          <div class="setting-block">
            <h3 class="setting-label">
              {{ t('example.fileUpload.nonPlottable') }}
            </h3>
            <div
              class="pill-segment"
              role="radiogroup"
              :aria-label="t('example.fileUpload.nonPlottableLayers')"
            >
              <button
                type="button"
                class="pill-option"
                :class="{ 'is-active': !drawNoPlotLayers }"
                role="radio"
                :aria-checked="!drawNoPlotLayers"
                :title="t('example.fileUpload.hideHint')"
                @click="drawNoPlotLayers = false"
              >
                {{ t('example.fileUpload.hide') }}
              </button>
              <button
                type="button"
                class="pill-option"
                :class="{ 'is-active': drawNoPlotLayers }"
                role="radio"
                :aria-checked="drawNoPlotLayers"
                :title="t('example.fileUpload.showHint')"
                @click="drawNoPlotLayers = true"
              >
                {{ t('example.fileUpload.show') }}
              </button>
            </div>
          </div>

          <div class="setting-block setting-block--half">
            <h3 class="setting-label">
              {{ t('example.fileUpload.export') }}
            </h3>
            <div
              class="pill-segment"
              role="radiogroup"
              :aria-label="t('example.fileUpload.export')"
            >
              <button
                type="button"
                class="pill-option"
                :class="{ 'is-active': !disableExport }"
                role="radio"
                :aria-checked="!disableExport"
                :title="t('example.fileUpload.exportEnableHint')"
                @click="disableExport = false"
              >
                {{ t('example.fileUpload.exportEnable') }}
              </button>
              <button
                type="button"
                class="pill-option"
                :class="{ 'is-active': disableExport }"
                role="radio"
                :aria-checked="disableExport"
                :title="t('example.fileUpload.exportDisableHint')"
                @click="disableExport = true"
              >
                {{ t('example.fileUpload.exportDisable') }}
              </button>
            </div>
          </div>

          <div class="setting-block setting-block--half">
            <h3 class="setting-label">
              {{ t('example.fileUpload.paperSpaceBackground') }}
            </h3>
            <div
              class="pill-segment"
              role="radiogroup"
              :aria-label="t('example.fileUpload.paperSpaceBackground')"
            >
              <button
                type="button"
                class="pill-option"
                :class="{ 'is-active': paperSpaceBackground === ACGI_PAPER_SPACE_BACKGROUND }"
                role="radio"
                :aria-checked="paperSpaceBackground === ACGI_PAPER_SPACE_BACKGROUND"
                :title="t('example.fileUpload.paperSpaceWhiteHint')"
                @click="paperSpaceBackground = ACGI_PAPER_SPACE_BACKGROUND"
              >
                {{ t('example.fileUpload.paperSpaceWhite') }}
              </button>
              <button
                type="button"
                class="pill-option"
                :class="{ 'is-active': paperSpaceBackground === ACGI_MODEL_SPACE_BACKGROUND }"
                role="radio"
                :aria-checked="paperSpaceBackground === ACGI_MODEL_SPACE_BACKGROUND"
                :title="t('example.fileUpload.paperSpaceBlackHint')"
                @click="paperSpaceBackground = ACGI_MODEL_SPACE_BACKGROUND"
              >
                {{ t('example.fileUpload.paperSpaceBlack') }}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { UploadFilled } from '@element-plus/icons-vue'
import {
  AcApDataSourceManager,
  AcApOpenViewMode,
  AcEdOpenMode,
  type AcEdUiTheme,
  AcUiFileOpenLanding,
  type AcUiFileOpenRequest
} from '@mlightcad/cad-simple-viewer/file-open-panel'
import {
  ACDB_DRAW_CIRCLE_SIDES_DRAFT,
  ACDB_DRAW_CIRCLE_SIDES_HIGH,
  ACDB_DRAW_CIRCLE_SIDES_STANDARD,
  ACGI_MODEL_SPACE_BACKGROUND,
  ACGI_PAPER_SPACE_BACKGROUND
} from '@mlightcad/data-model'
import { ElIcon } from 'element-plus'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

interface Props {
  onFileSelect: (
    file: File,
    mode: AcEdOpenMode,
    useMainThreadDraw: boolean,
    drawNoPlotLayers: boolean,
    progressiveRendering: boolean,
    openViewMode: AcApOpenViewMode | undefined,
    circleSides: number,
    paperSpaceBackground: number,
    disableExport: boolean
  ) => void
  onNewDrawing?: (
    mode: AcEdOpenMode,
    useMainThreadDraw: boolean,
    drawNoPlotLayers: boolean,
    progressiveRendering: boolean,
    openViewMode: AcApOpenViewMode | undefined,
    circleSides: number,
    paperSpaceBackground: number,
    disableExport: boolean
  ) => void
  onUrlSelect?: (
    url: string,
    mode: AcEdOpenMode,
    useMainThreadDraw: boolean,
    drawNoPlotLayers: boolean,
    progressiveRendering: boolean,
    openViewMode: AcApOpenViewMode | undefined,
    circleSides: number,
    paperSpaceBackground: number,
    disableExport: boolean
  ) => void
  /**
   * Shared landing registry (owned by the parent so it outlives this screen
   * and can be attached to DocManager after the viewer mounts).
   */
  landingManager: AcApDataSourceManager
  /**
   * File-open card theme. Omit to follow the document / host theme.
   */
  theme?: AcEdUiTheme
}

const props = defineProps<Props>()
const { t } = useI18n({ useScope: 'global' })

const fileOpenHost = ref<HTMLElement | null>(null)
let fileOpenLanding: AcUiFileOpenLanding | null = null

const emitOpenOptions = () =>
  [
    selectedMode.value,
    useMainThreadDraw.value,
    drawNoPlotLayers.value,
    progressiveRendering.value,
    resolveOpenViewMode(),
    selectedCircleSides.value,
    paperSpaceBackground.value,
    disableExport.value
  ] as const

const handleLandingOpen = (request: AcUiFileOpenRequest) => {
  const options = emitOpenOptions()
  if (request.kind === 'file') {
    if (!isValidFile(request.file)) return
    props.onFileSelect(request.file, ...options)
    return
  }
  if (request.kind === 'url') {
    props.onUrlSelect?.(request.url, ...options)
    return
  }
  props.onNewDrawing?.(...options)
}

const mountFileOpenLanding = () => {
  if (!fileOpenHost.value || fileOpenLanding) return
  fileOpenLanding = new AcUiFileOpenLanding({
    host: fileOpenHost.value,
    theme: props.theme,
    showNewDrawing: true,
    manager: props.landingManager,
    onOpen: handleLandingOpen
  })
}

watch(
  () => props.theme,
  theme => {
    fileOpenLanding?.setTheme(theme)
  }
)

type OpenViewModeChoice = 'auto' | AcApOpenViewMode

const MOBILE_MAX_WIDTH = '(max-width: 768px)'

const getIsMobileLayout = () =>
  typeof window !== 'undefined' &&
  window.matchMedia(MOBILE_MAX_WIDTH).matches

const isMobileLayout = ref(getIsMobileLayout())
const settingsExpanded = ref(!getIsMobileLayout())
const isSettingsExpanded = computed(
  () => !isMobileLayout.value || settingsExpanded.value
)

const selectedMode = ref<AcEdOpenMode>(AcEdOpenMode.Write)
const selectedOpenViewMode = ref<OpenViewModeChoice>('auto')
const selectedCircleSides = ref(ACDB_DRAW_CIRCLE_SIDES_DRAFT)
const useMainThreadDraw = ref(true)
const drawNoPlotLayers = ref(false)
const progressiveRendering = ref(false)
const paperSpaceBackground = ref(ACGI_PAPER_SPACE_BACKGROUND)
const disableExport = ref(false)

let mobileMediaQuery: MediaQueryList | null = null

const syncMobileLayout = () => {
  const matches = mobileMediaQuery?.matches ?? false
  const wasMobile = isMobileLayout.value
  isMobileLayout.value = matches
  if (matches && !wasMobile) {
    settingsExpanded.value = false
  } else if (!matches) {
    settingsExpanded.value = true
  }
}

const toggleSettings = () => {
  if (!isMobileLayout.value) return
  settingsExpanded.value = !settingsExpanded.value
}

onMounted(() => {
  mobileMediaQuery = window.matchMedia(MOBILE_MAX_WIDTH)
  syncMobileLayout()
  mobileMediaQuery.addEventListener('change', syncMobileLayout)
  mountFileOpenLanding()
})

onUnmounted(() => {
  mobileMediaQuery?.removeEventListener('change', syncMobileLayout)
  mobileMediaQuery = null
  fileOpenLanding?.dispose()
  fileOpenLanding = null
})

const openViewModes = computed(() => [
  {
    value: 'auto' as const,
    label: t('example.fileUpload.auto'),
    description: t('example.fileUpload.autoHint')
  },
  {
    value: AcApOpenViewMode.Extents,
    label: t('example.fileUpload.extents'),
    description: t('example.fileUpload.extentsHint')
  },
  {
    value: AcApOpenViewMode.Saved,
    label: t('example.fileUpload.saved'),
    description: t('example.fileUpload.savedHint')
  }
] as const)

const resolveOpenViewMode = (): AcApOpenViewMode | undefined =>
  selectedOpenViewMode.value === 'auto' ? undefined : selectedOpenViewMode.value

const curveQualityOptions = computed(() => [
  {
    value: ACDB_DRAW_CIRCLE_SIDES_DRAFT,
    label: t('example.fileUpload.curveDraft'),
    description: t('example.fileUpload.curveDraftHint')
  },
  {
    value: ACDB_DRAW_CIRCLE_SIDES_STANDARD,
    label: t('example.fileUpload.curveStandard'),
    description: t('example.fileUpload.curveStandardHint')
  },
  {
    value: ACDB_DRAW_CIRCLE_SIDES_HIGH,
    label: t('example.fileUpload.curveHigh'),
    description: t('example.fileUpload.curveHighHint')
  }
] as const)

const accessModes = computed(() => [
  {
    value: AcEdOpenMode.Read,
    label: t('example.fileUpload.read'),
    description: t('example.fileUpload.readHint')
  },
  {
    value: AcEdOpenMode.Review,
    label: t('example.fileUpload.review'),
    description: t('example.fileUpload.reviewHint')
  },
  {
    value: AcEdOpenMode.Write,
    label: t('example.fileUpload.write'),
    description: t('example.fileUpload.writeHint')
  }
] as const)

const isValidFile = (file: File): boolean => {
  const validExtensions = ['.dwg', '.dxf']
  const fileName = file.name.toLowerCase()
  return validExtensions.some(ext => fileName.endsWith(ext))
}
</script>

<style scoped>
.file-upload-container {
  display: flex;
  justify-content: center;
  width: 100%;
  max-width: 820px;
  padding: 0;
  box-sizing: border-box;
}

.upload-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-rows: auto;
  width: 100%;
  border-radius: 14px;
  background: var(--ml-ui-bg, #1d1e1f);
  border: 1px solid var(--ml-ui-border, #4c4d4f);
  box-shadow: var(--ml-ui-shadow, 0 6px 18px rgba(0, 0, 0, 0.35));
  overflow: hidden;
  color: var(--ml-ui-text, #e5eaf3);
}

.upload-main {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 18px 20px;
}

.upload-hero {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.upload-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--ml-ui-accent, #409eff);
  color: #ffffff;
  box-shadow: 0 4px 12px
    color-mix(in srgb, var(--ml-ui-accent, #409eff) 35%, transparent);
}

.upload-hero-text {
  min-width: 0;
}

.upload-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ml-ui-text, #e5eaf3);
  line-height: 1.25;
}

.upload-subtitle {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--ml-ui-text-muted, #cfd3dc);
  line-height: 1.35;
}

.font-cdn-notice {
  margin: 12px 0 0;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid
    color-mix(in srgb, var(--ml-ui-accent, #409eff) 35%, var(--ml-ui-border, #4c4d4f));
  background: color-mix(
    in srgb,
    var(--ml-ui-accent, #409eff) 12%,
    var(--ml-ui-bg-fill, #262727)
  );
  color: var(--ml-ui-text-muted, #cfd3dc);
  font-size: 11px;
  line-height: 1.45;
}

.upload-actions {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  gap: 0;
}

.file-open-host {
  width: 100%;
  flex: 1;
  min-height: 0;
}

.settings-section {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 18px 20px;
  background: var(--ml-ui-bg-fill, #262727);
  border-left: 1px solid var(--ml-ui-border, #4c4d4f);
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  margin: 0 0 10px;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: default;
  color: inherit;
}

.settings-title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--ml-ui-text, #e5eaf3);
}

.settings-chevron {
  display: none;
  flex-shrink: 0;
  font-size: 0.65rem;
  color: var(--ml-ui-text-muted, #cfd3dc);
  line-height: 1;
  transition: transform 0.2s ease;
}

.settings-section.is-expanded .settings-chevron {
  transform: rotate(180deg);
}

.settings-grid {
  display: grid;
  /* Six tracks so a row of three options is thirds and a row of two is halves. */
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px 12px;
}

.settings-grid[hidden] {
  display: none;
}

.setting-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  grid-column: span 2;
}

.setting-block--full {
  grid-column: 1 / -1;
}

.setting-block--half {
  grid-column: span 3;
}

.setting-label {
  margin: 0;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ml-ui-text-muted, #cfd3dc);
}

.pill-segment {
  display: flex;
  gap: 0;
  border: 1.5px solid var(--ml-ui-border, #4c4d4f);
  border-radius: 7px;
  background: var(--ml-ui-bg, #1d1e1f);
  overflow: hidden;
}

.pill-option {
  flex: 1;
  padding: 6px 8px;
  border: none;
  background: transparent;
  font-size: 11px;
  font-weight: 600;
  color: var(--ml-ui-text-muted, #cfd3dc);
  cursor: pointer;
  text-align: center;
  white-space: nowrap;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.pill-option:not(:last-child) {
  border-right: 1px solid var(--ml-ui-border, #4c4d4f);
}

.pill-option:hover:not(.is-active) {
  background: color-mix(
    in srgb,
    var(--ml-ui-accent, #409eff) 8%,
    transparent
  );
  color: var(--ml-ui-text, #e5eaf3);
}

.pill-option.is-active {
  background: color-mix(
    in srgb,
    var(--ml-ui-accent, #409eff) 18%,
    transparent
  );
  color: var(--ml-ui-accent, #409eff);
}

/* Narrow viewports: stack upload + settings as two vertical rows */
@media (max-width: 768px) {
  .file-upload-container {
    max-width: 100%;
  }

  .upload-panel {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
  }

  .settings-section {
    border-left: none;
    border-top: 1px solid var(--ml-ui-border, #4c4d4f);
    padding-top: 12px;
    padding-bottom: 12px;
  }

  .settings-header {
    margin-bottom: 0;
    cursor: pointer;
  }

  .settings-section.is-expanded .settings-header {
    margin-bottom: 10px;
  }

  .settings-chevron {
    display: inline-block;
  }

  .settings-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .setting-block,
  .setting-block--half {
    grid-column: auto;
  }

  .setting-block--full {
    grid-column: 1 / -1;
  }
}

@media (max-width: 400px) {
  .upload-main,
  .settings-section {
    padding-left: 14px;
    padding-right: 14px;
  }

  .settings-grid {
    grid-template-columns: 1fr;
  }

  .setting-block,
  .setting-block--half,
  .setting-block--full {
    grid-column: auto;
  }
}
</style>
