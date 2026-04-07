<template>
  <ml-toggle-button
    v-model="isDynamicInputEnabled"
    :data="dynamicInputBtnData"
    @click="toggleDynamicInput"
  />
</template>

<script lang="ts" setup>
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { AcDbSystemVariables, AcDbSysVarManager } from '@mlightcad/data-model'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useSystemVars } from '../../composable/useSystemVars'
import { dynamicInput } from '../../svg'
import { MlToggleButton } from '../common'

const { t } = useI18n()
const systemVars = useSystemVars(AcApDocManager.instance)
const lastEnabledValue = ref(
  !!AcDbSysVarManager.instance().getDefaultValue(AcDbSystemVariables.DYNMODE)
)

watch(
  () => systemVars.dynmode,
  value => {
    if (value != null && value !== 0) {
      lastEnabledValue.value = !!value
    }
  },
  { immediate: true }
)

const dynamicInputBtnData = computed(() => ({
  onIcon: dynamicInput,
  offIcon: dynamicInput,
  onTooltip: t('main.statusBar.dynamicInput.on'),
  offTooltip: t('main.statusBar.dynamicInput.off')
}))

const isDynamicInputEnabled = computed(() => (systemVars.dynmode ?? 0) !== 0)

const toggleDynamicInput = () => {
  const database = AcApDocManager.instance.curDocument.database
  const nextValue = isDynamicInputEnabled.value ? 0 : lastEnabledValue.value
  AcDbSysVarManager.instance().setVar(
    AcDbSystemVariables.DYNMODE,
    nextValue,
    database
  )
}
</script>
