<template>
  <div class="file-upload-container">
    <el-upload
      class="upload-demo"
      drag
      :auto-upload="false"
      accept=".dwg,.dxf"
      :on-change="handleFileChange"
      :before-upload="beforeUpload"
    >
      <el-icon class="el-icon--upload" size="64">
        <UploadFilled />
      </el-icon>
      <div class="el-upload__text">
        <h2 class="upload-title">Select CAD File to View</h2>
        <p class="upload-description">
          Drop file here or <em>click to select</em>
        </p>
        <div>
          <el-radio-group v-model="selectedMode" class="mode-radio-group">
            <el-radio :label="0" border>Read</el-radio>
            <el-radio :label="4" border>Review</el-radio>
            <el-radio :label="8" border>Write</el-radio>
          </el-radio-group>
          <div class="mode-description">
            <p v-if="selectedMode === 0" class="mode-info">
              <strong>Read:</strong> View-only access
            </p>
            <p v-else-if="selectedMode === 4" class="mode-info">
              <strong>Review:</strong> View and review access
            </p>
            <p v-else-if="selectedMode === 8" class="mode-info">
              <strong>Write:</strong> Full read/write access
            </p>
          </div>
        </div>
      </div>
      <template #tip>
        <div class="el-upload__tip">Supported formats: DWG, DXF</div>
      </template>
    </el-upload>
  </div>
</template>

<script setup lang="ts">
import { UploadFilled } from '@element-plus/icons-vue'
import { AcEdOpenMode } from '@mlightcad/cad-simple-viewer'
import type { UploadFile, UploadProps } from 'element-plus'
import { ref } from 'vue'

interface Props {
  onFileSelect: (file: File, mode: AcEdOpenMode) => void
}

const props = defineProps<Props>()

const selectedMode = ref<AcEdOpenMode>(AcEdOpenMode.Write)

const handleFileChange: UploadProps['onChange'] = (uploadFile: UploadFile) => {
  if (uploadFile.raw) {
    if (isValidFile(uploadFile.raw)) {
      props.onFileSelect(uploadFile.raw, selectedMode.value)
    }
  }
}

const beforeUpload: UploadProps['beforeUpload'] = (rawFile: File) => {
  if (!isValidFile(rawFile)) {
    console.warn('Invalid file type. Please upload DWG or DXF files.')
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
  flex-direction: column;
  justify-content: center;
  align-items: center;
  max-width: 500px;
  width: 100%;
  height: 100%;
}

.upload-demo :deep(.el-upload) {
  border: 3px dashed #d9d9d9;
  border-radius: 16px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  background: white;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

.upload-demo :deep(.el-upload:hover) {
  border-color: #409eff;
  transform: translateY(-4px);
  box-shadow: 0 16px 50px rgba(0, 0, 0, 0.4);
}

.upload-demo :deep(.el-upload-dragger) {
  width: 100%;
  height: auto;
  padding: 60px 50px;
  background: transparent;
  border: none;
  border-radius: 16px;
}

.upload-demo :deep(.el-upload-dragger:hover) {
  background: transparent;
}

.el-icon--upload {
  color: #409eff;
  margin-bottom: 16px;
}

.el-upload__text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.upload-title {
  margin: 0;
  font-size: 32px;
  font-weight: 600;
  color: #303133;
}

.upload-description {
  margin: 0;
  font-size: 18px;
  color: #606266;
  line-height: 1.5;
}

.upload-description em {
  color: #409eff;
  font-style: normal;
  font-weight: 600;
}

.el-upload__tip {
  margin-top: 16px;
  font-size: 14px;
  color: #ffffff;
  text-align: center;
}

.mode-radio-group {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.mode-radio-group :deep(.el-radio) {
  margin-right: 0;
  margin-bottom: 0;
}

.mode-description {
  margin-top: 12px;
}

.mode-info {
  margin: 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

.mode-info strong {
  color: #409eff;
  font-weight: 600;
}
</style>
