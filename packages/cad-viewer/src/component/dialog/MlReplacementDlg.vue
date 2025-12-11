<template>
  <ml-base-dialog
    :title="t('dialog.replacementDlg.title')"
    v-model="dialogVisible"
    name="ReplacementDlg"
    @ok="handleConfirm"
    @open="loadAvailableFonts"
  >
    <el-tabs size="small" v-model="activeName">
      <el-tab-pane
        v-if="fontMapping.size > 0"
        :label="t('dialog.replacementDlg.fontTabName')"
        name="font"
      >
        <div>
          <el-row>
            <el-col :span="12">
              <span>{{ t('dialog.replacementDlg.missedFont') }}</span>
            </el-col>
            <el-col :span="12">
              <span>{{ t('dialog.replacementDlg.replacedFont') }}</span>
            </el-col>
          </el-row>
          <el-row
            v-for="[missedFont, mappedFont] in fontMapping"
            :key="missedFont"
            style="margin-top: 10px"
          >
            <el-col :span="12">
              <span>{{ missedFont }}</span>
            </el-col>
            <el-col :span="12">
              <el-select
                :model-value="mappedFont"
                :placeholder="t('dialog.replacementDlg.selectFont')"
                @update:model-value="
                  (value: string) => updateMappedFont(missedFont, value)
                "
                style="width: 100%"
              >
                <el-option
                  v-for="(replacement, rIndex) in availableFonts"
                  :key="rIndex"
                  :label="replacement"
                  :value="replacement"
                />
              </el-select>
            </el-col>
          </el-row>
        </div>
      </el-tab-pane>
      <el-tab-pane
        v-if="imageTableData.size > 0"
        :label="t('dialog.replacementDlg.imageTabName')"
        name="image"
      >
        <el-table
          :data="Array.from(imageTableData.values())"
          style="width: 100%"
          :v-show="false"
        >
          <el-table-column
            :label="t('dialog.replacementDlg.file')"
            prop="fileName"
            :min-width="0"
            :flex="1"
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
        <!-- File Input (hidden) -->
        <input
          type="file"
          ref="fileInput"
          accept=".png,.jpg,.jpeg"
          @change="handleFileChange"
          style="display: none"
        />
      </el-tab-pane>
    </el-tabs>
  </ml-base-dialog>
</template>

<script lang="ts" setup>
import {
  AcApDocManager,
  AcApSettingManager
} from '@mlightcad/cad-simple-viewer'
import { AcDbRasterImage } from '@mlightcad/data-model'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { ImageMappingData, useMissedData } from '../../composable'
import MlBaseDialog from '../common/MlBaseDialog.vue'

const { t } = useI18n()
const { fonts: fontMapping, images: imageTableData } = useMissedData()
const dialogVisible = ref(true)

const activeName = computed(() => {
  return fontMapping.size > 0 ? 'font' : 'image'
})
const fileInput = ref<HTMLInputElement | null>(null)

// Move availableFonts to a ref and populate it in onMounted
const availableFonts = ref<string[]>([])

const loadAvailableFonts = () => {
  const fonts = AcApDocManager.instance.avaiableFonts
  availableFonts.value = fonts.map(f => f.name[0])
}

const handleConfirm = () => {
  const db = AcApDocManager.instance.curDocument.database
  imageTableData.forEach(item => {
    if (item.file) {
      item.ids.forEach(id => {
        const image = db.tables.blockTable.modelSpace.getIdAt(
          id
        ) as AcDbRasterImage
        image.image = item.file
        image.triggerModifiedEvent()
      })
    }
  })

  const settingManager = AcApSettingManager.instance
  fontMapping.forEach((mappedFont, missedFont) => {
    if (missedFont && mappedFont) {
      settingManager.setFontMapping(missedFont, mappedFont)
    }
  })
}

const handleSelectImage = (row: ImageMappingData) => {
  if (fileInput.value) {
    fileInput.value.click()
    fileInput.value.onchange = () => {
      handleFileChange(row)
    }
  }
}

const handleFileChange = (row: ImageMappingData) => {
  const file = fileInput.value?.files?.[0]
  if (file) {
    row.file = file
  }
}

const updateMappedFont = (missedFont: string, mappedFont: string) => {
  fontMapping.set(missedFont, mappedFont)
}
</script>
