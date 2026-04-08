<template>
  <ml-toggle-button
    v-model="isEnabled"
    :data="buttonData"
    @click="toggleSysVar"
  />
</template>

<script lang="ts" setup>
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { AcDbSysVarManager } from '@mlightcad/data-model'
import { computed, ref, watch } from 'vue'

import {
  type SystemVariables,
  useSystemVars
} from '../../composable/useSystemVars'
import MlToggleButton, { type MlIconType } from './MlToggleButton.vue'

interface Props {
  sysVarName: string
  onIcon: MlIconType
  offIcon: MlIconType
  onTooltip: string
  offTooltip: string
  onColor?: string
  offColor?: string
  disabledValue?: number
  enabledValue?: number
  rememberLastEnabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabledValue: 0,
  enabledValue: 1,
  rememberLastEnabled: false
})

const systemVars = useSystemVars(AcApDocManager.instance)
const systemVarKey = computed(
  () => props.sysVarName.toLowerCase() as keyof SystemVariables
)
const lastEnabledValue = ref(
  props.rememberLastEnabled
    ? Number(
        AcDbSysVarManager.instance().getDefaultValue(props.sysVarName) ??
          props.enabledValue
      )
    : props.enabledValue
)

watch(
  () => systemVars[systemVarKey.value],
  value => {
    if (!props.rememberLastEnabled) return
    if (value == null) return
    const numericValue = Number(value)
    if (Number.isNaN(numericValue) || numericValue === props.disabledValue)
      return
    lastEnabledValue.value = numericValue
  },
  { immediate: true }
)

const buttonData = computed(() => ({
  onIcon: props.onIcon,
  offIcon: props.offIcon,
  onTooltip: props.onTooltip,
  offTooltip: props.offTooltip,
  onColor: props.onColor,
  offColor: props.offColor
}))

const isEnabled = computed(() => {
  const currentValue = Number(
    systemVars[systemVarKey.value] ?? props.disabledValue
  )
  return currentValue !== props.disabledValue
})

const toggleSysVar = () => {
  const database = AcApDocManager.instance.curDocument.database
  const nextValue = isEnabled.value
    ? props.disabledValue
    : props.rememberLastEnabled
      ? lastEnabledValue.value
      : props.enabledValue
  AcDbSysVarManager.instance().setVar(props.sysVarName, nextValue, database)
}
</script>
