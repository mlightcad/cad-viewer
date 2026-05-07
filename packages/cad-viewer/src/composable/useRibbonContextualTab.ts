import type { AcEdCommandEventArgs } from '@mlightcad/cad-simple-viewer'
import { type Ref, ref } from 'vue'

export interface UseRibbonContextualTabOptions {
  activeTabId: Ref<string>
  tabId: string
  commandGlobalNames: string | readonly string[]
  fallbackTabId?: string
}

export function useRibbonContextualTab({
  activeTabId,
  tabId,
  commandGlobalNames,
  fallbackTabId = 'home'
}: UseRibbonContextualTabOptions) {
  const commandNameSet = new Set(
    Array.isArray(commandGlobalNames)
      ? commandGlobalNames
      : [commandGlobalNames]
  )
  const isVisible = ref(false)
  const isCommandActive = ref(false)
  const previousTabId = ref(fallbackTabId)

  const isContextCommand = (args: AcEdCommandEventArgs) => {
    const globalName = args.command?.globalName
    return globalName != null && commandNameSet.has(globalName)
  }

  const showContextTab = () => {
    if (activeTabId.value !== tabId) {
      previousTabId.value = activeTabId.value || fallbackTabId
    }
    isVisible.value = true
    activeTabId.value = tabId
  }

  const hideContextTab = () => {
    isVisible.value = false
    if (activeTabId.value === tabId) {
      activeTabId.value = previousTabId.value || fallbackTabId
    }
  }

  const handleCommandWillStart = (args: AcEdCommandEventArgs) => {
    if (!isContextCommand(args)) return
    isCommandActive.value = true
    showContextTab()
  }

  const handleCommandEnded = (args: AcEdCommandEventArgs) => {
    if (!isContextCommand(args)) return
    isCommandActive.value = false
    hideContextTab()
  }

  return {
    isVisible,
    isCommandActive,
    previousTabId,
    isContextCommand,
    showContextTab,
    hideContextTab,
    handleCommandWillStart,
    handleCommandEnded
  }
}
