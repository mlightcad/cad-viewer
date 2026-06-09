<template>
  <ml-base-dialog
    :title="t('dialog.replacementDlg.title')"
    :width="480"
    v-model="dialogVisible"
    name="ReplacementDlg"
    @ok="handleConfirm"
    @open="handleOpen"
  >
    <div class="ml-replacement-dlg">
      <el-tabs
        v-if="showTabs"
        v-model="activeTab"
        class="ml-replacement-dlg__tabs"
      >
        <el-tab-pane
          v-if="fontMapping.size > 0"
          :label="t('dialog.replacementDlg.fontTabName')"
          name="font"
        >
          <div class="ml-replacement-dlg__font-panel">
            <el-checkbox
              v-model="matchFontType"
              class="ml-replacement-dlg__option"
            >
              {{ t('dialog.replacementDlg.matchFontType') }}
            </el-checkbox>
            <div class="ml-replacement-dlg__font-grid">
              <div
                class="ml-replacement-dlg__font-row ml-replacement-dlg__font-row--header"
              >
                <span>{{ t('dialog.replacementDlg.missedFont') }}</span>
                <span>{{ t('dialog.replacementDlg.replacedFont') }}</span>
              </div>
              <div
                v-for="[missedFont, mappedFont] in fontMapping"
                :key="missedFont"
                class="ml-replacement-dlg__font-row"
              >
                <span
                  class="ml-replacement-dlg__missed-font"
                  :title="missedFont"
                >
                  {{ missedFont }}
                </span>
                <div class="ml-replacement-dlg__font-select">
                  <el-select
                    :model-value="mappedFont"
                    :placeholder="t('dialog.replacementDlg.selectFont')"
                    @update:model-value="
                      (value: string) => updateMappedFont(missedFont, value)
                    "
                  >
                    <el-option
                      v-for="replacement in getReplacementFontsFor(missedFont)"
                      :key="replacement"
                      :label="replacement"
                      :value="replacement"
                    />
                  </el-select>
                  <el-button
                    link
                    type="primary"
                    size="small"
                    :title="t('dialog.replacementDlg.selectLocalFont')"
                    @click="handleSelectLocalFont(missedFont)"
                  >
                    ...
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>
        <el-tab-pane
          v-if="imageTableData.size > 0"
          :label="t('dialog.replacementDlg.imageTabName')"
          name="image"
        >
          <div class="ml-replacement-dlg__image-panel">
            <el-table
              :data="Array.from(imageTableData.values())"
              style="width: 100%"
            >
              <el-table-column
                :label="t('dialog.replacementDlg.file')"
                prop="fileName"
                :min-width="0"
              />
              <el-table-column
                :label="t('dialog.replacementDlg.replace')"
                fixed="right"
                width="60"
              >
                <template #default="{ row }">
                  <el-button
                    link
                    type="primary"
                    size="small"
                    @click="handleSelectImage(row)"
                  >
                    ...
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>

      <template v-else>
        <div v-if="fontMapping.size > 0" class="ml-replacement-dlg__font-panel">
          <el-checkbox
            v-model="matchFontType"
            class="ml-replacement-dlg__option"
          >
            {{ t('dialog.replacementDlg.matchFontType') }}
          </el-checkbox>
          <div class="ml-replacement-dlg__font-grid">
            <div
              class="ml-replacement-dlg__font-row ml-replacement-dlg__font-row--header"
            >
              <span>{{ t('dialog.replacementDlg.missedFont') }}</span>
              <span>{{ t('dialog.replacementDlg.replacedFont') }}</span>
            </div>
            <div
              v-for="[missedFont, mappedFont] in fontMapping"
              :key="missedFont"
              class="ml-replacement-dlg__font-row"
            >
              <span class="ml-replacement-dlg__missed-font" :title="missedFont">
                {{ missedFont }}
              </span>
              <div class="ml-replacement-dlg__font-select">
                <el-select
                  :model-value="mappedFont"
                  :placeholder="t('dialog.replacementDlg.selectFont')"
                  @update:model-value="
                    (value: string) => updateMappedFont(missedFont, value)
                  "
                >
                  <el-option
                    v-for="replacement in getReplacementFontsFor(missedFont)"
                    :key="replacement"
                    :label="replacement"
                    :value="replacement"
                  />
                </el-select>
                <el-button
                  link
                  type="primary"
                  size="small"
                  :title="t('dialog.replacementDlg.selectLocalFont')"
                  @click="handleSelectLocalFont(missedFont)"
                >
                  ...
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="ml-replacement-dlg__image-panel">
          <el-table
            :data="Array.from(imageTableData.values())"
            style="width: 100%"
          >
            <el-table-column
              :label="t('dialog.replacementDlg.file')"
              prop="fileName"
              :min-width="0"
            />
            <el-table-column
              :label="t('dialog.replacementDlg.replace')"
              fixed="right"
              width="60"
            >
              <template #default="{ row }">
                <el-button
                  link
                  type="primary"
                  size="small"
                  @click="handleSelectImage(row)"
                >
                  ...
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </template>

      <input
        type="file"
        ref="fileInput"
        accept=".png,.jpg,.jpeg"
        @change="handleFileChange"
        style="display: none"
      />
      <input
        type="file"
        ref="fontFileInput"
        accept=".shx,.ttf,.otf,.woff"
        @change="handleFontFileChange"
        style="display: none"
      />
    </div>
  </ml-base-dialog>
