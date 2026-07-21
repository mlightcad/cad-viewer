<template>
  <div ref="rootRef" class="ml-layout-tabs">
    <el-button-group class="ml-layout-tabs-list" role="tablist">
      <el-button
        v-for="layout in layouts"
        :key="layout.blockTableRecordId"
        :ref="
          (el: Element | ComponentPublicInstance | null) =>
            setButtonRef(layout.blockTableRecordId, el)
        "
        class="ml-layout-tabs-button"
        size="small"
        role="tab"
        :hidden="overflowIds.includes(layout.blockTableRecordId)"
        :type="layout.isActive ? 'primary' : ''"
        :aria-selected="layout.isActive"
        @click="handleSelectLayout(layout)"
      >
        {{ layout.name }}
      </el-button>
      <el-dropdown
        v-show="overflowLayouts.length > 0"
        trigger="click"
        placement="top-start"
        @command="handleSelectById"
      >
        <el-button
          ref="overflowButtonRef"
          class="ml-layout-tabs-overflow-button"
          size="small"
          :class="{ 'is-active': overflowContainsActive }"
          :type="overflowContainsActive ? 'primary' : ''"
          :title="t('main.statusBar.moreLayouts')"
          :aria-label="t('main.statusBar.moreLayouts')"
        >
          {{ overflowButtonLabel }}
        </el-button>
        <template #dropdown>
          <el-dropdown-menu class="ml-layout-tabs-overflow-menu">
            <el-dropdown-item
              v-for="layout in overflowLayouts"
              :key="layout.blockTableRecordId"
              :command="layout.blockTableRecordId"
              :class="{ 'is-selected': layout.isActive }"
            >
              {{ layout.name }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </el-button-group>
  </div>
</template>

<script setup lang="ts">
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import {
  acdbHostApplicationServices,
  AcDbObjectId
} from '@mlightcad/data-model'
import {
  ElButton,
  ElButtonGroup,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu
} from 'element-plus'
import {
  type ComponentPublicInstance,
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch
} from 'vue'
import { useI18n } from 'vue-i18n'

import { type LayoutInfo, useLayouts } from '../../composable'

const OVERFLOW_BTN_WIDTH = 28
const overflowButtonLabel = '...'

const props = defineProps<{
  disabled?: boolean
  /** Extra width (px) reserved for status-bar content such as coordinates. */
  reservedWidth?: number
}>()

const { t } = useI18n()
const layouts = useLayouts(AcApDocManager.instance)

const rootRef = ref<HTMLElement | null>(null)
const overflowButtonRef = ref<ComponentPublicInstance | null>(null)
const overflowIds = ref<AcDbObjectId[]>([])
const buttonRefs = new Map<AcDbObjectId, HTMLElement>()
let overflowFrame: number | undefined
let resizeObserver: ResizeObserver | undefined

const resolvedReservedWidth = computed(() => props.reservedWidth ?? 0)

const overflowLayouts = computed(() =>
  layouts.filter(layout => overflowIds.value.includes(layout.blockTableRecordId))
)

const activeLayoutId = computed(
  () => layouts.find(layout => layout.isActive)?.blockTableRecordId
)

const overflowContainsActive = computed(() => {
  const activeId = activeLayoutId.value
  return activeId != null && overflowIds.value.includes(activeId)
})

const setButtonRef = (id: AcDbObjectId, el: unknown) => {
  const element =
    el instanceof HTMLElement
      ? el
      : el && typeof el === 'object' && '$el' in el
        ? (el as ComponentPublicInstance).$el
        : null

  if (element instanceof HTMLElement) {
    buttonRefs.set(id, element)
  } else {
    buttonRefs.delete(id)
  }
}

const handleSelectLayout = (layout: LayoutInfo) => {
  if (props.disabled) return
  acdbHostApplicationServices().layoutManager.setCurrentLayoutBtrId(
    layout.blockTableRecordId
  )
}

const handleSelectById = (id: AcDbObjectId) => {
  if (props.disabled) return
  const layout = layouts.find(item => item.blockTableRecordId === id)
  if (layout) {
    handleSelectLayout(layout)
  }
}

const scheduleUpdateOverflow = () => {
  if (overflowFrame !== undefined) return
  overflowFrame = requestAnimationFrame(() => {
    overflowFrame = undefined
    void updateOverflow()
  })
}

/**
 * Extra pixels still needed so coordinates can grow up to {@link resolvedReservedWidth}
 * without covering layout tabs. Returns 0 when the coordinate button already holds
 * that width (e.g. via CSS min-width).
 */
const getCoordinateReserveExtra = (root: HTMLElement): number => {
  const reserved = resolvedReservedWidth.value
  if (reserved <= 0) return 0

  const statusBar = root.closest('.ml-status-bar')
  const coord = statusBar?.querySelector(
    '.ml-status-bar-current-pos'
  ) as HTMLElement | null

  if (!coord) {
    // Coordinates will appear later — keep the full reservation.
    return reserved
  }

  return Math.max(0, reserved - coord.offsetWidth)
}

const updateOverflow = async () => {
  const root = rootRef.value
  if (!root || layouts.length === 0) {
    overflowIds.value = []
    return
  }

  // Measure with all buttons visible.
  overflowIds.value = []
  await nextTick()

  const rootWidth = root.clientWidth
  if (rootWidth <= 0) return

  const widths = new Map(
    layouts.map(layout => [
      layout.blockTableRecordId,
      buttonRefs.get(layout.blockTableRecordId)?.offsetWidth ?? 0
    ])
  )
  const totalWidth = layouts.reduce(
    (sum, layout) => sum + (widths.get(layout.blockTableRecordId) ?? 0),
    0
  )

  // Overflow control is v-show'd off while measuring, so offsetWidth is 0 —
  // always fall back to the reserved constant in that case.
  const measuredOverflowBtnWidth =
    overflowButtonRef.value?.$el instanceof HTMLElement
      ? overflowButtonRef.value.$el.offsetWidth
      : 0
  const overflowButtonWidth = measuredOverflowBtnWidth || OVERFLOW_BTN_WIDTH
  const coordinateReserveExtra = getCoordinateReserveExtra(root)
  // Keep coordinate slack free even when all tabs would otherwise fit.
  const widthForTabs = rootWidth - coordinateReserveExtra

  if (totalWidth <= widthForTabs) {
    overflowIds.value = []
    return
  }

  // Overflow control is only needed when tabs do not all fit.
  const availableWidth = widthForTabs - overflowButtonWidth
  const activeId = activeLayoutId.value ?? layouts[0].blockTableRecordId
  const visible = new Set(layouts.map(layout => layout.blockTableRecordId))
  const hidden = new Set<AcDbObjectId>()

  const sumVisibleWidth = () =>
    layouts
      .filter(layout => visible.has(layout.blockTableRecordId))
      .reduce(
        (sum, layout) => sum + (widths.get(layout.blockTableRecordId) ?? 0),
        0
      )

  while (visible.size > 1 && sumVisibleWidth() > availableWidth) {
    let hideId: AcDbObjectId | undefined
    for (let index = layouts.length - 1; index >= 0; index -= 1) {
      const id = layouts[index].blockTableRecordId
      if (id === activeId || !visible.has(id)) continue
      hideId = id
      break
    }
    if (!hideId) break
    visible.delete(hideId)
    hidden.add(hideId)
  }

  if (!visible.has(activeId)) {
    hidden.delete(activeId)
    visible.add(activeId)
    while (visible.size > 1 && sumVisibleWidth() > availableWidth) {
      let hideId: AcDbObjectId | undefined
      for (let index = layouts.length - 1; index >= 0; index -= 1) {
        const id = layouts[index].blockTableRecordId
        if (id === activeId || !visible.has(id)) continue
        hideId = id
        break
      }
      if (!hideId) break
      visible.delete(hideId)
      hidden.add(hideId)
    }
  }

  overflowIds.value = layouts
    .filter(layout => hidden.has(layout.blockTableRecordId))
    .map(layout => layout.blockTableRecordId)
}

watch(
  () =>
    layouts.map(layout => [
      layout.blockTableRecordId,
      layout.name,
      layout.isActive
    ]),
  () => {
    scheduleUpdateOverflow()
  },
  { deep: true }
)

watch(resolvedReservedWidth, () => {
  scheduleUpdateOverflow()
})

onMounted(() => {
  if (!rootRef.value) return
  resizeObserver = new ResizeObserver(() => {
    scheduleUpdateOverflow()
  })
  resizeObserver.observe(rootRef.value)

  const statusBar = rootRef.value.closest('.ml-status-bar')
  const right = statusBar?.querySelector('.ml-status-bar-right')
  if (right instanceof HTMLElement) {
    // Recalculate when coordinates / other right-side controls change width.
    resizeObserver.observe(right)
  }

  scheduleUpdateOverflow()
})

onBeforeUnmount(() => {
  if (overflowFrame !== undefined) {
    cancelAnimationFrame(overflowFrame)
    overflowFrame = undefined
  }
  resizeObserver?.disconnect()
  resizeObserver = undefined
})
</script>

<style scoped>
.ml-layout-tabs {
  display: flex;
  align-items: stretch;
  width: 100%;
  min-width: 0;
  height: var(--ml-status-bar-height);
  overflow: hidden;
  box-sizing: border-box;
  gap: 0;
}

.ml-layout-tabs-list {
  display: inline-flex;
  align-items: stretch;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  border: none;
}

.ml-layout-tabs-list :deep(.el-dropdown) {
  flex: 0 0 auto;
  display: inline-flex;
  align-self: stretch;
}

.ml-layout-tabs-list :deep(.el-button) {
  margin: 0;
}

.ml-layout-tabs-button {
  flex: 0 0 auto;
  box-sizing: border-box;
  height: 100%;
  padding: 0 4px;
  margin: 0;
}

.ml-layout-tabs-button[hidden] {
  display: none !important;
}

.ml-layout-tabs-overflow-button {
  box-sizing: border-box;
  height: 100%;
  min-width: 24px;
  padding: 0 2px;
  margin: 0;
  letter-spacing: 0;
}
</style>

<style>
.ml-layout-tabs-overflow-menu .el-dropdown-menu__item.is-selected {
  color: var(--el-color-primary, #409eff);
}
</style>
