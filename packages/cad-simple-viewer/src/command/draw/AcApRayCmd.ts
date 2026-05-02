import { AcDbRay, AcGePoint3d, AcGePoint3dLike } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../../editor'
import { AcApI18n } from '../../i18n'

const ACAP_RAY_EPSILON = 1e-9

function resolveUnitDirection(
  start: AcGePoint3dLike,
  through: AcGePoint3dLike
): AcGePoint3d | undefined {
  const direction = new AcGePoint3d(through).sub(start)
  if (direction.lengthSq() <= ACAP_RAY_EPSILON) return undefined
  return direction.normalize()
}

/**
 * Dynamic preview jig for RAY command.
 */
class AcApRayJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private readonly _startPoint: AcGePoint3d
  private readonly _ray: AcDbRay

  constructor(view: AcEdBaseView, start: AcGePoint3dLike) {
    super(view)
    this._startPoint = new AcGePoint3d(start)
    this._ray = new AcDbRay()
    this._ray.basePoint = new AcGePoint3d(start)
    this._ray.unitDir = new AcGePoint3d(1, 0, 0)
  }

  get entity() {
    return this._ray
  }

  update(point: AcGePoint3dLike) {
    const unitDir = resolveUnitDirection(this._startPoint, point)
    if (!unitDir) return
    this._ray.basePoint = new AcGePoint3d(this._startPoint)
    this._ray.unitDir = unitDir
  }
}

/**
 * Command to create one or more rays from a common start point.
 */
export class AcApRayCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const db = context.doc.database
    const startPointPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.ray.startPoint')
    )
    const startPointResult =
      await AcApDocManager.instance.editor.getPoint(startPointPrompt)
    if (startPointResult.status !== AcEdPromptStatus.OK) return

    const startPoint = new AcGePoint3d(startPointResult.value!)

    while (true) {
      const throughPointPrompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.ray.throughPoint')
      )
      throughPointPrompt.useDashedLine = true
      throughPointPrompt.useBasePoint = true
      throughPointPrompt.basePoint = new AcGePoint3d(startPoint)
      throughPointPrompt.jig = new AcApRayJig(context.view, startPoint)

      const throughPointResult =
        await AcApDocManager.instance.editor.getPoint(throughPointPrompt)
      if (throughPointResult.status !== AcEdPromptStatus.OK) break

      const unitDir = resolveUnitDirection(
        startPoint,
        throughPointResult.value!
      )
      if (!unitDir) continue

      const ray = new AcDbRay()
      ray.basePoint = new AcGePoint3d(startPoint)
      ray.unitDir = unitDir
      db.tables.blockTable.modelSpace.appendEntity(ray)
    }
  }
}
