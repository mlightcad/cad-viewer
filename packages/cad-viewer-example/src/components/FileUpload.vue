<template>
  <div class="file-upload-container">
    <div class="upload-panel">
      <div class="upload-main">
        <section class="upload-hero">
          <div class="upload-icon">
            <el-icon :size="24">
              <UploadFilled />
            </el-icon>
          </div>
          <div class="upload-hero-text">
            <h1 class="upload-title">Select CAD File to View</h1>
            <p class="upload-subtitle">
              Import DWG or DXF drawings into the viewer
            </p>
          </div>
        </section>

        <el-upload
          class="upload-dropzone"
          drag
          :auto-upload="false"
          accept=".dwg,.dxf"
          :on-change="handleFileChange"
          :before-upload="beforeUpload"
        >
          <div class="dropzone-content">
            <p class="dropzone-title">Drop your file here</p>
            <p class="dropzone-hint">
              or <span class="dropzone-link">browse files</span>
            </p>
            <div class="format-tags">
              <span class="format-tag">DWG</span>
              <span class="format-tag">DXF</span>
            </div>
          </div>
        </el-upload>
      </div>

      <section class="settings-section">
        <header class="settings-header">
          <h2 class="settings-title">Open options</h2>
          <p class="settings-subtitle">Applied when the file is loaded</p>
        </header>

        <div class="settings-grid">
          <div class="setting-block setting-block--full">
            <h3 class="setting-label">Initial view</h3>
            <div
              class="mode-segment"
              role="radiogroup"
              aria-label="Initial view"
            >
              <button
                v-for="option in openViewModes"
                :key="option.value"
                type="button"
                class="mode-option"
                :class="{ 'is-active': selectedOpenViewMode === option.value }"
                role="radio"
                :aria-checked="selectedOpenViewMode === option.value"
                @click="selectedOpenViewMode = option.value"
              >
                <span class="option-title">{{ option.label }}</span>
                <span class="option-desc">{{ option.description }}</span>
              </button>
            </div>
          </div>

          <div class="setting-block setting-block--full">
            <h3 class="setting-label">Access mode</h3>
            <div
              class="mode-segment"
              role="radiogroup"
              aria-label="Access mode"
            >
              <button
                v-for="mode in accessModes"
                :key="mode.value"
                type="button"
                class="mode-option"
                :class="{ 'is-active': selectedMode === mode.value }"
                role="radio"
                :aria-checked="selectedMode === mode.value"
                @click="selectedMode = mode.value"
              >
                <span class="option-title">{{ mode.label }}</span>
                <span class="option-desc">{{ mode.description }}</span>
              </button>
            </div>
          </div>

          <div class="setting-block">
            <h3 class="setting-label">Text rendering</h3>
            <div
              class="pill-segment"
              role="radiogroup"
              aria-label="Text rendering"
            >
              <button
                type="button"
                class="pill-option"
                :class="{ 'is-active': !useMainThreadDraw }"
                role="radio"
                :aria-checked="!useMainThreadDraw"
                @click="useMainThreadDraw = false"
              >
                Web worker
              </button>
              <button
                type="button"
                class="pill-option"
                :class="{ 'is-active': useMainThreadDraw }"
                role="radio"
                :aria-checked="useMainThreadDraw"
                @click="useMainThreadDraw = true"
              >
                Main thread
              </button>
            </div>
            <p class="setting-hint">
              {{
                useMainThreadDraw
                  ? 'Slower, less memory'
                  : 'Faster, more memory'
              }}
            </p>
          </div>

          <div class="setting-block">
            <h3 class="setting-label">Progressive rendering</h3>
            <div
              class="pill-segment"
              role="radiogroup"
              aria-label="Progressive rendering"
            >
              <button
                type="button"
                class="pill-option"
                :class="{ 'is-active': progressiveRendering }"
                role="radio"
                :aria-checked="progressiveRendering"
                @click="progressiveRendering = true"
              >
                Enabled
              </button>
              <button
                type="button"
                class="pill-option"
                :class="{ 'is-active': !progressiveRendering }"
                role="radio"
                :aria-checked="!progressiveRendering"
                @click="progressiveRendering = false"
              >
                Disabled
              </button>
            </div>
            <p class="setting-hint">
              {{
                progressiveRendering
                  ? 'Show geometry while loading'
                  : 'Wait until fully converted'
              }}
            </p>
          </div>

          <div class="setting-block">
            <h3 class="setting-label">Non-plottable layers</h3>
            <div
              class="pill-segment"
              role="radiogroup"
              aria-label="Non-plottable layers"
            >
              <button
                type="button"
                class="pill-option"
                :class="{ 'is-active': !drawNoPlotLayers }"
                role="radio"
                :aria-checked="!drawNoPlotLayers"
                @click="drawNoPlotLayers = false"
              >
                Hide
              </button>
              <button
                type="button"
                class="pill-option"
                :class="{ 'is-active': drawNoPlotLayers }"
                role="radio"
                :aria-checked="drawNoPlotLayers"
                @click="drawNoPlotLayers = true"
              >
                Show
              </button>
            </div>
            <p class="setting-hint">
              {{
                drawNoPlotLayers
                  ? 'AutoCAD editor semantics'
                  : 'Web viewer default'
              }}
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { UploadFilled } from '@element-plus/icons-vue'
import { AcApOpenViewMode, AcEdOpenMode } from '@mlightcad/cad-simple-viewer'
import { log } from '@mlightcad/data-model'
import type { UploadFile, UploadProps } from 'element-plus'
import { ElIcon, ElUpload } from 'element-plus'
import { ref } from 'vue'

