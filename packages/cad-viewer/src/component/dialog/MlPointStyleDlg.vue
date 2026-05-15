<template>
  <ml-base-dialog
    :title="t('dialog.pointStyleDlg.title')"
    :width="400"
    v-model="dialogVisible"
    name="PointStyleDlg"
    @ok="handleConfirm"
    @cancel="handleClose"
  >
    <el-row
      v-for="(row, rowIndex) in icons"
      :key="rowIndex"
      style="margin-top: 10px"
      :gutter="6"
      justify="space-between"
    >
      <el-col v-for="(col, colIndex) in row" :key="colIndex" :span="4">
        <el-button
          :icon="col.icon"
          :type="buttonType(rowIndex, colIndex)"
          @click="handleSelectPointStyle(rowIndex, colIndex)"
          style="font-size: 25px"
        />
      </el-col>
    </el-row>
  </ml-base-dialog>
</template>

<script lang="ts" setup>
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { ElButton, ElCol, ElRow } from 'element-plus'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useSystemVars } from '../../composable'
import {
  pointstyle1,
  pointstyle2,
  pointstyle3,
  pointstyle4,
  pointstyle5,
  pointstyle6,
  pointstyle7,
  pointstyle8,
  pointstyle9,
  pointstyle10,
  pointstyle11,
  pointstyle12,
  pointstyle13,
  pointstyle14,
  pointstyle15,
  pointstyle16,
  pointstyle17,
  pointstyle18,
  pointstyle19,
  pointstyle20
} from '../../svg'
import MlBaseDialog from '../common/MlBaseDialog.vue'

const { t } = useI18n()
const systemVars = useSystemVars(AcApDocManager.instance)
const dialogVisible = ref(true)
const currentPointStyleIndex = ref(0)
const icons = [
  [
    { id: 0, icon: pointstyle1 },
    { id: 1, icon: pointstyle2 },
    { id: 2, icon: pointstyle3 },
    { id: 3, icon: pointstyle4 },
    { id: 4, icon: pointstyle5 }
  ],
  [
    { id: 32, icon: pointstyle6 },
    { id: 33, icon: pointstyle7 },
    { id: 34, icon: pointstyle8 },
    { id: 35, icon: pointstyle9 },
    { id: 36, icon: pointstyle10 }
  ],
  [
    { id: 64, icon: pointstyle11 },
    { id: 65, icon: pointstyle12 },
    { id: 66, icon: pointstyle13 },
    { id: 67, icon: pointstyle14 },
    { id: 68, icon: pointstyle15 }
  ],
  [
    { id: 96, icon: pointstyle16 },
    { id: 97, icon: pointstyle17 },
    { id: 98, icon: pointstyle18 },
    { id: 99, icon: pointstyle19 },
    { id: 100, icon: pointstyle20 }
  ]
]

const reset = () => {
  if (systemVars.pdmode) currentPointStyleIndex.value = systemVars.pdmode
}
reset()

const buttonType = (rowIndex: number, colIndex: number) => {
  if (icons[rowIndex][colIndex].id == currentPointStyleIndex.value) {
    return 'primary' as const
  }
  return undefined
}

const handleSelectPointStyle = (rowIndex: number, colIndex: number) => {
  currentPointStyleIndex.value = icons[rowIndex][colIndex].id
}

const handleConfirm = () => {
  AcApDocManager.instance.curDocument.database.pdmode =
    currentPointStyleIndex.value
}

const handleClose = () => {
  reset()
}
</script>
