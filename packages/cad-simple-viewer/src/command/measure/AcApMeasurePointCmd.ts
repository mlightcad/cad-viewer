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
import {
  acapCurrentMeasurementStyle,
  type AcApMeasurementStyle,
  formatMeasurementValue
} from '../../util'
import { AcTrView2d } from '../../view'
import { serializeMeasurementStyle } from './AcApMeasurementSidecar'
import {
  commitMeasurementGroup,
  MEASUREMENT_LAYER
} from './AcApMeasurementStore'

/**
 * Commit a coordinate measurement overlay (also used when importing a sidecar).
 */
export function placePointMeasurement(
  view: AcTrView2d,
  db: AcDbDatabase,
  point: AcGePoint3dLike,
  style: AcApMeasurementStyle,
  options?: { id?: string; layoutId?: string }
): void {
  const id = options?.id ?? `point-${Date.now()}`
  const layoutId = options?.layoutId ?? view.activeLayoutBtrId
  const value = { kind: 'coordinate' as const, x: point.x, y: point.y }
  const color = style.color

  const group = new AcTrHtmlGroup({
    id,
    layer: MEASUREMENT_LAYER,
    layoutId,
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
      text: formatMeasurementValue(db, value),
      worldPosition: point,
      layer: MEASUREMENT_LAYER,
      fontSize: style.fontSize,
      transform: 'translate(-50%, calc(-50% - 16px))'
    })
  )

  commitMeasurementGroup(view, group, {
    style,
    value,
    snapshot: {
      id,
      type: 'point',
      layoutId,
      style: serializeMeasurementStyle(style),
      geometry: {
        type: 'point',
        position: { x: point.x, y: point.y }
      }
    }
  })
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

    await context.view.withMode(AcEdViewMode.SELECTION, () =>
      editor.withCursor(AcEdCorsorType.Crosshair, async () => {
        const pointPrompt = new AcEdPromptPointOptions(
          AcApI18n.t('jig.measurePoint.point')
        )
        const pointResult = await editor.getPoint(pointPrompt)
        if (pointResult.status !== AcEdPromptStatus.OK) return
        const point = pointResult.value!
        placePointMeasurement(
          context.view as AcTrView2d,
          db,
          point,
          acapCurrentMeasurementStyle(db)
        )
      })
    )
  }
}
