<template>
  <div class="ml-missing-resources">
    <div class="ml-missing-resources__tab-list" role="tablist">
      <button
        v-for="tab in subTabs"
        :key="tab.name"
        type="button"
        role="tab"
        class="ml-missing-resources__tab"
        :class="{
          'is-active': store.dialogs.activeMissingResourceTab === tab.name
        }"
        :aria-selected="store.dialogs.activeMissingResourceTab === tab.name"
        @click="selectSubTab(tab.name)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="ml-missing-resources__body">
      <div
        v-if="store.dialogs.activeMissingResourceTab === 'font'"
        class="ml-missing-resources__panel"
      >
        <el-checkbox
          v-if="fontRows.length > 0"
          v-model="matchFontType"
          class="ml-missing-resources__option"
        >
          {{ t('main.toolPalette.missingResources.matchFontType') }}
        </el-checkbox>
        <el-table
          :data="fontRows"
          class="ml-missing-resources__table"
          :empty-text="t('main.toolPalette.missingResources.emptyFonts')"
        >
          <el-table-column
            prop="missedFont"
            :label="t('main.toolPalette.missingResources.missedFont')"
            min-width="100"
            show-overflow-tooltip
          />
          <el-table-column
            :label="t('main.toolPalette.missingResources.replacedFont')"
            min-width="140"
          >
            <template #default="{ row }">
              <div class="ml-missing-resources__cell-actions">
                <el-select
                  :model-value="row.mappedFont"
                  :placeholder="
                    t('main.toolPalette.missingResources.selectFont')
                  "
                  @update:model-value="
                    (value: string) => updateMappedFont(row.missedFont, value)
                  "
                >
                  <el-option
                    v-for="replacement in getReplacementFontsFor(
                      row.missedFont
                    )"
                    :key="replacement"
                    :label="replacement"
                    :value="replacement"
                  />
                </el-select>
                <el-button
                  link
                  type="primary"
                  size="small"
                  :title="
                    t('main.toolPalette.missingResources.selectLocalFont')
                  "
                  @click="handleSelectLocalFont(row.missedFont)"
                >
                  ...
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div
        v-else-if="store.dialogs.activeMissingResourceTab === 'xref'"
        class="ml-missing-resources__panel"
      >
        <ml-external-references />
      </div>
    </div>

    <div v-if="showApplyBar" class="ml-missing-resources__footer">
      <el-button
        type="primary"
        size="small"
        :disabled="!canApply"
        :loading="applying"
        @click="handleApply"
      >
        {{ t('main.toolPalette.missingResources.apply') }}
      </el-button>
    </div>

    <input
      ref="fontFileInput"
      type="file"
      accept=".shx,.ttf,.otf,.woff"
      style="display: none"
      @change="handleFontFileChange"
    />
  </div>
</template>

<script setup lang="ts">
import {
  AcApCacheFontCmd,
  AcApDocManager,
  AcApFontUtil,
  AcApSettingManager,
  eventBus
} from '@mlightcad/cad-simple-viewer'
import { AcDbFontInfo } from '@mlightcad/data-model'
import type { MlOverflowTab } from '@mlightcad/ui-components'
import {
  ElButton,
  ElCheckbox,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn
} from 'element-plus'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { store } from '../../app'
import {
  type MissingResourceTab,
  useMissedData
} from '../../composable'
import MlExternalReferences from './MlExternalReferences.vue'

const { t } = useI18n()
const { fonts: fontMapping, images: imageTableData, xrefs } = useMissedData()

const fontFileInput = ref<HTMLInputElement | null>(null)
const availableFontInfos = ref<AcDbFontInfo[]>([])
const matchFontType = ref(true)
const applying = ref(false)
const pendingFontMissed = ref<string | null>(null)

interface LocalCachedFont {
  name: string
  type: 'shx' | 'mesh'
}

const localCachedFonts = ref<LocalCachedFont[]>([])

const fontRows = computed(() => {
  return Array.from(fontMapping.entries()).map(([missedFont, mappedFont]) => ({
    missedFont,
    mappedFont
  }))
})

