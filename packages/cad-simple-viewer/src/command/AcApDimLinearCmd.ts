import {
  AcDbAlignedDimension,
  AcDbDatabase,
  AcDbDataGenerator,
  AcGePoint2dLike,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../app'
import {
  AcEdBaseView,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPreviewJig,
  AcEdPromptPointOptions
} from '../editor'
import { AcApI18n } from '../i18n'

export class AcApDimJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _db: AcDbDatabase
  private _dim: AcDbAlignedDimension
  private _dimBlockName = '*UDIM'

  /**
   * Creates a dimension jig.
   *
   * @param view - The associated view
   */
  constructor(
    view: AcEdBaseView,
    db: AcDbDatabase,
    xline1Point: AcGePoint3dLike,
    xline2Point: AcGePoint3dLike
  ) {
    super(view)
    this._db = db
    // Gurantee arrow block created because it is used by dimension
    const generator = new AcDbDataGenerator(db)
    generator.createArrowBlock()
    this._dim = new AcDbAlignedDimension(xline1Point, xline2Point, xline1Point)
    this._dim.rotation = 0
  }

  get entity(): AcDbAlignedDimension {
    return this._dim
  }

  update(point: AcGePoint3dLike) {
    this._dim.dimLinePoint = point
    this._dim.rotation = this.calculateAngle(
      this._dim.xLine1Point,
      this._dim.xLine2Point
    )
    this._dim.dimensionText = this._dim.xLine1Point
      .distanceTo(this._dim.xLine2Point)
      .toFixed(3)

    const blockName = this._dimBlockName
    this._db.tables.blockTable.remove(blockName)
    this._db.tables.blockTable.add(this._dim.createDimBlock(blockName))
    this._dim.dimBlockId = blockName
  }

  end() {
    super.end()
    this._db.tables.blockTable.remove(this._dimBlockName)
  }

  private calculateAngle(p1: AcGePoint2dLike, p2: AcGePoint2dLike) {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    return Math.atan2(dy, dx)
  }
}

/**
 * Command to create one aligned dimension.
 */
export class AcApDimLinearCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Review
  }

  async execute(context: AcApContext) {
    const xLine1PointPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.dimlinear.xLine1Point')
    )
    const xLine1Point =
      await AcApDocManager.instance.editor.getPoint(xLine1PointPrompt)

    const xLine2PointPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.dimlinear.xLine2Point')
    )
    xLine2PointPrompt.useBasePoint = true
    const xLine2Point =
      await AcApDocManager.instance.editor.getPoint(xLine2PointPrompt)

    const dimLinePointPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.dimlinear.dimLinePoint')
    )
    dimLinePointPrompt.jig = new AcApDimJig(
      context.view,
      context.doc.database,
      xLine1Point,
      xLine2Point
    )
    const dimLinePoint =
      await AcApDocManager.instance.editor.getPoint(dimLinePointPrompt)

    const db = context.doc.database
    const dimension = new AcDbAlignedDimension(
      xLine1Point,
      xLine2Point,
      dimLinePoint
    )

    const blockName = this.getAvaiableDimBlockName(db)
    db.tables.blockTable.add(dimension.createDimBlock(blockName))
    dimension.dimBlockId = blockName
    db.tables.blockTable.modelSpace.appendEntity(dimension)
  }

  private getAvaiableDimBlockName(db: AcDbDatabase) {
    const blocks = db.tables.blockTable.newIterator()

    let maxNum = 0

    for (const block of blocks) {
      const name = block.name
      if (!name.startsWith('*D')) continue

      const num = Number(name.slice(2)) // part after "*D"
      if (Number.isInteger(num) && num > maxNum) {
        maxNum = num
      }
    }

    return `*D${maxNum + 1}`
  }
}
