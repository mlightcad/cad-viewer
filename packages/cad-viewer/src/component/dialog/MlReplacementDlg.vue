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
                <el-select
                  :model-value="mappedFont"
                  :placeholder="t('dialog.replacementDlg.selectFont')"
                  @update:model-value="
                    (value: string) => updateMappedFont(missedFont, value)
                  "
                  style="width: 100%"
                >
                  <el-option
                    v-for="replacement in getReplacementFontsFor(missedFont)"
                    :key="replacement"
                    :label="replacement"
                    :value="replacement"
                  />
                </el-select>
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
              <el-select
                :model-value="mappedFont"
                :placeholder="t('dialog.replacementDlg.selectFont')"
                @update:model-value="
                  (value: string) => updateMappedFont(missedFont, value)
                "
                style="width: 100%"
              >
                <el-option
                  v-for="replacement in getReplacementFontsFor(missedFont)"
                  :key="replacement"
                  :label="replacement"
                  :value="replacement"
                />
              </el-select>
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
    </div>
  </ml-base-dialog>
</template>

<script lang="ts" setup>
import {
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
const availableFontInfos = ref<AcDbFontInfo[]>([])
const matchFontType = ref(true)
const pendingImageRow = ref<ImageMappingData | null>(null)

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

const getReplacementFontsFor = (missedFont: string): string[] => {
  const fonts = availableFontInfos.value
  if (!matchFontType.value) {
    return fonts.map(font => font.name[0])
  }

  const targetType = getMissedFontType(missedFont)
  if (!targetType) {
    return fonts.map(font => font.name[0])
  }

  return fonts
    .filter(font => font.type === targetType)
    .map(font => font.name[0])
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
</style>
