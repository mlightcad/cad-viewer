import {
  acapBuildDataSourceMenu,
  type AcApDataSourceMenuItem,
  AcApDocManager,
  acapIsSingleLocalOpen} from '@mlightcad/cad-simple-viewer'
import { onMounted, onUnmounted, type Ref,ref } from 'vue'

/**
 * Reactive list of Open-menu items from {@link AcApDocManager.dataSourceManager}.
 *
 * Rebuilds on source registry changes and auth changes so cloud Sign in /
 * Open / Sign out labels stay in sync.
 */
export function useDataSources(): {
  menuItems: Ref<AcApDataSourceMenuItem[]>
  isSingleLocalOpen: Ref<boolean>
} {
  const menuItems = ref<AcApDataSourceMenuItem[]>([])
  const isSingleLocalOpen = ref(true)

  const refresh = () => {
    try {
      const sources = AcApDocManager.instance.dataSourceManager.list()
      menuItems.value = acapBuildDataSourceMenu(sources)
      isSingleLocalOpen.value = acapIsSingleLocalOpen(sources)
    } catch {
      menuItems.value = []
      isSingleLocalOpen.value = true
    }
  }

  const onChanged = () => refresh()
  const onAuthChanged = () => refresh()

  onMounted(() => {
    refresh()
    try {
      const dsm = AcApDocManager.instance.dataSourceManager
      dsm.on('changed', onChanged)
      dsm.on('auth-changed', onAuthChanged)
    } catch {
      // DocManager may not exist yet in some unit-test hosts
    }
  })

  onUnmounted(() => {
    try {
      const dsm = AcApDocManager.instance.dataSourceManager
      dsm.off('changed', onChanged)
      dsm.off('auth-changed', onAuthChanged)
    } catch {
      // ignore
    }
  })

  return { menuItems, isSingleLocalOpen }
}
