import { AcDbDatabase, AcGePoint3dLike } from '@mlightcad/data-model'

import { AcApContext } from '../../app'
import {
  AcEdCommand,
  AcEdCorsorType,
  AcEdOpenMode,
  AcEdPromptPointOptions,
  AcEdPromptStatus,
  AcEdViewMode
} from '../../editor'
import { AcApI18n } from '../../i18n'
import { makeBadge, makeDot, measurementColor } from '../../util'
import { AcTrView2d } from '../../view'
import { registerMeasurementCleanup } from './AcApClearMeasurementsCmd'

/** Formats an X/Y coordinate label using the drawing length formatter. */
function formatCoordinateLabel(
  db: AcDbDatabase,
  point: AcGePoint3dLike
): string {
  const opts = { showUnits: true, showApproximate: true }
  const x = db.formatter.formatLength(point.x, opts)
  const y = db.formatter.formatLength(point.y, opts)
  return `X ${x}  Y ${y}`
}

/**
 * Command that measures the world X/Y coordinates of a picked point.
 *
 * Prompts the user to pick one world point, then places a persistent dot and
 * coordinate badge via {@link AcTrHtmlTransientManager}. The overlays are
 * cleared by {@link registerMeasurementCleanup}.
 */
export class AcApMeasurePointCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  async execute(context: AcApContext) {
    const editor = context.view.editor
    const db = context.doc.database
    const color = measurementColor(db)

    await context.view.withMode(AcEdViewMode.SELECTION, () =>
      editor.withCursor(AcEdCorsorType.Crosshair, async () => {
        const pointPrompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.measurePoint.point')
        )
        const pointResult = await editor.getPoint(pointPrompt)
        if (pointResult.status !== AcEdPromptStatus.OK) return
        const point = pointResult.value!

        const htManager = (context.view as AcTrView2d).htmlTransientManager
        const id = `point-${Date.now()}`
        const label = formatCoordinateLabel(db, point)

        const badge = makeBadge(color, label)
        // Offset the badge above the marker so it does not cover the dot.
        badge.style.transform = 'translate(-50%, calc(-50% - 16px))'

        htManager.add(`${id}-dot`, makeDot(color), point, 'measurement')
        htManager.add(`${id}-badge`, badge, point, 'measurement')
        // CSS2D overlays only appear after a render pass; without a CAD
        // transient entity nothing else dirties the view, so force one.
        ;(context.view as AcTrView2d).isDirty = true

        registerMeasurementCleanup(() => {
          htManager.remove(`${id}-dot`)
          htManager.remove(`${id}-badge`)
          ;(context.view as AcTrView2d).isDirty = true
        })
      })
    )
  }
}
