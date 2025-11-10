<template>
  <ml-language
    class="ml-language-selector"
    v-if="features.isShowLanguageSelector"
    :languages="languages"
    :current="effectiveLocale"
    @click="handleClick"
  />
</template>

<script setup lang="ts">
import { MlDropdownMenuItem, MlLanguage } from '@mlightcad/ui-components'
import { reactive } from 'vue'

import { useLocale, useSettings } from '../../composable'
import { LocaleProp, LocaleValue } from '../../locale'

const features = useSettings()

// Define props
interface Props {
  currentLocale?: LocaleProp
}

const props = withDefaults(defineProps<Props>(), {
  currentLocale: undefined
})

const { effectiveLocale, setLocale } = useLocale(props.currentLocale)

const languages = reactive<MlDropdownMenuItem[]>([
  {
    name: 'en' as LocaleValue,
    text: 'English'
  },
  {
    name: 'zh' as LocaleValue,
    text: '简体中文'
  }
])

const handleClick = (lang: string) => {
  // Allow changing locale regardless of prop control
  if (lang === 'en' || lang === 'zh') {
    setLocale(lang as 'en' | 'zh')
  }
}
</script>

<style scoped>
.ml-language-selector {
  position: fixed;
  right: 40px;
  top: 20px;
  z-index: 1000;
}
</style>
