<template>
  <div class="ml-external-references">
    <div class="ml-external-references__toolbar">
      <el-dropdown trigger="click" @command="handleAttachCommand">
        <el-button
          size="small"
          class="ml-external-references__attach-btn"
          :title="t('main.toolPalette.missingResources.attach')"
          :aria-label="t('main.toolPalette.missingResources.attach')"
        >
          <el-icon :size="16"><Paperclip /></el-icon>
          <el-icon :size="12" class="ml-external-references__attach-caret">
            <ArrowDown />
          </el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="dwg">
              {{ t('main.toolPalette.missingResources.attachDwg') }}
            </el-dropdown-item>
            <el-dropdown-item command="image">
              {{ t('main.toolPalette.missingResources.attachImage') }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <div class="ml-external-references__upper">
      <div class="ml-external-references__section-header">
        {{ t('main.toolPalette.missingResources.fileReferences') }}
      </div>
      <el-table
        :data="rows"
        class="ml-external-references__table"
        :empty-text="t('main.toolPalette.missingResources.empty')"
        highlight-current-row
        :current-row-key="selectedKey ?? undefined"
        row-key="key"
        @current-change="handleCurrentChange"
        @row-dblclick="handleRowDblClick"
      >
        <el-table-column
          prop="name"
          :label="t('main.toolPalette.missingResources.name')"
          min-width="100"
          show-overflow-tooltip
        />
        <el-table-column
          prop="statusLabel"
          :label="t('main.toolPalette.missingResources.status')"
          width="88"
        >
          <template #default="{ row }">
            <span
              class="ml-external-references__status"
              :class="
                row.status === 'loaded'
                  ? 'ml-external-references__status--loaded'
                  : 'ml-external-references__status--missing'
              "
            >
              {{ row.statusLabel }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          prop="typeLabel"
          :label="t('main.toolPalette.missingResources.type')"
          width="88"
          show-overflow-tooltip
        />
        <el-table-column
          :label="t('main.toolPalette.missingResources.actions')"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            <div class="ml-external-references__cell-actions">
              <template v-if="row.kind === 'xref' && row.overlayId">
                <el-checkbox
                  :model-value="row.visible"
                  :aria-label="t('main.toolPalette.missingResources.visible')"
                  @change="(v: CheckboxValueType) => handleXrefVisibility(row, v)"
                />
                <el-button
                  link
                  type="danger"
                  size="small"
                  @click="handleUnloadXref(row)"
                >
                  {{ t('main.toolPalette.missingResources.unload') }}
                </el-button>
              </template>
              <template v-else-if="row.kind === 'xref'">
                <el-button
                  link
                  type="primary"
                  size="small"
                  :title="t('main.toolPalette.missingResources.browse')"
                  @click="handleBrowseXref(row)"
                >
                  ...
                </el-button>
                <el-button
                  link
                  type="primary"
                  size="small"
                  @click="handleUrlXref(row)"
                >
                  {{ t('main.toolPalette.missingResources.fromUrl') }}
                </el-button>
              </template>
              <template v-else-if="row.kind === 'image'">
                <el-tooltip
                  v-if="row.replacementName"
                  :content="row.foundAt"
                  placement="top"
                  :show-after="2000"
                >
                  <span
                    class="ml-external-references__replace-name"
                    @click.stop="handleBrowseImage(row)"
                  >
                    {{ row.replacementName }}
                  </span>
                </el-tooltip>
                <el-button
                  v-else
                  link
                  type="primary"
                  size="small"
                  :title="t('main.toolPalette.missingResources.replace')"
                  @click.stop="handleBrowseImage(row)"
                >
                  ...
                </el-button>
              </template>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <button
      type="button"
      class="ml-external-references__splitter"
      :aria-expanded="detailsExpanded"
      :title="
        detailsExpanded
          ? t('main.toolPalette.missingResources.collapseDetails')
          : t('main.toolPalette.missingResources.expandDetails')
      "
      @click="detailsExpanded = !detailsExpanded"
    >
      <span class="ml-external-references__splitter-dots" aria-hidden="true" />
    </button>

    <div
      v-show="detailsExpanded"
      class="ml-external-references__lower"
    >
      <div class="ml-external-references__section-header">
        {{ t('main.toolPalette.missingResources.details') }}
      </div>
      <div v-if="selectedRow" class="ml-external-references__details">
        <div class="ml-external-references__detail-row">
          <span class="ml-external-references__detail-label">
            {{ t('main.toolPalette.missingResources.name') }}
          </span>
          <span class="ml-external-references__detail-value">
            {{ selectedRow.name }}
          </span>
        </div>
        <div class="ml-external-references__detail-row">
          <span class="ml-external-references__detail-label">
            {{ t('main.toolPalette.missingResources.status') }}
          </span>
          <span class="ml-external-references__detail-value">
            {{ selectedRow.statusLabel }}
          </span>
        </div>
        <div class="ml-external-references__detail-row">
          <span class="ml-external-references__detail-label">
            {{ t('main.toolPalette.missingResources.type') }}
          </span>
          <span class="ml-external-references__detail-value">
            {{ selectedRow.typeLabel }}
          </span>
        </div>
        <div class="ml-external-references__detail-row">
          <span class="ml-external-references__detail-label">
            {{ t('main.toolPalette.missingResources.foundAt') }}
          </span>
          <span
            class="ml-external-references__detail-value"
            :title="selectedRow.foundAt"
          >
            {{ selectedRow.foundAt || '—' }}
          </span>
        </div>
      </div>
      <div v-else class="ml-external-references__details-empty">
        {{ t('main.toolPalette.missingResources.selectReference') }}
      </div>
    </div>

    <input
      ref="xrefFileInput"
      type="file"
      accept=".dwg,.dxf"
      style="display: none"
      @change="handleXrefFileChange"
    />
    <input
      ref="imageFileInput"
      type="file"
      accept=".png,.jpg,.jpeg,.bmp,.gif,.tif,.tiff"
      style="display: none"
      @change="handleImageFileChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, Paperclip } from '@element-plus/icons-vue'
import {
  AcApDocManager,
  acapRunDatabaseEdit,
  AcApXrefManager,
  eventBus
} from '@mlightcad/cad-simple-viewer'
import { AcDbRasterImage } from '@mlightcad/data-model'
import {
  type CheckboxValueType,
  ElButton,
  ElCheckbox,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElIcon,
  ElMessageBox,
  ElTable,
  ElTableColumn,
  ElTooltip
} from 'element-plus'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  type ImageMappingData,
  useMissedData,
  type XrefOverlayState
} from '../../composable'
const { t } = useI18n()
const { images: imageTableData, xrefs, xrefOverlays } = useMissedData()

const xrefFileInput = ref<HTMLInputElement | null>(null)
const imageFileInput = ref<HTMLInputElement | null>(null)
const pendingXrefName = ref<string | null>(null)
const pendingImageRow = ref<ImageMappingData | null>(null)
const detailsExpanded = ref(true)
const selectedKey = ref<string | null>(null)

type RefKind = 'xref' | 'image'

interface ExternalRefRow {
  key: string
  kind: RefKind
  name: string
  status: 'missing' | 'loaded'
  statusLabel: string
  typeLabel: string
  foundAt: string
  /** Xref fields */
  pathName?: string
  isOverlay?: boolean
  overlayId?: string
  visible?: boolean
  /** Image fields */
  imageData?: ImageMappingData
  replacementName?: string
}

const fileNameFromPath = (path: string) => {
  const parts = path.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || path
}

const rows = computed<ExternalRefRow[]>(() => {
  const result: ExternalRefRow[] = []
  const xrefNames = new Set(xrefs.map(x => x.name))

  for (const image of imageTableData.values()) {
    const replaced = !!image.file
    // Found At = replacement file name only (not the original missing name).
    const foundAt = replaced
      ? image.filePath?.trim() || image.file!.name
      : ''
    result.push({
      key: `image:${image.fileName}`,
      kind: 'image',
      name: image.fileName,
      status: replaced ? 'loaded' : 'missing',
      statusLabel: replaced
        ? t('main.toolPalette.missingResources.statusLoaded')
        : t('main.toolPalette.missingResources.statusMissing'),
      typeLabel: t('main.toolPalette.missingResources.typeImage'),
      foundAt,
      imageData: image,
      replacementName: image.file?.name
    })
  }

  for (const xref of xrefs) {
    const state = xrefOverlays.get(xref.name)
    const loaded = !!state?.overlayId
    // Found At = loaded/replacement source path only.
    const foundAt = loaded ? state?.sourceName?.trim() || '' : ''
    result.push({
      key: `xref:${xref.name}`,
      kind: 'xref',
      name: xref.name,
      status: loaded ? 'loaded' : 'missing',
      statusLabel: loaded
        ? t('main.toolPalette.missingResources.statusLoaded')
        : t('main.toolPalette.missingResources.statusMissing'),
      typeLabel: xref.isOverlay
        ? t('main.toolPalette.missingResources.typeOverlay')
        : t('main.toolPalette.missingResources.typeAttach'),
      foundAt,
      pathName: xref.pathName,
      isOverlay: xref.isOverlay,
      overlayId: state?.overlayId,
      visible: state?.visible ?? true
    })
  }

  // Overlays attached via the toolbar that are not unresolved xrefs.
  for (const [name, state] of xrefOverlays) {
    if (xrefNames.has(name) || !state.overlayId) continue
    result.push({
      key: `xref:${name}`,
      kind: 'xref',
      name,
      status: 'loaded',
      statusLabel: t('main.toolPalette.missingResources.statusLoaded'),
      typeLabel: t('main.toolPalette.missingResources.typeAttach'),
      foundAt: state.sourceName?.trim() || '',
      pathName: state.sourceName,
      isOverlay: false,
      overlayId: state.overlayId,
      visible: state.visible
    })
  }

  return result
})

const selectedRow = computed(() => {
  if (!selectedKey.value) return null
  return rows.value.find(row => row.key === selectedKey.value) ?? null
})

watch(
  rows,
  list => {
    if (list.length === 0) {
      selectedKey.value = null
      return
    }
    if (!selectedKey.value || !list.some(row => row.key === selectedKey.value)) {
      selectedKey.value = list[0].key
    }
  },
  { immediate: true }
)

const handleCurrentChange = (row: ExternalRefRow | undefined) => {
  selectedKey.value = row?.key ?? null
}

const handleRowDblClick = (row: ExternalRefRow) => {
  if (row.kind === 'image') {
    handleBrowseImage(row)
  } else if (row.kind === 'xref' && !row.overlayId) {
    handleBrowseXref(row)
  }
}

const setOverlayState = (name: string, state: XrefOverlayState | undefined) => {
  if (state) {
    xrefOverlays.set(name, state)
  } else {
    xrefOverlays.delete(name)
  }
}

const loadBufferAsOverlay = async (
  xrefName: string,
  fileName: string,
  buffer: ArrayBuffer,
  sourcePath?: string
) => {
  try {
    const session = await AcApXrefManager.instance.attachOverlay({
      blockName: xrefName,
      fileName,
      content: buffer,
      sourcePath: sourcePath?.trim() || fileName
    })
    setOverlayState(xrefName, {
      overlayId: session.overlayId,
      visible: session.visible,
      sourceName: session.sourcePath
    })
    selectedKey.value = `xref:${xrefName}`
    eventBus.emit('missed-data-changed', {})
  } catch (error) {
    eventBus.emit('message', {
      message: t('main.toolPalette.missingResources.loadFailed', {
        name: xrefName
      }),
      type: 'error'
    })
    throw error
  }
}

const handleAttachCommand = (command: string | number) => {
  if (command === 'dwg') {
    // XATTACH (XA): file picker → insertion point → scale → rotation
    AcApDocManager.instance.sendStringToExecute('xattach')
  } else if (command === 'image') {
    pendingImageRow.value = null
    // IMAGEATTACH (IAT): file picker → insertion point → scale → rotation
    AcApDocManager.instance.sendStringToExecute('imageattach')
  }
}

const handleBrowseXref = (row: ExternalRefRow) => {
  pendingXrefName.value = row.name
  xrefFileInput.value?.click()
}

const handleBrowseImage = (row: ExternalRefRow) => {
  if (!row.imageData) return
  pendingImageRow.value = row.imageData
  imageFileInput.value?.click()
}

const handleXrefFileChange = async () => {
  const file = xrefFileInput.value?.files?.[0]
  const xrefName = pendingXrefName.value
  pendingXrefName.value = null
  if (xrefFileInput.value) {
    xrefFileInput.value.value = ''
  }
  if (!file) return

  const name = xrefName || file.name.replace(/\.(dwg|dxf)$/i, '') || file.name
  try {
    const buffer = await file.arrayBuffer()
    await loadBufferAsOverlay(name, file.name, buffer, file.name)
  } catch {
    // Error already reported
  }
}

const applyImageReplacement = (item: ImageMappingData, file: File) => {
  const db = AcApDocManager.instance.curDocument.database
  const fileName = file.name
  let replaced = false
  acapRunDatabaseEdit(db, 'Replace Image', () => {
    item.ids.forEach(id => {
      const image = db.openEntityForWrite(id) as AcDbRasterImage | undefined
      if (!image) return
      image.image = file
      // Persist replacement file name on the image definition when present.
      if (image.imageDefId) {
        const imageDef = db.objects.imageDefinition.getIdAt(image.imageDefId)
        if (imageDef) {
          imageDef.sourceFileName = fileName
        }
      }
      replaced = true
    })
  })
  if (!replaced) return
  item.file = file
  item.filePath = fileName
  eventBus.emit('missed-data-changed', {})
  eventBus.emit('message', {
    message: t('main.toolPalette.missingResources.applyDone'),
    type: 'success'
  })
  void nextTick(() => {
    const match = rows.value.find(
      row =>
        row.kind === 'image' &&
        (row.foundAt === fileName || row.imageData?.file === file)
    )
    if (match) selectedKey.value = match.key
  })
}

const handleImageFileChange = async () => {
  const file = imageFileInput.value?.files?.[0]
  const row = pendingImageRow.value
  pendingImageRow.value = null
  if (imageFileInput.value) {
    imageFileInput.value.value = ''
  }
  if (!file || !row) return

  applyImageReplacement(row, file)
}

const handleUrlXref = async (row: ExternalRefRow) => {
  try {
    const { value } = await ElMessageBox.prompt(
      t('main.toolPalette.missingResources.urlPrompt'),
      t('main.toolPalette.missingResources.fromUrl'),
      {
        inputValue: row.pathName?.startsWith('http') ? row.pathName : '',
        inputPlaceholder: 'https://...',
        confirmButtonText: t('main.toolPalette.missingResources.load'),
        cancelButtonText: t('dialog.baseDialog.cancel'),
        inputValidator: value => {
          if (!value?.trim()) {
            return t('main.toolPalette.missingResources.urlRequired')
          }
          return true
        }
      }
    )
    const url = value.trim()
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const buffer = await response.arrayBuffer()
    const fileName =
      fileNameFromPath(new URL(url).pathname) ||
      fileNameFromPath(row.pathName || '') ||
      `${row.name}.dwg`
    await loadBufferAsOverlay(row.name, fileName, buffer, url)
  } catch (error) {
    if (
      error === 'cancel' ||
      (error as { action?: string })?.action === 'cancel'
    ) {
      return
    }
    eventBus.emit('message', {
      message: t('main.toolPalette.missingResources.loadFailed', {
        name: row.name
      }),
      type: 'error'
    })
  }
}

const handleXrefVisibility = (row: ExternalRefRow, value: CheckboxValueType) => {
  if (!row.overlayId) return
  const visible = value === true
  AcApXrefManager.instance.setVisibleByBlockName(row.name, visible)
  const state = xrefOverlays.get(row.name)
  if (state) {
    state.visible = visible
  }
}

const handleUnloadXref = (row: ExternalRefRow) => {
  if (!row.overlayId) return
  AcApXrefManager.instance.unloadByBlockName(row.name)
  setOverlayState(row.name, undefined)
  eventBus.emit('missed-data-changed', {})
}
</script>

<style scoped>
.ml-external-references {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.ml-external-references__toolbar {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 4px;
  padding: 4px 8px;
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
}

.ml-external-references__attach-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
}

.ml-external-references__attach-caret {
  margin-left: 0;
  opacity: 0.75;
}

.ml-external-references__upper {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 120px;
  overflow: hidden;
}

.ml-external-references__section-header {
  flex: 0 0 auto;
  padding: 6px 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
  background: var(--el-fill-color-light, rgba(0, 0, 0, 0.04));
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
}

.ml-external-references__table {
  width: 100%;
  flex: 1;
  min-height: 0;
}

.ml-external-references__table :deep(.el-table__empty-text) {
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
  white-space: normal;
  padding: 0 8px;
}

.ml-external-references__cell-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 0;
  flex-wrap: wrap;
}

