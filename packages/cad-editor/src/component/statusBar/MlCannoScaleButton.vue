<template>
  <el-tooltip :content="t('main.statusBar.cannoscale.tooltip')" :hide-after="0">
    <el-dropdown
      class="ml-cannoscale-dropdown"
      trigger="click"
      @command="handleCommand"
    >
      <el-button class="ml-cannoscale-button" text>
        {{ currentScale }}
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="scale in scaleOptions"
            :key="scale"
            :command="scale"
            :icon="scale === currentScale ? Check : undefined"
          >
            {{ scale }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </el-tooltip>
</template>

<script lang="ts" setup>
import { Check } from '@element-plus/icons-vue'
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import {
  acdbListAnnotationScales,
  AcDbSystemVariables,
  AcDbSysVarManager
} from '@mlightcad/data-model'
import {
  ElButton,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElTooltip
} from 'element-plus'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useSystemVars } from '../../composable/useSystemVars'

const { t } = useI18n()
const systemVars = useSystemVars(AcApDocManager.instance)
const scaleOptions = ref<string[]>(['1:1'])

const refreshScales = () => {
  const db = AcApDocManager.instance.curDocument.database
  scaleOptions.value = acdbListAnnotationScales(db).map(s => s.scaleName)
  if (
    systemVars.cannoscale &&
    !scaleOptions.value.includes(systemVars.cannoscale)
  ) {
    scaleOptions.value = [systemVars.cannoscale, ...scaleOptions.value]
  }
}

refreshScales()

watch(
  () => AcApDocManager.instance.curDocument,
  () => refreshScales()
)

AcApDocManager.instance.events.documentActivated.addEventListener(() => {
  refreshScales()
})

const currentScale = computed(() => systemVars.cannoscale || '1:1')

const handleCommand = (scaleName: string) => {
  const database = AcApDocManager.instance.curDocument.database
  AcDbSysVarManager.instance().setVar(
    AcDbSystemVariables.CANNOSCALE,
    scaleName,
    database
  )
}
</script>

<style scoped>
.ml-cannoscale-dropdown {
  display: inline-flex;
  vertical-align: middle;
  height: var(--ml-status-bar-height, 30px);
}

.ml-cannoscale-button {
  border: none;
  padding: 0 8px;
  cursor: pointer;
  min-width: 40px;
  width: auto;
  height: var(--ml-status-bar-height, 30px);
  background-color: transparent;
  border-radius: 0;
  font-variant-numeric: tabular-nums;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.ml-cannoscale-button:hover,
.ml-cannoscale-button:focus,
.ml-cannoscale-button:focus-visible {
  background-color: transparent !important;
  border-color: transparent !important;
  color: var(--el-color-primary);
}
</style>
