import type { AcDbObjectId } from '@mlightcad/data-model'
import { AcTrHtmlGroup } from '@mlightcad/three-renderer'

import type { AcTrView2d } from '../../view'

/** HTML transient layer for committed measurement overlays. */
export const MEASUREMENT_LAYER = 'measurement'

/** HTML transient layer for in-progress jig / live preview overlays. */
export const MEASUREMENT_LIVE_LAYER = 'measurement-live'

/**
 * Optional non-HTML resources attached to a measurement {@link AcTrHtmlGroup}.
 */
export interface AcApMeasurementGroupExtras {
  /** CAD transient entity object ids (lines, etc.). */
  entityIds?: AcDbObjectId[]
  /**
   * Removes non-HTML resources (CAD transients, viewChanged listeners).
   * HTML children and group-owned canvas overlays are removed by the html
   * transient manager / group dispose.
   */
  dispose?: () => void
}

/**
 * Publishes a measurement {@link AcTrHtmlGroup} and wires measurement-specific
 * selection extras (CAD entity highlight).
 *
 * The group itself (children, canvases, click selection, Delete, layout
 * visibility) is handled by {@link AcTrHtmlTransientManager}.
 */
export function commitMeasurementGroup(
  view: AcTrView2d,
  group: AcTrHtmlGroup,
  extras?: AcApMeasurementGroupExtras
): void {
  const entityIds = extras?.entityIds ?? []

  const prevSelectedChanged = group.onSelectedChanged
  group.onSelectedChanged = (selected, g) => {
    prevSelectedChanged?.(selected, g)
    if (entityIds.length === 0) return
    if (selected) {
      view.highlight(entityIds)
    } else {
      view.unhighlight(entityIds)
    }
  }

  const prevVisibleChanged = group.onVisibleChanged
  group.onVisibleChanged = (visible, g) => {
    prevVisibleChanged?.(visible, g)
    for (const objectId of entityIds) {
      view.setTransientEntityVisible(objectId, visible)
    }
  }

  const prevDispose = group.onDispose
  group.onDispose = () => {
    prevDispose?.()
    // Ensure CAD highlights are cleared even if deletion skipped deselect.
    if (entityIds.length > 0) {
      view.unhighlight(entityIds)
    }
    try {
      extras?.dispose?.()
    } catch {
      // Ignore dispose errors from domain cleanups.
    }
  }

  view.htmlTransientManager.add(group)
  view.isDirty = true
}