</template>

<script lang="ts" setup>
import {
  AcApCacheFontCmd,
  AcApDocManager,
  AcApFontUtil,
  AcApSettingManager,
  eventBus
} from '@mlightcad/cad-simple-viewer'
import { AcDbFontInfo, AcDbRasterImage } from '@mlightcad/data-model'
import {
  ElButton,
  ElCheckbox,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTabPane,
  ElTabs
} from 'element-plus'
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { ImageMappingData, useMissedData } from '../../composable'
import MlBaseDialog from '../common/MlBaseDialog.vue'

const { t } = useI18n()
const { fonts: fontMapping, images: imageTableData } = useMissedData()
const dialogVisible = ref(true)

const showTabs = computed(() => fontMapping.size > 0 && imageTableData.size > 0)
const activeTab = ref('font')
const fileInput = ref<HTMLInputElement | null>(null)
const fontFileInput = ref<HTMLInputElement | null>(null)
const availableFontInfos = ref<AcDbFontInfo[]>([])
const matchFontType = ref(true)
const pendingImageRow = ref<ImageMappingData | null>(null)
const pendingFontMissed = ref<string | null>(null)

interface LocalCachedFont {
  name: string
  type: 'shx' | 'mesh'
}

const localCachedFonts = ref<LocalCachedFont[]>([])

watch(
  showTabs,
  hasTabs => {
    if (!hasTabs) {
      activeTab.value = fontMapping.size > 0 ? 'font' : 'image'
    }
  },
  { immediate: true }
)

watch(matchFontType, enabled => {
  if (!enabled) return

  fontMapping.forEach((mappedFont, missedFont) => {
    if (!mappedFont) return
    const options = getReplacementFontsFor(missedFont)
    if (!options.includes(mappedFont)) {
      fontMapping.set(missedFont, '')
    }
  })
})

const handleOpen = () => {
  availableFontInfos.value = AcApDocManager.instance.avaiableFonts
}

const getMissedFontType = (missedFont: string): 'shx' | 'mesh' | undefined => {
  return (
    AcApFontUtil.getCatalogFontType(missedFont) ??
    AcApFontUtil.getFontType(missedFont)
  )
}

const addLocalCachedFont = (fontName: string) => {
  const type = AcApFontUtil.getFontType(fontName)
  if (!type) return
  if (localCachedFonts.value.some(font => font.name === fontName)) return
  localCachedFonts.value.push({ name: fontName, type })
}

const getReplacementFontsFor = (missedFont: string): string[] => {
  const remoteFonts = availableFontInfos.value
  let remoteNames: string[]
  if (!matchFontType.value) {
    remoteNames = remoteFonts.map(font => font.name[0])
  } else {
    const targetType = getMissedFontType(missedFont)
    remoteNames = targetType
      ? remoteFonts
          .filter(font => font.type === targetType)
          .map(font => font.name[0])
      : remoteFonts.map(font => font.name[0])
  }

  const localNames = localCachedFonts.value
    .filter(font => {
      if (!matchFontType.value) return true
      const targetType = getMissedFontType(missedFont)
      return !targetType || font.type === targetType
    })
    .map(font => font.name)

  return [...new Set([...localNames, ...remoteNames])]
}

