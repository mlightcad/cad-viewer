import { useEventListener, useResizeObserver } from '@vueuse/core'
import {
  inject,
  type InjectionKey,
  nextTick,
  provide,
  readonly,
  type Ref,
  ref,
  watch
} from 'vue'

/**
 * Viewport-relative rectangle of the current viewer host element.
 *
 * The values come from `getBoundingClientRect()`, so they are expressed in
 * CSS pixels relative to the browser viewport rather than the document.
 */
export interface ViewerRect {
  top: number
  left: number
  width: number
  height: number
}

const EMPTY_VIEWER_RECT: ViewerRect = {
  top: 0,
  left: 0,
  width: 0,
  height: 0
}

const viewerRectKey: InjectionKey<Readonly<Ref<ViewerRect>>> =
  Symbol('viewerRect')

const emptyViewerRect = readonly(ref<ViewerRect>(EMPTY_VIEWER_RECT))

/**
 * Creates and provides a reactive viewport rectangle for a viewer host element.
 *
 * This function is meant to be called once near the root of a viewer subtree,
 * typically from the main viewer component that owns the container element.
 * It measures the target element with `getBoundingClientRect()`, keeps the
 * result synchronized as layout changes, and exposes that state to descendants
 * through Vue's dependency injection.
 *
 * Synchronization happens in three situations:
 * 1. When the target element starts existing.
 * 2. When the target element is resized.
 * 3. When the browser window is resized.
 *
 * Descendants can then consume the provided state with {@link useViewerRect}
 * without prop drilling through intermediate components.
 *
 * @param targetRef - Ref pointing at the viewer host element to observe.
 * @returns A readonly reactive ref containing the latest viewer rectangle.
 */
export function provideViewerRect(targetRef: Ref<HTMLElement | undefined>) {
  const viewerRect = ref<ViewerRect>(EMPTY_VIEWER_RECT)

  /**
   * Re-measures the current target element and writes the latest rectangle
   * into the reactive viewer state.
   *
   * If the target element does not exist yet, the function leaves the current
   * state unchanged. This makes it safe to call from lifecycle hooks,
   * watchers, and DOM observers before the viewer has fully mounted.
   */
  function updateViewerRect() {
    const rect = targetRef.value?.getBoundingClientRect()
    if (!rect) return

    viewerRect.value = {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height
    }
  }

  /**
   * Refreshes the viewer rectangle after the target ref resolves to a concrete
   * DOM element.
   *
   * Waiting for `nextTick()` ensures the element has been rendered with its
   * final layout before measuring, which avoids capturing stale zero-sized or
   * pre-layout geometry during mount and conditional rendering transitions.
   *
   * @param element - The latest DOM element resolved from `targetRef`.
   * Undefined values are ignored because there is nothing to measure yet.
   */
  async function syncViewerRectWhenElementChanges(
    element: HTMLElement | undefined
  ) {
    if (!element) return
    await nextTick()
    updateViewerRect()
  }

  useResizeObserver(targetRef, () => {
    updateViewerRect()
  })

  useEventListener(window, 'resize', updateViewerRect)

  watch(
    targetRef,
    element => {
      void syncViewerRectWhenElementChanges(element)
    },
    { immediate: true }
  )

  const readonlyViewerRect = readonly(viewerRect)
  provide(viewerRectKey, readonlyViewerRect)

  return readonlyViewerRect
}

/**
 * Returns the reactive rectangle of the current viewer subtree.
 *
 * This function reads the rectangle previously registered by
 * {@link provideViewerRect}. It is intended for floating panels, overlays, and
 * other layout-aware descendants that need to align themselves to the current
 * viewer host element.
 *
 * When no provider exists in the current component tree, the function returns
 * a shared readonly zero rectangle as a safe fallback. That behavior keeps the
 * API easy to consume in optional or test-only contexts without forcing every
 * caller to guard for `undefined`.
 *
 * @returns A readonly reactive ref containing the current viewer rectangle, or
 * a zero rectangle when no provider is available.
 */
export function useViewerRect() {
  return inject(viewerRectKey, emptyViewerRect)
}
