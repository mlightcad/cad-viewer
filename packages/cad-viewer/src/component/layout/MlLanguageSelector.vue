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

import { isSupportedLocale, LOCALE_OPTIONS, useLocale, useSettings } from '../../composable'
import { LocaleProp } from '../../locale'

const features = useSettings()

// Define props
interface Props {
  currentLocale?: LocaleProp
}

const props = withDefaults(defineProps<Props>(), {
  currentLocale: undefined
})

const { effectiveLocale, setLocale } = useLocale(props.currentLocale)

const languages = reactive<MlDropdownMenuItem[]>(
  LOCALE_OPTIONS.map(option => ({
    name: option.locale,
    text: option.label
  }))
)

const handleClick = (lang: string) => {
  // Allow changing locale regardless of prop control
  if (isSupportedLocale(lang)) {
    setLocale(lang)
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
