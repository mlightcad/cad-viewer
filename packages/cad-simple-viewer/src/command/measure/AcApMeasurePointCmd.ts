import { AcDbDatabase, AcGePoint3dLike } from '@mlightcad/data-model'
import {
  AcTrHtmlBadge,
  AcTrHtmlDot,
  AcTrHtmlGroup
} from '@mlightcad/three-renderer'

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
import { currentMeasurementStyle, measurementColor } from '../../util'
import { AcTrView2d } from '../../view'
import {
  commitMeasurementGroup,
  MEASUREMENT_LAYER
} from './AcApMeasurementStore'

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
 * cleared by {@link commitMeasurementGroup}.
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
    const style = currentMeasurementStyle(db)

    await context.view.withMode(AcEdViewMode.SELECTION, () =>
      editor.withCursor(AcEdCorsorType.Crosshair, async () => {
        const pointPrompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.measurePoint.point')
        )
        const pointResult = await editor.getPoint(pointPrompt)
        if (pointResult.status !== AcEdPromptStatus.OK) return
        const point = pointResult.value!

        const id = `point-${Date.now()}`
        const label = formatCoordinateLabel(db, point)

        const group = new AcTrHtmlGroup({
          id,
          layer: MEASUREMENT_LAYER,
          layoutId: (context.view as AcTrView2d).activeLayoutBtrId,
          selectable: true
        }).add(
          new AcTrHtmlDot({
            id: `${id}-dot`,
            color,
            worldPosition: point,
            layer: MEASUREMENT_LAYER
          }),
          new AcTrHtmlBadge({
            id: `${id}-badge`,
            color,
            text: label,
            worldPosition: point,
            layer: MEASUREMENT_LAYER,
            fontSize: style.fontSize,
            // Offset the badge above the marker so it does not cover the dot.
            transform: 'translate(-50%, calc(-50% - 16px))'
          })
        )

        commitMeasurementGroup(context.view as AcTrView2d, group, { style })
      })
    )
  }
}
