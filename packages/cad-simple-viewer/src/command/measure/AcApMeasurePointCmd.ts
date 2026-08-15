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
import {
  acapGetCurrentMeasurementStyle,
  type AcApMeasurementStyle
} from '../../util'
import { AcTrView2d } from '../../view'
import { AcApMeasurePointEntity } from './entity'

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
  AcApMeasurePointEntity.create(point, style, options).commit(view, db)
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
          acapGetCurrentMeasurementStyle(db)
        )
      })
    )
  }
}
