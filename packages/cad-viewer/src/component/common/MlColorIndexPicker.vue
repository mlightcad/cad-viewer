<template>
  <div class="ml-aci-picker">
    <!-- ===== Large palette: 10–249 (10 rows x 24 per row) ===== -->
    <div class="ml-aci-palette ml-aci-palette-large">
      <div
        v-for="i in largeColors"
        :key="i"
        class="ml-aci-color-cell"
        :style="{ background: rgb(i) }"
        @mouseenter="setHover(i)"
        @mouseleave="clearHover"
        @click="selectColor(i)"
      ></div>
    </div>

    <!-- ===== Small palette: 1–9 in one row, with ByLayer / ByBlock buttons ===== -->
    <div class="ml-aci-small-row">
      <div class="ml-aci-palette ml-aci-palette-small">
        <div
          v-for="i in smallColors"
          :key="i"
          class="ml-aci-color-cell"
          :style="{ background: rgb(i) }"
          @mouseenter="setHover(i)"
          @mouseleave="clearHover"
          @click="selectColor(i)"
        ></div>
      </div>
      <div class="ml-aci-small-actions">
        <button type="button" @click="selectColor(256)">ByLayer</button>
        <button type="button" @click="selectColor(0)">ByBlock</button>
      </div>
    </div>

    <!-- ===== Gray palette: 250–255 ===== -->
    <div class="ml-aci-palette ml-aci-palette-gray">
      <div
        v-for="i in grayColors"
        :key="i"
        class="ml-aci-color-cell"
        :style="{ background: rgb(i) }"
        @mouseenter="setHover(i)"
        @mouseleave="clearHover"
        @click="selectColor(i)"
      ></div>
    </div>

    <!-- ===== Info + Input + Preview row ===== -->
    <div class="ml-aci-bottom-row">
      <div class="ml-aci-bottom-left">
        <div class="ml-aci-info-row">
          <div class="ml-aci-info-left">
            {{ t('main.colorIndexPicker.colorIndex') }}{{ infoIndex }}
          </div>
          <div class="ml-aci-info-right">
            {{ t('main.colorIndexPicker.rgb') }}{{ infoRgb }}
          </div>
        </div>

        <div class="ml-aci-input-row">
          <span>{{ t('main.colorIndexPicker.color') }}</span>
          <input
            v-model="manualInput"
            @keydown.enter="applyInput"
            :placeholder="t('main.colorIndexPicker.inputPlaceholder')"
          />
        </div>
      </div>

      <div
        class="ml-aci-preview-box"
        :style="{
          background: selectedColor !== null ? rgb(selectedColor) : '#000'
        }"
      ></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AcCmColor } from '@mlightcad/data-model'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const emit = defineEmits(['update:modelValue'])

const props = defineProps({
  modelValue: { type: Number, default: 256 }
})

const { t } = useI18n()

// ----- Palette ranges -----
const smallColors = Array.from({ length: 9 }, (_, i) => i + 1)
const largeColors = Array.from({ length: 240 }, (_, i) => i + 10)
const grayColors = Array.from({ length: 6 }, (_, i) => i + 250)

// ----- Selected -----
const selectedColor = ref<number | null>(props.modelValue ?? null)
const manualInput = ref(
  props.modelValue != null ? String(props.modelValue) : ''
)

// ----- Hover state -----
const hoverIndex = ref<number | null>(null)
const hoverRgb = ref({ r: 0, g: 0, b: 0 })

// ACI -> rgb
const rgb = (i: number): string => {
  const color = new AcCmColor()
  color.colorIndex = i
  return color.cssColor || '#FFF'
}

// Hover handling
function setHover(i: number) {
  hoverIndex.value = i
  const color = new AcCmColor()
  color.colorIndex = i
  hoverRgb.value = {
    r: color.red ?? 0,
    g: color.green ?? 0,
    b: color.blue ?? 0
  }
}

function clearHover() {
  hoverIndex.value = null
}

// Select color
function selectColor(i: number) {
  selectedColor.value = i
  manualInput.value = i.toString()
  emit('update:modelValue', i)
}

// Sync external modelValue
watch(
  () => props.modelValue,
  newVal => {
    if (newVal == null) {
      selectedColor.value = null
      manualInput.value = ''
    } else {
      selectedColor.value = newVal
      manualInput.value = String(newVal)
    }
  }
)

// Handle manual input
function applyInput() {
  const v = manualInput.value.trim().toUpperCase()

  if (v === 'BYLAYER') return selectColor(256)
  if (v === 'BYBLOCK') return selectColor(0)

  const n = Number(v)
  if (!Number.isInteger(n) || n < 0 || n > 256) {
    manualInput.value = ''
    return
  }
  selectColor(n)
}

const infoIndex = computed(() => {
  if (selectedColor.value == null) return ''
  return selectedColor.value
})

const infoRgb = computed(() => {
  if (
    selectedColor.value == null ||
    selectedColor.value === 0 ||
    selectedColor.value === 256
  )
    return ''
  const color = new AcCmColor()
  color.colorIndex = selectedColor.value
  return `${color.red}, ${color.green}, ${color.blue}`
})
</script>

<style scoped>
.ml-aci-picker {
  font-size: 12px;
  font-family: Arial;
}

.ml-aci-palette {
  margin-bottom: 6px;
}

.ml-aci-palette-large {
  display: grid;
  grid-template-columns: repeat(24, 1fr);
  gap: 1px;
}

.ml-aci-palette-gray {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
}

.ml-aci-palette-small {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 1px;
}

.ml-aci-small-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ml-aci-small-actions {
  display: flex;
  flex-direction: row;
  gap: 4px;
  margin-left: auto;
}

.ml-aci-small-actions button {
  font-size: 11px;
  padding: 2px 6px;
}

.ml-aci-color-cell {
  width: 10px;
  height: 10px;
  border: 1px solid #999;
  cursor: pointer;
}

.ml-aci-color-cell:hover {
  outline: 1px solid #00a8ff;
}

.ml-aci-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 4px 0;
}

.ml-aci-info-left {
  text-align: left;
}

.ml-aci-info-right {
  text-align: right;
}

.ml-aci-bottom-row {
  display: flex;
  align-items: stretch;
  justify-content: flex-start;
  gap: 8px;
  margin-top: 4px;
}

.ml-aci-bottom-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ml-aci-input-row {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.ml-aci-preview-box {
  width: 32px;
  min-width: 32px;
  margin-left: auto;
  align-self: stretch;
  border: 1px solid #666;
}
</style>