const handleConfirm = async () => {
  const docManager = AcApDocManager.instance
  const db = docManager.curDocument.database
  let replacedImage = false
  imageTableData.forEach(item => {
    if (item.file) {
      item.ids.forEach(id => {
        const image = db.tables.blockTable.modelSpace.getIdAt(
          id
        ) as AcDbRasterImage
        image.image = item.file
        image.triggerModifiedEvent()
        replacedImage = true
      })
    }
  })

  const settingManager = AcApSettingManager.instance
  const nextFontMapping = { ...settingManager.fontMapping }
  const fontsToLoad = new Set<string>()
  let replacedFont = false

  fontMapping.forEach((mappedFont, missedFont) => {
    const originalFont = missedFont.trim()
    const replacementFont = mappedFont.trim()

    if (originalFont && replacementFont) {
      nextFontMapping[originalFont] = replacementFont
      fontsToLoad.add(replacementFont)
      replacedFont = true
    }
  })

  if (replacedFont) {
    settingManager.fontMapping = nextFontMapping
    docManager.curView.renderer.setFontMapping(nextFontMapping)

    try {
      await docManager.loadFonts([...fontsToLoad])
    } catch {
      // Font loader emits detailed failure notifications; still regenerate.
    }

    docManager.regen()
    await nextTick()
  }

  if (replacedFont || replacedImage) {
    eventBus.emit('missed-data-changed', {})
  }
}

const handleSelectImage = (row: ImageMappingData) => {
  pendingImageRow.value = row
  fileInput.value?.click()
}

const handleFileChange = () => {
  const file = fileInput.value?.files?.[0]
  if (file && pendingImageRow.value) {
    pendingImageRow.value.file = file
  }
  pendingImageRow.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const handleSelectLocalFont = (missedFont: string) => {
  pendingFontMissed.value = missedFont
  fontFileInput.value?.click()
}

const handleFontFileChange = async () => {
  const file = fontFileInput.value?.files?.[0]
  const missedFont = pendingFontMissed.value
  pendingFontMissed.value = null

  if (!file || !missedFont) {
    if (fontFileInput.value) {
      fontFileInput.value.value = ''
    }
    return
  }

  try {
    const status = await AcApCacheFontCmd.cacheFontFile(file, {
      aliases: [missedFont],
      notify: false
    })
    if (status.status === 'Success') {
      addLocalCachedFont(status.fontName)
      fontMapping.set(missedFont, status.fontName)
    } else {
      eventBus.emit('message', {
        message: t('main.message.fontCacheFailed', { fileName: file.name }),
        type: 'error'
      })
    }
  } catch {
    eventBus.emit('message', {
      message: t('main.message.fontCacheFailed', { fileName: file.name }),
      type: 'error'
    })
  }

  if (fontFileInput.value) {
    fontFileInput.value.value = ''
  }
}

const updateMappedFont = (missedFont: string, mappedFont: string) => {
  fontMapping.set(missedFont, mappedFont)
}
</script>

<style scoped>
.ml-replacement-dlg__tabs :deep(.el-tabs__header) {
  margin: 0 0 8px;
}

.ml-replacement-dlg__tabs :deep(.el-tabs__nav-wrap::after) {
  height: 1px;
}

.ml-replacement-dlg__tabs :deep(.el-tabs__item) {
  height: 28px;
  line-height: 28px;
  padding: 0 12px;
  font-size: 12px;
}

.ml-replacement-dlg__option {
  margin-bottom: 8px;
}

.ml-replacement-dlg__font-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ml-replacement-dlg__font-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 12px;
  align-items: center;
}

.ml-replacement-dlg__font-row--header {
  color: var(--el-text-color-secondary);
  font-weight: 600;
  padding-bottom: 2px;
}

.ml-replacement-dlg__missed-font {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ml-replacement-dlg__font-select {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.ml-replacement-dlg__font-select :deep(.el-select) {
  flex: 1;
  min-width: 0;
}
</style>
