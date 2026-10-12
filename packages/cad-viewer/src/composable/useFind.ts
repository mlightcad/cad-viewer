import {
  type AcApDocManager,
  type AcApFindLayoutHit,
  type AcApFindScope,
  acapFindText,
  type AcApFindViewInsets,
  acapNavigateToFindHit
} from '@mlightcad/cad-simple-viewer'
import { computed, ref, shallowRef } from 'vue'

/** Search state shown by the Find palette. */
export type MlFindState = 'idle' | 'done' | 'no-document'

/**
 * State and actions of the Find palette (FIND).
 *
 * Searches TEXT, MTEXT and block attribute values of the whole drawing (all
 * layouts) by default, or of the active layout only when `currentLayoutOnly`
 * is set. The search is shared with cad-simple-ui-plugin
 * (`@mlightcad/cad-simple-viewer/find`) so both UIs behave identically. It runs
 * only when {@link MlFindApi.search} is called (Enter / Find button), never
 * while typing. {@link MlFindApi.navigateTo} activates the hit's layout when
 * needed, then zooms to the text and selects its entity.
 */
export function useFind(
  editor: AcApDocManager,
  options: {
    /**
     * Canvas pixels covered by the palette (or other UI) when navigating, so
     * the hit is framed in the part of the drawing that stays visible.
     */
    getInsets?: () => AcApFindViewInsets | undefined
  } = {}
) {
  const query = ref('')
  const matchCase = ref(false)
  const currentLayoutOnly = ref(false)
  const hits = shallowRef<AcApFindLayoutHit[]>([])
  const truncated = ref(false)
  const state = ref<MlFindState>('idle')
  const activeIndex = ref(-1)
  /** Set when the last navigation could not open the hit's layout. */
  const unavailableLayout = ref('')
  /** Query, options and active layout used for the last search. */
  let searched:
    | {
        query: string
        matchCase: boolean
        scope: AcApFindScope
        layoutId: string
      }
    | undefined

  const scope = computed<AcApFindScope>(() =>
    currentLayoutOnly.value ? 'layout' : 'drawing'
  )
  /** Number of distinct layouts that contain at least one hit. */
  const layoutCount = computed(
    () => new Set(hits.value.map(hit => hit.layoutId)).size
  )

  const reset = (next: MlFindState) => {
    hits.value = []
    truncated.value = false
    activeIndex.value = -1
    unavailableLayout.value = ''
    searched = undefined
    state.value = next
  }

  /** Runs a search with the current query and options. */
  const search = () => {
    const view = editor.curView
    const db = editor.curDocument?.database
    if (!view || !db) {
      reset('no-document')
      return
    }
    if (!query.value.trim()) {
      reset('idle')
      return
    }
    const layoutId = view.activeLayoutBtrId
    const result = acapFindText(db, query.value, {
      matchCase: matchCase.value,
      scope: scope.value,
      currentLayoutId: layoutId
    })
    hits.value = result.hits
    truncated.value = result.truncated
    activeIndex.value = -1
    unavailableLayout.value = ''
    searched = {
      query: query.value,
      matchCase: matchCase.value,
      scope: scope.value,
      layoutId
    }
    state.value = 'done'
  }

  /** Re-runs the search when one was already done (option changed). */
  const refresh = () => {
    if (searched) search()
  }

  /**
   * Activates the hit's layout if needed, zooms to the hit and selects it.
   * With the current-layout scope, a layout change since the search re-runs it
   * instead (the results no longer apply); drawing-wide results stay valid.
   */
  const navigateTo = async (index: number) => {
    const view = editor.curView
    const hit = hits.value[index]
    if (!view || !editor.curDocument || !hit || !searched) return
    if (
      searched.scope === 'layout' &&
      view.activeLayoutBtrId !== searched.layoutId
    ) {
      search()
      return
    }
    activeIndex.value = index
    unavailableLayout.value = ''
    const outcome = await acapNavigateToFindHit(editor, hit, {
      insets: options.getInsets?.()
    })
    if (
      outcome === 'layout-missing' ||
      outcome === 'layout-switch-failed' ||
      outcome === 'layout-mismatch'
    ) {
      unavailableLayout.value = hit.layoutName
    }
  }

  /**
   * Enter in the query field: searches (and goes to the first hit) when the
   * query or options changed, otherwise steps to the next / previous hit.
   */
  const submit = async (backwards = false) => {
    const same =
      searched &&
      searched.query === query.value &&
      searched.matchCase === matchCase.value &&
      searched.scope === scope.value
    if (!same || hits.value.length === 0) {
      search()
      if (hits.value.length > 0) await navigateTo(0)
      return
    }
    const count = hits.value.length
    const next =
      activeIndex.value < 0
        ? 0
        : (activeIndex.value + (backwards ? count - 1 : 1)) % count
    await navigateTo(next)
  }

  return {
    query,
    matchCase,
    currentLayoutOnly,
    scope,
    hits,
    truncated,
    state,
    activeIndex,
    layoutCount,
    unavailableLayout,
    search,
    refresh,
    submit,
    navigateTo
  }
}

/** Return type of {@link useFind}. */
export type MlFindApi = ReturnType<typeof useFind>
