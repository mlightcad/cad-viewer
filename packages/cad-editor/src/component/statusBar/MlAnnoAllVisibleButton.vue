<template>
  <ml-sys-var-toggle-button
    :sys-var-name="AcDbSystemVariables.ANNOALLVISIBLE"
    :on-icon="View"
    :off-icon="Hide"
    :on-tooltip="t('main.statusBar.annoallvisible.on')"
    :off-tooltip="t('main.statusBar.annoallvisible.off')"
    on-color="var(--el-color-primary)"
    off-color="var(--el-text-color-regular)"
    :disabled-value="0"
    :enabled-value="1"
  />
</template>

<script lang="ts" setup>
import { Hide, View } from '@element-plus/icons-vue'
import { AcDbSystemVariables } from '@mlightcad/data-model'
import { useI18n } from 'vue-i18n'

import { MlSysVarToggleButton } from '../common'

const { t } = useI18n()
</script>
