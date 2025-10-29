<template>
  <div v-if="modelValue" class="ml-base-dialog" role="dialog" aria-modal="true">
    <!-- Overlay -->
    <div class="ml-base-dialog-overlay" @click="handleCancel"></div>

    <!-- Dialog Container (with transition) -->
    <transition name="ml-base-dialog-fade" @after-enter="handleOpened">
      <div
        v-show="modelValue"
        class="ml-base-dialog-container"
        :style="{ width: widthStyle }"
      >
        <!-- Header -->
        <div class="ml-base-dialog-header">
          <div class="ml-base-dialog-title">
            <span v-if="computedIcon" class="ml-base-dialog-icon-wrapper">
              <component :is="computedIcon" class="ml-base-dialog-icon" />
            </span>
            <span>{{ title }}</span>
          </div>
          <div class="ml-base-dialog-actions">
            <el-button
              text
              size="small"
              class="ml-base-dialog-close"
              @click="handleCancel"
            >
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
        </div>

        <!-- Body -->
        <div class="ml-base-dialog-body">
          <slot />
        </div>

        <!-- Footer -->
        <div class="ml-base-dialog-footer">
          <el-button @click="handleCancel">
            {{ t('dialog.baseDialog.cancel') }}
          </el-button>
          <el-button type="primary" @click="handleOk">
            {{ t('dialog.baseDialog.ok') }}
          </el-button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { Close } from '@element-plus/icons-vue'
import { type Component, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { mlightcad } from '../../svg'

const { t } = useI18n()

const props = defineProps({
  modelValue: { type: Boolean, required: true },
  title: { type: String, required: true },
  width: { type: [Number, String], default: 400 },
  icon: { type: Object as () => Component | null, default: null }
})

const emits = defineEmits([
  'update:modelValue',
  'ok',
  'cancel',
  'open', // 🔹 new event
  'opened' // 🔹 new event
])

// Use provided icon or fallback to default
const computedIcon = computed<Component>(() => props.icon ?? mlightcad)

const widthStyle = computed(() =>
  typeof props.width === 'number' ? `${props.width}px` : props.width
)

// Watch modelValue to emit 'open' when dialog is shown
watch(
  () => props.modelValue,
  (newVal, oldVal) => {
    if (newVal && !oldVal) {
      emits('open') // 🔹 emit "open" immediately when shown
    }
  }
)

function handleOpened() {
  emits('opened') // 🔹 emit after opening animation ends
}

function handleOk() {
  emits('ok')
  emits('update:modelValue', false)
}

function handleCancel() {
  emits('cancel')
  emits('update:modelValue', false)
}
</script>

<style scoped>
/* Fade animation */
.ml-base-dialog-fade-enter-active,
.ml-base-dialog-fade-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.ml-base-dialog-fade-enter-from,
.ml-base-dialog-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Base Layout */
.ml-base-dialog {
  position: fixed;
  inset: 0;
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Overlay */
.ml-base-dialog-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
}

/* Dialog container */
.ml-base-dialog-container {
  position: relative;
  z-index: 1;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
}

/* Header */
.ml-base-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px;
  height: 30px;
  border-bottom: 1px solid var(--el-border-color);
  background: var(--el-fill-color-light);
  position: relative;
}

.ml-base-dialog-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: var(--el-text-color-primary);
}

.ml-base-dialog-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
}

.ml-base-dialog-icon {
  width: 20px;
  height: 20px;
  color: var(--el-color-primary);
}

.ml-base-dialog-actions {
  display: flex;
  align-items: center;
}

.ml-base-dialog-close {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Body */
.ml-base-dialog-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

/* Footer */
.ml-base-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
  padding: 8px 12px;
}

/* Dark mode */
.dark .ml-base-dialog-container {
  background: var(--el-bg-color-page);
}

.dark .ml-base-dialog-header {
  background: var(--el-fill-color-darker);
}
</style>
