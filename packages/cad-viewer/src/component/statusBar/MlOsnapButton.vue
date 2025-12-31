<template>
  <el-tooltip :content="t('main.statusBar.osnap.tooltip')" :hide-after="0">
    <el-dropdown trigger="click" @command="handleCommand">
      <el-button class="ml-osnap-setting-button" :icon="Setting" />
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="mode in osnapModes"
            :key="mode.value"
            :command="mode.value"
            :icon="
              acdbHasOsnapMode(features.osnapModes, mode.value)
                ? Check
                : undefined
            "
          >
            {{ mode.label }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </el-tooltip>
</template>

<script lang="ts" setup>
import { Check, Setting } from '@element-plus/icons-vue'
import {
  acdbHasOsnapMode,
  AcDbOsnapMode,
  acdbToggleOsnapMode} from '@mlightcad/data-model'
import { useI18n } from 'vue-i18n'

import { useSettings } from '../../composable'

const { t } = useI18n()
const features = useSettings()

/**
 * All object snap modes generated from AcDbOsnapMode enum.
 *
 * Label key format:
 *   main.statusBar.osnap.<LowerCaseEnumName>
 *
 * Example:
 *   AcDbOsnapMode.EndPoint → main.statusBar.osnap.endpoint
 */
const osnapModes = [
  { value: AcDbOsnapMode.EndPoint, label: t('main.statusBar.osnap.endpoint') },
  { value: AcDbOsnapMode.MidPoint, label: t('main.statusBar.osnap.midpoint') },
  { value: AcDbOsnapMode.Center, label: t('main.statusBar.osnap.center') },
  { value: AcDbOsnapMode.Node, label: t('main.statusBar.osnap.node') },
  { value: AcDbOsnapMode.Quadrant, label: t('main.statusBar.osnap.quadrant') },
  { value: AcDbOsnapMode.Insertion, label: t('main.statusBar.osnap.insertion') }
  // { value: AcDbOsnapMode.Perpendicular, label: t('main.statusBar.osnap.perpendicular') },
  // { value: AcDbOsnapMode.Tangent, label: t('main.statusBar.osnap.tangent') },
  // { value: AcDbOsnapMode.Nearest, label: t('main.statusBar.osnap.nearest') },
  // { value: AcDbOsnapMode.Centroid, label: t('main.statusBar.osnap.centroid') }
]

/**
 * Toggle osnap mode and update the bitmask.
 */
const handleCommand = (mode: AcDbOsnapMode) => {
  features.osnapModes = acdbToggleOsnapMode(features.osnapModes, mode)
}
</script>

<style scoped>
.ml-osnap-setting-button {
  border: none;
  padding: 0px;
  cursor: pointer;
  width: 30px;
}
</style>
