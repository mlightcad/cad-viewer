<template>
  <!--
    Base integer input with support for decimal, octal, and hexadecimal formats.
    - Controlled by v-model (modelValue).
    - Emits "change" event instead of "update:modelValue".
    - Editable or readonly via "editable" prop.
  -->
  <div class="ml-base-input-number">
    <!-- Numeric input -->
    <el-input
      v-model="displayValue"
      class="ml-base-input-number__input"
      :placeholder="placeholder"
      :readonly="!editable"
      @input="onInput"
      @blur="onBlur"
      clearable
    />

    <!-- Mode selector (dec/oct/hex) -->
    <el-select v-model="base" class="ml-base-input-number__select" size="small">
      <el-option
        v-for="opt in baseOptions"
        :key="opt.value"
        :label="opt.label"
        :value="opt.value"
      />
    </el-select>
  </div>
</template>

<script setup lang="ts">
import { ElInput, ElOption,ElSelect } from 'element-plus'
import type { Ref } from 'vue'
import { ref, watch } from 'vue'

/**
 * -----------------------------------------------------------------------------
 * TYPE DEFINITIONS
 * -----------------------------------------------------------------------------
 */

/** Supported numeric base modes */
type BaseMode = 'dec' | 'oct' | 'hex'

/**
 * -----------------------------------------------------------------------------
 * PROPS & EMITS
 * -----------------------------------------------------------------------------
 */
const props = defineProps<{
  /**
   * The bound numeric value (in decimal).
   */
  modelValue: number

  /**
   * Optional input placeholder text.
   */
  placeholder?: string

  /**
   * When false, input is readonly but user can still switch base modes.
   */
  editable?: boolean
}>()

/**
 * Emits:
 *  - change(value: number)
 *      Fired whenever the numeric value changes due to user input.
 */
const emit = defineEmits<{
  (e: 'change', value: number): void
}>()

/**
 * -----------------------------------------------------------------------------
 * STATE
 * -----------------------------------------------------------------------------
 */
const base: Ref<BaseMode> = ref('dec')
const displayValue = ref('')

const baseOptions = [
  { label: 'DEC', value: 'dec' },
  { label: 'OCT', value: 'oct' },
  { label: 'HEX', value: 'hex' }
] as const

/**
 * -----------------------------------------------------------------------------
 * HELPERS
 * -----------------------------------------------------------------------------
 */
const parseByBase = (str: string, baseMode: BaseMode): number => {
  if (!str) return 0
  const radix = baseMode === 'hex' ? 16 : baseMode === 'oct' ? 8 : 10
  const parsed = parseInt(str, radix)
  return Number.isNaN(parsed) ? 0 : parsed
}

const formatByBase = (num: number, baseMode: BaseMode): string => {
  if (Number.isNaN(num)) return ''
  if (baseMode === 'hex') return num.toString(16).toUpperCase()
  if (baseMode === 'oct') return num.toString(8)
  return num.toString(10)
}

const sanitizeInput = (value: string, baseMode: BaseMode): string => {
  switch (baseMode) {
    case 'dec':
      return value.replace(/[^0-9]/g, '')
    case 'oct':
      return value.replace(/[^0-7]/g, '')
    case 'hex':
      return value.replace(/[^0-9a-fA-F]/g, '')
  }
}

/**
 * -----------------------------------------------------------------------------
 * EVENT HANDLERS
 * -----------------------------------------------------------------------------
 */

/**
 * Handles user typing in the input.
 *  - Sanitizes input according to base.
 *  - Emits decimal integer via "change" event.
 */
const onInput = (val: string): void => {
  if (!props.editable) return
  const clean = sanitizeInput(val, base.value)
  displayValue.value = clean
  const parsed = parseByBase(clean, base.value)
  emit('change', parsed)
}

/** Normalize displayed text on blur. */
const onBlur = (): void => {
  displayValue.value = formatByBase(props.modelValue, base.value)
}

/**
 * -----------------------------------------------------------------------------
 * WATCHERS
 * -----------------------------------------------------------------------------
 */

/**
 * Sync display with external modelValue changes.
 * (Keeps display updated if parent modifies v-model value directly.)
 */
watch(
  () => props.modelValue,
  val => {
    displayValue.value = formatByBase(val, base.value)
  },
  { immediate: true }
)

/** Reformat display when switching base mode. */
watch(base, newBase => {
  displayValue.value = formatByBase(props.modelValue, newBase)
})
</script>

<style scoped>
/* -----------------------------------------------------------------------------
 * STYLES
 * -----------------------------------------------------------------------------
 * Prefixed with "ml-" to avoid collisions.
 * -----------------------------------------------------------------------------
 */
.ml-base-input-number {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ml-base-input-number__input {
  flex: 1;
}

.ml-base-input-number__select {
  width: 80px;
}
</style>
