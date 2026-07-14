<template>
  <div class="ml-overflow-tabs">
    <div class="ml-overflow-tabs-header">
      <div ref="tabsWrapRef" class="ml-overflow-tabs-wrap">
        <div class="ml-overflow-tabs-list" role="tablist">
          <button
            v-for="tab in tabs"
            :key="tab.name"
            :ref="
              (el: Element | ComponentPublicInstance | null) =>
                setTabButtonRef(tab.name, el)
            "
            type="button"
            class="ml-overflow-tab"
            role="tab"
            :hidden="overflowTabIds.includes(tab.name)"
            :aria-selected="activeTab === tab.name"
            :class="{ 'is-active': activeTab === tab.name }"
            @click="selectTab(tab.name)"
          >
            {{ tab.label }}
          </button>
        </div>
        <el-dropdown
          v-show="overflowTabIds.length > 0"
          trigger="click"
          @command="selectTab"
        >
          <button
            type="button"
            class="ml-overflow-tab-overflow-btn"
            :class="{ 'is-active': overflowContainsActive }"
            :title="resolvedMoreTabsLabel"
            :aria-label="resolvedMoreTabsLabel"
          >
            »
          </button>
          <template #dropdown>
            <el-dropdown-menu class="ml-overflow-tab-overflow-menu">
              <el-dropdown-item
                v-for="tab in overflowTabs"
                :key="tab.name"
                :command="tab.name"
                :class="{ 'is-selected': activeTab === tab.name }"
              >
                {{ tab.label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
    <div class="ml-overflow-tabs-body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
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

/** Tab definition for {@link MlOverflowTabs}. */
export interface MlOverflowTab {
  /** Stable tab identifier. */
  name: string
  /** Display label. */
  label: string
}

const OVERFLOW_BTN_WIDTH = 28

const props = withDefaults(
  defineProps<{
    tabs: MlOverflowTab[]
    /** Optional aria/title for the overflow button. */
    moreTabsLabel?: string
  }>(),
  {
    moreTabsLabel: undefined
  }
)

const activeTab = defineModel<string>({ default: '' })

const { t } = useI18n()

const resolvedMoreTabsLabel = computed(
  () => props.moreTabsLabel ?? t('main.toolPalette.moreTabs')
)

const tabsWrapRef = ref<HTMLElement | null>(null)
const overflowTabIds = ref<string[]>([])
const tabButtonRefs = new Map<string, HTMLElement>()
let tabOverflowFrame: number | undefined
let tabOverflowObserver: ResizeObserver | undefined

const overflowTabs = computed(() => {
  return props.tabs.filter(tab => overflowTabIds.value.includes(tab.name))
})

const overflowContainsActive = computed(() => {
  return overflowTabIds.value.includes(activeTab.value)
})

const setTabButtonRef = (name: string, el: unknown) => {
  if (el instanceof HTMLElement) {
    tabButtonRefs.set(name, el)
  } else {
    tabButtonRefs.delete(name)
  }
}

const selectTab = (tabName: string) => {
  activeTab.value = tabName
}

const scheduleUpdateTabOverflow = () => {
  if (tabOverflowFrame !== undefined) return
  tabOverflowFrame = requestAnimationFrame(() => {
    tabOverflowFrame = undefined
    void updateTabOverflow()
  })
}

const updateTabOverflow = async () => {
  const wrap = tabsWrapRef.value
  const tabList = props.tabs
  if (!wrap || tabList.length === 0) {
    overflowTabIds.value = []
    return
  }

  // Measure with all tabs visible (same approach as dock panel).
  overflowTabIds.value = []
  await nextTick()

  const wrapWidth = wrap.clientWidth
  if (wrapWidth <= 0) return

  const widths = new Map(
    tabList.map(tab => [
      tab.name,
      tabButtonRefs.get(tab.name)?.offsetWidth ?? 0
    ])
  )
  const totalWidth = tabList.reduce(
    (sum, tab) => sum + (widths.get(tab.name) ?? 0),
    0
  )

  if (totalWidth <= wrapWidth) {
    overflowTabIds.value = []
    return
  }

  const activeId = activeTab.value || tabList[0].name
  const availableWidth = wrapWidth - OVERFLOW_BTN_WIDTH
  const visible = new Set(tabList.map(tab => tab.name))
  const hidden = new Set<string>()

  const sumVisibleWidth = () =>
    tabList
      .filter(tab => visible.has(tab.name))
      .reduce((sum, tab) => sum + (widths.get(tab.name) ?? 0), 0)

  while (visible.size > 1 && sumVisibleWidth() > availableWidth) {
    let hideId: string | undefined
    for (let index = tabList.length - 1; index >= 0; index -= 1) {
      const id = tabList[index].name
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
      let hideId: string | undefined
      for (let index = tabList.length - 1; index >= 0; index -= 1) {
        const id = tabList[index].name
        if (id === activeId || !visible.has(id)) continue
        hideId = id
        break
      }
      if (!hideId) break
      visible.delete(hideId)
      hidden.add(hideId)
    }
  }

  overflowTabIds.value = tabList
    .filter(tab => hidden.has(tab.name))
    .map(tab => tab.name)
}

watch(
  [activeTab, () => props.tabs],
  ([current, tabList]) => {
    if (tabList.length > 0 && !tabList.some(tab => tab.name === current)) {
      activeTab.value = tabList[0].name
    }
    scheduleUpdateTabOverflow()
  },
  { immediate: true, deep: true }
)

onMounted(() => {
  if (!tabsWrapRef.value) return
  tabOverflowObserver = new ResizeObserver(() => {
    scheduleUpdateTabOverflow()
  })
  tabOverflowObserver.observe(tabsWrapRef.value)
  scheduleUpdateTabOverflow()
})

onBeforeUnmount(() => {
  if (tabOverflowFrame !== undefined) {
    cancelAnimationFrame(tabOverflowFrame)
    tabOverflowFrame = undefined
  }
  tabOverflowObserver?.disconnect()
  tabOverflowObserver = undefined
})
</script>

<style scoped>
.ml-overflow-tabs {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.ml-overflow-tabs-header {
  display: flex;
  align-items: stretch;
  flex: 0 0 auto;
  border-bottom: 1px solid var(--el-border-color, #dcdfe6);
  background: var(--el-bg-color, #ffffff);
  min-height: 28px;
}

.ml-overflow-tabs-wrap {
  display: flex;
  align-items: stretch;
  flex: 1 1 auto;
  min-width: 0;
}

.ml-overflow-tabs-list {
  display: flex;
  align-items: stretch;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
}

.ml-overflow-tabs-wrap :deep(.el-dropdown) {
  flex: 0 0 auto;
  display: inline-flex;
  align-self: stretch;
}

.ml-overflow-tab {
  flex: 0 0 auto;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--el-text-color-secondary, #606266);
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}

.ml-overflow-tab[hidden] {
  display: none;
}

.ml-overflow-tab:hover {
  color: var(--el-text-color-primary, #303133);
  background: var(--el-fill-color-light, rgba(0, 0, 0, 0.04));
}

.ml-overflow-tab.is-active {
  color: var(--el-text-color-primary, #303133);
  border-bottom-color: var(--el-color-primary, #409eff);
}

.ml-overflow-tab-overflow-btn {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 100%;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--el-text-color-secondary, #606266);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}

.ml-overflow-tab-overflow-btn:hover,
.ml-overflow-tab-overflow-btn.is-active {
  color: var(--el-text-color-primary, #303133);
  background: var(--el-fill-color-light, rgba(0, 0, 0, 0.04));
}

.ml-overflow-tab-overflow-btn.is-active {
  border-bottom-color: var(--el-color-primary, #409eff);
}

.ml-overflow-tabs-body {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}
</style>

<style>
.ml-overflow-tab-overflow-menu .el-dropdown-menu__item.is-selected {
  color: var(--el-color-primary, #409eff);
}
</style>