interface Props {
  onFileSelect: (
    file: File,
    mode: AcEdOpenMode,
    useMainThreadDraw: boolean,
    drawNoPlotLayers: boolean,
    progressiveRendering: boolean,
    openViewMode: AcApOpenViewMode | undefined
  ) => void
}

const props = defineProps<Props>()

type OpenViewModeChoice = 'auto' | AcApOpenViewMode

const selectedMode = ref<AcEdOpenMode>(AcEdOpenMode.Write)
const selectedOpenViewMode = ref<OpenViewModeChoice>('auto')
const useMainThreadDraw = ref(false)
const drawNoPlotLayers = ref(false)
const progressiveRendering = ref(false)

const openViewModes = [
  {
    value: 'auto' as const,
    label: 'Auto',
    description: 'Based on access mode'
  },
  {
    value: AcApOpenViewMode.Extents,
    label: 'Extents',
    description: 'Fit drawing'
  },
  {
    value: AcApOpenViewMode.Saved,
    label: 'Saved',
    description: 'AutoCAD saved view'
  }
] as const

const resolveOpenViewMode = (): AcApOpenViewMode | undefined =>
  selectedOpenViewMode.value === 'auto' ? undefined : selectedOpenViewMode.value

const accessModes = [
  {
    value: AcEdOpenMode.Read,
    label: 'Read',
    description: 'View only'
  },
  {
    value: AcEdOpenMode.Review,
    label: 'Review',
    description: 'View & review'
  },
  {
    value: AcEdOpenMode.Write,
    label: 'Write',
    description: 'Full access'
  }
] as const

const handleFileChange: UploadProps['onChange'] = (uploadFile: UploadFile) => {
  if (uploadFile.raw) {
    if (isValidFile(uploadFile.raw)) {
      props.onFileSelect(
        uploadFile.raw,
        selectedMode.value,
        useMainThreadDraw.value,
        drawNoPlotLayers.value,
        progressiveRendering.value,
        resolveOpenViewMode()
      )
    }
  }
}

const beforeUpload: UploadProps['beforeUpload'] = (rawFile: File) => {
  if (!isValidFile(rawFile)) {
    log.warn('Invalid file type. Please upload DWG or DXF files.')
    return false
  }
  return true
}

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
  max-width: 640px;
  padding: 20px 24px;
  box-sizing: border-box;
}

.upload-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  border-radius: 16px;
  background: #ffffff;
  box-shadow:
    0 20px 40px rgba(15, 23, 42, 0.16),
    0 0 0 1px rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.upload-main {
  padding: 24px 24px 20px;
}

.upload-hero {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}

.upload-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #5b6fd6 100%);
  color: #ffffff;
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.3);
}

.upload-hero-text {
  min-width: 0;
}

.upload-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #0f172a;
  line-height: 1.3;
}

.upload-subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.4;
}

.upload-dropzone {
  width: 100%;
  box-sizing: border-box;
}

.upload-dropzone :deep(.el-upload) {
  display: block;
  width: 100%;
}

.upload-dropzone :deep(.el-upload-dragger) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  box-sizing: border-box;
  padding: 20px 16px;
  border: 1.5px dashed #c7d2fe;
  border-radius: 12px;
  background: #f8faff;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.upload-dropzone :deep(.el-upload-dragger:hover) {
  border-color: #667eea;
  background: #f1f5ff;
  box-shadow: inset 0 0 0 1px rgba(102, 126, 234, 0.08);
}

.dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.dropzone-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.dropzone-hint {
  margin: 0;
  font-size: 13px;
  color: #64748b;
}

.dropzone-link {
  color: #667eea;
  font-weight: 600;
}

.format-tags {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.format-tag {
  padding: 2px 8px;
  border-radius: 999px;
  background: #e8edff;
  color: #4f5fd0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.settings-section {
  padding: 16px 24px 20px;
  background: #f8fafc;
  border-top: 1px solid #e8edf5;
}

.settings-header {
  margin-bottom: 14px;
}

.settings-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.settings-subtitle {
  margin: 2px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 20px;
}

.setting-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.setting-block--full {
  grid-column: 1 / -1;
}

.setting-label {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #94a3b8;
}

.setting-hint {
  margin: 0;
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.35;
}

.mode-segment {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}

.mode-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 8px 6px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  cursor: pointer;
  text-align: center;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.mode-option:hover {
  border-color: #c7d2fe;
  background: #fafbff;
}

.mode-option.is-active {
  border-color: #667eea;
  background: #f1f5ff;
  box-shadow: 0 0 0 1px rgba(102, 126, 234, 0.12);
}

.option-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.3;
}

.mode-option.is-active .option-title {
  color: #4f5fd0;
}

.option-desc {
  font-size: 10px;
  color: #94a3b8;
  line-height: 1.3;
}

.mode-option.is-active .option-desc {
  color: #64748b;
}

.pill-segment {
  display: flex;
  gap: 0;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
}

.pill-option {
  flex: 1;
  padding: 7px 10px;
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  text-align: center;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.pill-option:not(:last-child) {
  border-right: 1px solid #e2e8f0;
}

.pill-option:hover:not(.is-active) {
  background: #f8fafc;
  color: #475569;
}

.pill-option.is-active {
  background: #f1f5ff;
  color: #4f5fd0;
}

@media (max-width: 520px) {
  .file-upload-container {
    padding: 16px;
  }

  .upload-main,
  .settings-section {
    padding-left: 16px;
    padding-right: 16px;
  }

  .settings-grid {
    grid-template-columns: 1fr;
  }

  .setting-block--full {
    grid-column: auto;
  }

  .mode-segment {
    grid-template-columns: 1fr;
  }

  .mode-option {
    flex-direction: row;
    justify-content: center;
    gap: 8px;
    padding: 10px 12px;
  }
}
</style>
