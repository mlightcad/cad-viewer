<template>
  <div ref="hostRef" class="ml-aci-picker-host"></div>
</template>

<script setup lang="ts">
import {
  type AcUiAciIndexPicker,
  acuiCreateAciIndexPicker
} from '@mlightcad/cad-simple-viewer'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const emit = defineEmits(['update:modelValue'])

const props = defineProps({
  modelValue: { type: Number, default: 256 }
})

const { t } = useI18n()
const hostRef = ref<HTMLElement | null>(null)
let picker: AcUiAciIndexPicker | null = null

onMounted(() => {
  if (!hostRef.value) return
  picker = acuiCreateAciIndexPicker({
    labels: {
      index: t('main.colorIndexPicker.colorIndex'),
      rgb: t('main.colorIndexPicker.rgb'),
      input: t('main.colorIndexPicker.color'),
      inputPlaceholder: t('main.colorIndexPicker.inputPlaceholder')
    },
    initialIndex: props.modelValue ?? null,
    onChange: index => emit('update:modelValue', index)
  })
  hostRef.value.appendChild(picker.root)
})

watch(
  () => props.modelValue,
  newVal => {
    if (!picker) return
    const next = newVal ?? null
    if (picker.getIndex() === next) return
    picker.setIndex(next)
  }
)

onBeforeUnmount(() => {
  picker?.dispose()
  picker = null
})
</script>

<style scoped>
.ml-aci-picker-host {
  width: 100%;
}
</style>
