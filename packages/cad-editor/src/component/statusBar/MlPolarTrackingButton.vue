<template>
  <el-button-group class="ml-polar-tracking-button">
    <el-tooltip :content="tooltip" :hide-after="0">
      <el-button
        class="ml-polar-tracking-button__toggle"
        :icon="polarTracking"
        :style="{ color: iconColor }"
        @click="togglePolarTracking"
      />
    </el-tooltip>
    <el-dropdown
      trigger="click"
      popper-class="ml-polar-tracking-popper"
      @command="handleCommand"
    >
      <el-button class="ml-polar-tracking-button__arrow">
        <el-icon>
          <ArrowDown />
        </el-icon>
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            v-for="increment in polarIncrements"
            :key="increment"
            :command="increment"
            :icon="
              isSamePolarIncrement(currentPolarang, increment)
                ? Check
                : undefined
            "
          >
            {{ formatPolarIncrementMenuLabel(increment) }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </el-button-group>
</template>

<script lang="ts" setup>
import { ArrowDown, Check } from '@element-plus/icons-vue'
import {
  AcApDocManager,
  POLARMODE_POLAR_TRACKING,
  togglePolarTracking as togglePolarTrackingSysVar
} from '@mlightcad/cad-simple-viewer'
import { AcDbSysVarManager } from '@mlightcad/data-model'
import {
  ElButton,
  ElButtonGroup,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElIcon,
  ElTooltip
} from 'element-plus'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  POLAR_ANGLE_SYSVAR_NAME,
  useSystemVars
} from '../../composable/useSystemVars'
import { polarTracking } from '../../svg'
import {
  formatPolarIncrementMenuLabel,
  isSamePolarIncrement,
  POLAR_TRACKING_INCREMENTS
} from './polarTrackingMenu'

const { t } = useI18n()
const systemVars = useSystemVars(AcApDocManager.instance)

const polarIncrements = POLAR_TRACKING_INCREMENTS

const currentPolarang = computed(() => Number(systemVars.polarang ?? 90))

const isEnabled = computed(
  () => (Number(systemVars.polarmode ?? 0) & POLARMODE_POLAR_TRACKING) !== 0
)

const iconColor = computed(() =>
  isEnabled.value ? 'var(--el-color-primary)' : 'var(--el-text-color-regular)'
)

const tooltip = computed(() =>
  isEnabled.value
    ? t('main.statusBar.polarTracking.on')
    : t('main.statusBar.polarTracking.off')
)

const togglePolarTracking = () => {
  togglePolarTrackingSysVar(AcApDocManager.instance.curDocument.database)
}

const setPolarang = (increment: number) => {
  const database = AcApDocManager.instance.curDocument.database
  AcDbSysVarManager.instance().setVar(
    POLAR_ANGLE_SYSVAR_NAME,
    increment,
    database
  )
}

const handleCommand = (command: number) => {
  setPolarang(command)
}
</script>

<style scoped>
.ml-polar-tracking-button {
  display: inline-flex;
  vertical-align: middle;
}

.ml-polar-tracking-button__toggle {
  border: none;
  padding: 0;
  cursor: pointer;
  width: 26px;
  height: var(--ml-status-bar-height, 30px);
}

.ml-polar-tracking-button__arrow {
  border: none;
  padding: 0;
  cursor: pointer;
  width: 10px;
  height: var(--ml-status-bar-height, 30px);
  min-width: 10px;
}

.ml-polar-tracking-button__arrow :deep(.el-icon) {
  font-size: 10px;
}
</style>
