<template>
  <div class="ml-external-references">
    <el-table
      :data="rows"
      class="ml-missing-resources__table"
      :empty-text="t('main.toolPalette.missingResources.empty')"
    >
      <el-table-column
        prop="name"
        :label="t('main.toolPalette.missingResources.name')"
        min-width="100"
        show-overflow-tooltip
      />
      <el-table-column
        prop="pathName"
        :label="t('main.toolPalette.missingResources.path')"
        min-width="120"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          {{ row.pathName || '—' }}
        </template>
      </el-table-column>
      <el-table-column
        prop="status"
        :label="t('main.toolPalette.missingResources.status')"
        width="88"
      >
        <template #default="{ row }">
          <span
            class="ml-external-references__status"
            :class="
              row.overlayId
                ? 'ml-external-references__status--loaded'
                : 'ml-external-references__status--missing'
            "
          >
            {{
              row.overlayId
                ? t('main.toolPalette.missingResources.statusLoaded')
                : t('main.toolPalette.missingResources.statusMissing')
            }}
          </span>
        </template>
      </el-table-column>
      <el-table-column
        :label="t('main.toolPalette.missingResources.actions')"
        width="120"
        align="center"
      >
        <template #default="{ row }">
          <div class="ml-missing-resources__cell-actions">
            <template v-if="row.overlayId">
              <el-checkbox
                :model-value="row.visible"
                :aria-label="t('main.toolPalette.missingResources.visible')"
                @change="(v: CheckboxValueType) => handleVisibility(row, v)"
              />
              <el-button
                link
                type="danger"
                size="small"
                @click="handleUnload(row)"
              >
                {{ t('main.toolPalette.missingResources.unload') }}
              </el-button>
            </template>
            <template v-else>
              <el-button
                link
                type="primary"
                size="small"
                :title="t('main.toolPalette.missingResources.browse')"
                @click="handleBrowse(row)"
              >
                ...
              </el-button>
              <el-button
                link
                type="primary"
                size="small"
                @click="handleUrl(row)"
              >
                {{ t('main.toolPalette.missingResources.fromUrl') }}
              </el-button>
            </template>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <input
      ref="fileInput"
      type="file"
      accept=".dwg,.dxf"
      style="display: none"
      @change="handleFileChange"
    />
  </div>
</template>

<script setup lang="ts">
import { AcApDocManager, eventBus } from '@mlightcad/cad-simple-viewer'
import {
  ElButton,
  ElCheckbox,
  ElMessageBox,
  ElTable,
  ElTableColumn,
  type CheckboxValueType
} from 'element-plus'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useMissedData, type XrefOverlayState } from '../../composable'

const { t } = useI18n()
const { xrefs, xrefOverlays } = useMissedData()

const fileInput = ref<HTMLInputElement | null>(null)
const pendingXrefName = ref<string | null>(null)

interface XrefRow {
  name: string
  pathName: string
  isOverlay: boolean
  overlayId?: string
  visible: boolean
}

const rows = computed<XrefRow[]>(() => {
  return xrefs.map(xref => {
    const state = xrefOverlays.get(xref.name)
    return {
      name: xref.name,
      pathName: xref.pathName,
      isOverlay: xref.isOverlay,
      overlayId: state?.overlayId,
      visible: state?.visible ?? true
    }
  })
})

const fileNameFromPath = (path: string) => {
  const parts = path.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || path
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
  buffer: ArrayBuffer
) => {
  try {
    const existing = xrefOverlays.get(xrefName)
    if (existing?.overlayId) {
      AcApDocManager.instance.removeOverlay(existing.overlayId)
    }
    const overlayId = await AcApDocManager.instance.loadOverlay(fileName, buffer)
    setOverlayState(xrefName, {
      overlayId,
      visible: true,
      sourceName: fileName
    })
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

const handleBrowse = (row: XrefRow) => {
  pendingXrefName.value = row.name
  fileInput.value?.click()
}

const handleFileChange = async () => {
  const file = fileInput.value?.files?.[0]
  const xrefName = pendingXrefName.value
  pendingXrefName.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
  if (!file || !xrefName) return

  try {
    const buffer = await file.arrayBuffer()
    await loadBufferAsOverlay(xrefName, file.name, buffer)
  } catch {
    // Error already reported
  }
}

const handleUrl = async (row: XrefRow) => {
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
      fileNameFromPath(row.pathName) ||
      `${row.name}.dwg`
    await loadBufferAsOverlay(row.name, fileName, buffer)
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

const handleVisibility = (row: XrefRow, value: CheckboxValueType) => {
  if (!row.overlayId) return
  const visible = value === true
  AcApDocManager.instance.setOverlayVisible(row.overlayId, visible)
  const state = xrefOverlays.get(row.name)
  if (state) {
    state.visible = visible
  }
}

const handleUnload = (row: XrefRow) => {
  if (!row.overlayId) return
  AcApDocManager.instance.removeOverlay(row.overlayId)
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

.ml-missing-resources__table {
  width: 100%;
  flex: 1;
  min-height: 0;
}

.ml-missing-resources__table :deep(.el-table__empty-text) {
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
  white-space: normal;
  padding: 0 8px;
}

.ml-missing-resources__cell-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 0;
  flex-wrap: wrap;
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
</style>
