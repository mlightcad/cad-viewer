<template>
  <el-popover
    :visible="open"
    placement="right-start"
    :width="280"
    :teleported="true"
    :show-arrow="true"
    popper-class="ml-bdetect-help-popper"
  >
    <div
      :id="tipId"
      class="ml-bdetect-help"
      @mouseenter="show"
      @mouseleave="hideSoon"
    >
      {{ text }}
    </div>
    <template #reference>
      <button
        ref="root"
        type="button"
        class="ml-bdetect-help__button"
        :aria-expanded="open"
        :aria-label="label"
        :aria-describedby="open ? tipId : undefined"
        @mouseenter="show"
        @mouseleave="hideSoon"
        @click.stop="togglePin"
      >
        <el-icon aria-hidden="true">
          <WarningFilled />
        </el-icon>
      </button>
    </template>
  </el-popover>
</template>

<script setup lang="ts">
/**
 * Exclamation mark beside one detection option. Hovering shows the
 * explanation; clicking pins it open so it stays while the pointer moves
 * away, and clicking again or outside closes it.
 */
import { WarningFilled } from '@element-plus/icons-vue'
import { ElIcon, ElPopover } from 'element-plus'
import { onBeforeUnmount, onMounted, ref, useId } from 'vue'

defineProps<{
  /** Explanation of the option. */
  text: string
  /** Accessible name of the icon button. */
  label: string
}>()

const tipId = useId()
const root = ref<HTMLButtonElement>()
const open = ref(false)
const pinned = ref(false)
let hideTimer: ReturnType<typeof setTimeout> | undefined

const show = () => {
  clearTimeout(hideTimer)
  open.value = true
}

const hideSoon = () => {
  if (pinned.value) return
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    if (!pinned.value) open.value = false
  }, 200)
}

const close = () => {
  clearTimeout(hideTimer)
  pinned.value = false
  open.value = false
}

const togglePin = () => {
  clearTimeout(hideTimer)
  if (pinned.value) {
    close()
    return
  }
  pinned.value = true
  open.value = true
}

const onPointerDown = (event: PointerEvent) => {
  if (!pinned.value) return
  const target = event.target
  if (!(target instanceof Node)) return
  if (root.value?.contains(target)) return
  if (target instanceof Element) {
    const popper = target.closest('.ml-bdetect-help-popper')
    if (popper?.querySelector(`#${CSS.escape(tipId)}`)) return
  }
  close()
}

const onKeyDown = (event: KeyboardEvent) => {
  // A hovered tip must leave Escape to the command. Only a pinned tip is
  // dismissed first.
  if (event.key !== 'Escape' || !pinned.value) return
  close()
  event.preventDefault()
  event.stopImmediatePropagation()
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown, true)
  // Capture: the command's Escape listener is already on document, and this
  // component mounts after that listener is added.
  document.addEventListener('keydown', onKeyDown, true)
})

onBeforeUnmount(() => {
  clearTimeout(hideTimer)
  document.removeEventListener('pointerdown', onPointerDown, true)
  document.removeEventListener('keydown', onKeyDown, true)
})
</script>

<style scoped>
.ml-bdetect-help__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--el-text-color-regular);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}

.ml-bdetect-help__button:hover,
.ml-bdetect-help__button:focus-visible {
  color: var(--el-color-primary);
}

.ml-bdetect-help__button:focus-visible {
  outline: 1px solid var(--el-color-primary);
  outline-offset: 1px;
}

.ml-bdetect-help {
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-primary);
}
</style>

<style>
/* The popper is teleported, so this rule cannot be scoped. Padding lives on
   the explanation itself, which keeps the hover target flush with the box. */
.ml-bdetect-help-popper.el-popper {
  padding: 0;
  max-width: 280px;
}
</style>