const subTabs = computed<MlOverflowTab[]>(() => {
  return [
    {
      name: 'font',
      label: t('main.toolPalette.missingResources.fontTab')
    },
    {
      name: 'xref',
      label: t('main.toolPalette.missingResources.xrefTab')
    }
  ]
})

const selectSubTab = (name: string) => {
  store.dialogs.activeMissingResourceTab = name as MissingResourceTab
}
const showApplyBar = computed(() => {
  return store.dialogs.activeMissingResourceTab === 'font'
})

const canApply = computed(() => {
  for (const [missed, mapped] of fontMapping) {
    if (missed.trim() && mapped.trim()) return true
  }
  return false
})

const refreshAvailableFonts = () => {
  availableFontInfos.value = AcApDocManager.instance.avaiableFonts
}

onMounted(() => {
  refreshAvailableFonts()
})

watch(
  () => store.dialogs.activeMissingResourceTab,
  tab => {
    if (tab === 'font') refreshAvailableFonts()
  }
)

watch(
  [() => fontMapping.size, () => imageTableData.size, () => xrefs.length],
  () => {
    const tab = store.dialogs.activeMissingResourceTab as MissingResourceTab
    const hasXrefs = imageTableData.size > 0 || xrefs.length > 0
    const valid =
      (tab === 'font' && fontMapping.size > 0) ||
      (tab === 'xref' && hasXrefs) ||
      (fontMapping.size === 0 && !hasXrefs)
    if (valid) return
    if (fontMapping.size > 0) {
      store.dialogs.activeMissingResourceTab = 'font'
    } else if (hasXrefs) {
      store.dialogs.activeMissingResourceTab = 'xref'
    }
  }
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

const updateMappedFont = (missedFont: string, mappedFont: string) => {
  fontMapping.set(missedFont, mappedFont)
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

const handleApply = async () => {
  applying.value = true
  try {
    const docManager = AcApDocManager.instance
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

    if (!replacedFont) return

    settingManager.fontMapping = nextFontMapping
    docManager.curView.renderer.setFontMapping(nextFontMapping)
    try {
      await docManager.loadFonts([...fontsToLoad])
    } catch {
      // Font loader emits detailed failure notifications; still regenerate.
    }
    docManager.regen()
    await nextTick()

    eventBus.emit('missed-data-changed', {})
    eventBus.emit('message', {
      message: t('main.toolPalette.missingResources.applyDone'),
      type: 'success'
    })
  } finally {
    applying.value = false
  }
}
</script>

<style scoped>
.ml-missing-resources {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 8px;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.ml-missing-resources__tab-list {
  display: flex;
  flex: 0 0 auto;
  align-items: stretch;
  min-width: 0;
  border-bottom: 1px solid var(--el-border-color, #dcdfe6);
}

.ml-missing-resources__tab {
  flex: 0 0 auto;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--el-text-color-secondary, #606266);
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}

.ml-missing-resources__tab:hover {
  color: var(--el-text-color-primary, #303133);
  background: var(--el-fill-color-light, rgba(0, 0, 0, 0.04));
}

.ml-missing-resources__tab.is-active {
  color: var(--el-text-color-primary, #303133);
  border-bottom-color: var(--el-color-primary, #409eff);
}

.ml-missing-resources__body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ml-missing-resources__panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.ml-missing-resources__option {
  margin: 0;
  flex: 0 0 auto;
  padding: 0 8px;
  align-items: flex-start;
  height: auto;
  white-space: normal;
}

.ml-missing-resources__option :deep(.el-checkbox__label) {
  white-space: normal;
  line-height: 1.4;
  word-break: break-word;
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
  gap: 4px;
  min-width: 0;
}

.ml-missing-resources__cell-actions :deep(.el-select) {
  flex: 1;
  min-width: 0;
}

.ml-missing-resources__footer {
  display: flex;
  justify-content: flex-end;
  flex: 0 0 auto;
  padding: 0 8px 8px;
  border-top: 1px solid var(--el-border-color-lighter);
}
</style>
