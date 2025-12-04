<template>
  <ml-toggle-button
    :model-value="isDark"
    :data="themeBtnData"
    @click="toggleDark()"
  />
</template>

<script lang="ts" setup>
import { Moon, Sunny } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { MlToggleButton } from '../common'

const { isDark, toggleDark } = defineProps<{
  isDark: boolean
  toggleDark: () => void
}>()

const { t } = useI18n()

const themeBtnData = computed(() => ({
  onIcon: Sunny,
  offIcon: Moon,
  onTooltip: t('main.statusBar.theme.light'),
  offTooltip: t('main.statusBar.theme.dark')
}))
</script>
