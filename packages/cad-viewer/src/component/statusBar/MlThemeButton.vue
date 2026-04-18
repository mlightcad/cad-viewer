<template>
  <ml-toggle-button
    :model-value="!isDark"
    :data="themeBtnData"
    @click="toggleDark()"
  />
</template>

<script lang="ts" setup>
import { Moon, Sunny } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { markComponentConfigRaw } from '../../composable/markComponentConfigRaw'
import { MlToggleButton } from '../common'

const { isDark, toggleDark } = defineProps<{
  isDark: boolean
  toggleDark: () => void
}>()

const { t } = useI18n()

const themeBtnData = computed(() =>
  markComponentConfigRaw({
    onIcon: Moon,
    offIcon: Sunny,
    onTooltip: t('main.statusBar.theme.dark'),
    offTooltip: t('main.statusBar.theme.light')
  })
)
</script>
