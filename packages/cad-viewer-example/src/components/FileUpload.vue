<template>
  <div class="file-upload-container">
    <div class="upload-panel">
      <section class="upload-hero">
        <div class="upload-icon">
          <el-icon :size="28">
            <UploadFilled />
          </el-icon>
        </div>
        <h1 class="upload-title">Select CAD File to View</h1>
        <p class="upload-subtitle">Import DWG or DXF drawings into the viewer</p>
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

      <section class="settings-section">
        <div class="setting-block">
          <h2 class="setting-label">Access mode</h2>
          <div class="mode-segment" role="radiogroup" aria-label="Access mode">
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
              <span class="mode-option-title">{{ mode.label }}</span>
              <span class="mode-option-desc">{{ mode.description }}</span>
            </button>
          </div>
        </div>

        <div class="setting-block">
          <h2 class="setting-label">Text rendering</h2>
          <div
            class="render-segment"
            role="radiogroup"
            aria-label="Text rendering"
          >
            <button
              type="button"
              class="render-option"
              :class="{ 'is-active': !useMainThreadDraw }"
              role="radio"
              :aria-checked="!useMainThreadDraw"
              @click="useMainThreadDraw = false"
            >
              <span class="render-option-title">Web worker</span>
              <span class="render-option-desc">Faster, more memory</span>
            </button>
            <button
              type="button"
              class="render-option"
              :class="{ 'is-active': useMainThreadDraw }"
              role="radio"
              :aria-checked="useMainThreadDraw"
              @click="useMainThreadDraw = true"
            >
              <span class="render-option-title">Main thread</span>
              <span class="render-option-desc">Slower, less memory</span>
            </button>
          </div>
        </div>

        <div class="setting-block">
          <h2 class="setting-label">Non-plottable layers</h2>
          <div
            class="render-segment"
            role="radiogroup"
            aria-label="Non-plottable layers"
          >
            <button
              type="button"
              class="render-option"
              :class="{ 'is-active': !drawNoPlotLayers }"
              role="radio"
              :aria-checked="!drawNoPlotLayers"
              @click="drawNoPlotLayers = false"
            >
              <span class="render-option-title">Hide</span>
              <span class="render-option-desc">Web viewer default</span>
            </button>
            <button
              type="button"
              class="render-option"
              :class="{ 'is-active': drawNoPlotLayers }"
              role="radio"
              :aria-checked="drawNoPlotLayers"
              @click="drawNoPlotLayers = true"
            >
              <span class="render-option-title">Show</span>
              <span class="render-option-desc">AutoCAD editor semantics</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { UploadFilled } from '@element-plus/icons-vue'
import { AcEdOpenMode } from '@mlightcad/cad-simple-viewer'
import { log } from '@mlightcad/data-model'
import type { UploadFile, UploadProps } from 'element-plus'
import { ElIcon, ElUpload } from 'element-plus'
import { ref } from 'vue'

interface Props {
  onFileSelect: (
    file: File,
    mode: AcEdOpenMode,
    useMainThreadDraw: boolean,
    drawNoPlotLayers: boolean
  ) => void
}

const props = defineProps<Props>()

const selectedMode = ref<AcEdOpenMode>(AcEdOpenMode.Read)
const useMainThreadDraw = ref(false)
const drawNoPlotLayers = ref(false)

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
        drawNoPlotLayers.value
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
  align-items: center;
  width: 100%;
  max-width: 560px;
  padding: 24px;
}

.upload-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  border-radius: 20px;
  background: #ffffff;
  box-shadow:
    0 24px 48px rgba(15, 23, 42, 0.18),
    0 0 0 1px rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.upload-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 36px 32px 8px;
  text-align: center;
}

.upload-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #667eea 0%, #5b6fd6 100%);
  color: #ffffff;
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.35);
}

.upload-title {
  margin: 8px 0 0;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #0f172a;
}

.upload-subtitle {
  margin: 0;
  font-size: 14px;
  color: #64748b;
  line-height: 1.5;
}

.upload-dropzone {
  width: 100%;
  padding: 0 28px;
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
  padding: 28px 20px;
  border: 1.5px dashed #c7d2fe;
  border-radius: 14px;
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
  gap: 6px;
}

.dropzone-title {
  margin: 0;
  font-size: 15px;
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
  gap: 8px;
  margin-top: 10px;
}

.format-tag {
  padding: 3px 10px;
  border-radius: 999px;
  background: #e8edff;
  color: #4f5fd0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 24px;
  padding: 24px 28px 28px;
  background: #f8fafc;
  border-top: 1px solid #e8edf5;
}

.setting-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.setting-label {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}

.mode-segment,
.render-segment {
  display: grid;
  gap: 8px;
}

.mode-segment {
  grid-template-columns: repeat(3, 1fr);
}

.render-segment {
  grid-template-columns: repeat(2, 1fr);
}

.mode-option,
.render-option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 12px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.mode-option:hover,
.render-option:hover {
  border-color: #c7d2fe;
  background: #fafbff;
}

.mode-option.is-active,
.render-option.is-active {
  border-color: #667eea;
  background: #f1f5ff;
  box-shadow: 0 0 0 1px rgba(102, 126, 234, 0.15);
}

.mode-option-title,
.render-option-title {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.mode-option.is-active .mode-option-title,
.render-option.is-active .render-option-title {
  color: #4f5fd0;
}

.mode-option-desc,
.render-option-desc {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.4;
}

.mode-option.is-active .mode-option-desc,
.render-option.is-active .render-option-desc {
  color: #64748b;
}

@media (max-width: 520px) {
  .file-upload-container {
    padding: 16px;
  }

  .upload-hero {
    padding: 28px 20px 8px;
  }

  .upload-dropzone,
  .settings-section {
    padding-left: 20px;
    padding-right: 20px;
  }

  .mode-segment {
    grid-template-columns: 1fr;
  }
}
</style>