.ml-external-references__replace-name {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-color-primary, #409eff);
  cursor: pointer;
  vertical-align: middle;
}

.ml-external-references__status {
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.ml-external-references__status--missing {
  color: var(--el-color-warning);
}

.ml-external-references__status--loaded {
  color: var(--el-color-success);
}

.ml-external-references__splitter {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 10px;
  margin: 0;
  padding: 0;
  border: none;
  border-top: 1px solid var(--el-border-color, #dcdfe6);
  border-bottom: 1px solid var(--el-border-color, #dcdfe6);
  background: var(--el-fill-color-light, rgba(0, 0, 0, 0.04));
  cursor: pointer;
}

.ml-external-references__splitter:hover {
  background: var(--el-fill-color, rgba(0, 0, 0, 0.06));
}

.ml-external-references__splitter-dots {
  width: 28px;
  height: 4px;
  border-radius: 2px;
  background: radial-gradient(
    circle,
    var(--el-text-color-secondary, #909399) 1.25px,
    transparent 1.35px
  );
  background-size: 6px 4px;
  background-repeat: repeat-x;
  background-position: center;
}

.ml-external-references__lower {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
  overflow: hidden;
}

.ml-external-references__details {
  flex: 0 0 auto;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ml-external-references__details-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.ml-external-references__detail-row {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 8px;
  align-items: start;
  line-height: 1.4;
}

.ml-external-references__detail-label {
  color: var(--el-text-color-secondary, #909399);
}

.ml-external-references__detail-value {
  min-width: 0;
  word-break: break-all;
  color: var(--el-text-color-primary, #303133);
}
</style>
