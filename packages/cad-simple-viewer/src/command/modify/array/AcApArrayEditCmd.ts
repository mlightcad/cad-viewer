import {
  AcDbAssocArrayActionBody,
  AcDbAssocArrayCommonParameters,
  AcDbAssocArrayPathParameters,
  AcDbAssocArrayPolarParameters,
  AcDbAssocArrayRectangularParameters,
  AcDbAssocManager,
  AcDbBlockReference,
  AcDbEntity
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../../app/index.js'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptAngleOptions,
  AcEdPromptDistanceOptions,
  AcEdPromptIntegerOptions,
  AcEdPromptKeywordOptions,
  AcEdPromptSelectionOptions,
  AcEdPromptStatus
} from '../../../editor/index.js'
import { AcApI18n } from '../../../i18n/index.js'

/**
 * ARRAYEDIT — edits an associative array's parameters and re-evaluates.
 */
export class AcApArrayEditCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const body = await this.pickArrayBody(context)
    if (!body || !body.parameters) return

    const params = body.parameters
    try {
      await this.editLoop(body, params)
    } finally {
      // Parameters mutate in place inside the undo mark. Even when the user
      // cancels mid-edit, the earlier edits are already committed, so the
      // network must be evaluated and the view rebuilt or the drawing keeps
      // showing the old item count / spacing.
      this.refreshArray(context, body)
    }
  }

  private async editLoop(
    body: AcDbAssocArrayActionBody,
    params: NonNullable<AcDbAssocArrayActionBody['parameters']>
  ) {
    for (;;) {
      const opt = new AcEdPromptKeywordOptions(
        AcApI18n.t('jig.array.editOptions')
      )
      if (params instanceof AcDbAssocArrayRectangularParameters) {
        this.addKeyword(opt, 'columns')
        this.addKeyword(opt, 'rows')
        this.addKeyword(opt, 'spacing')
      } else if (params instanceof AcDbAssocArrayPolarParameters) {
        this.addKeyword(opt, 'items')
        this.addKeyword(opt, 'fillAngle')
        this.addKeyword(opt, 'rotateItems')
      } else if (params instanceof AcDbAssocArrayPathParameters) {
        this.addKeyword(opt, 'items')
        this.addKeyword(opt, 'alignItems')
      }
      this.addKeyword(opt, 'exit')

      const result = await AcApDocManager.instance.editor.getKeywords(opt)
      if (
        result.status !== AcEdPromptStatus.OK &&
        result.status !== AcEdPromptStatus.Keyword
      ) {
        return
      }

      const key = (result.stringResult || 'eXit').toUpperCase()
      if (key === 'EXIT' || key === 'X') break

      if (params instanceof AcDbAssocArrayCommonParameters) {
        if (key === 'COLUMNS' || key === 'COL') {
          const n = await this.promptInteger(
            AcApI18n.t('jig.array.columnCount'),
            params.columnCount,
            1
          )
          if (n == null) return
          params.columnCount = n
          body.markDirty()
        } else if (key === 'ROWS' || key === 'R') {
          const n = await this.promptInteger(
            AcApI18n.t('jig.array.rowCount'),
            params.rowCount,
            1
          )
          if (n == null) return
          params.rowCount = n
          body.markDirty()
        } else if (key === 'SPACING' || key === 'S') {
          const col = await this.promptDistance(
            AcApI18n.t('jig.array.columnSpacing'),
            params.columnSpacing
          )
          if (col == null) return
          const row = await this.promptDistance(
            AcApI18n.t('jig.array.rowSpacing'),
            params.rowSpacing
          )
          if (row == null) return
          params.columnSpacing = col
          params.rowSpacing = row
          body.markDirty()
        } else if (key === 'ITEMS' || key === 'I') {
          const n = await this.promptInteger(
            AcApI18n.t('jig.array.itemCount'),
            params.itemCount,
            1
          )
          if (n == null) return
          params.itemCount = n
          body.markDirty()
        }
      }

      if (params instanceof AcDbAssocArrayPolarParameters) {
        if (key === 'FILLANGLE' || key === 'F') {
          // getAngle returns degrees; polar parameters store radians.
          const angleOpt = new AcEdPromptAngleOptions(
            AcApI18n.t('jig.array.fillAngle')
          )
          angleOpt.defaultValue = (params.fillAngle * 180) / Math.PI
          const angleResult =
            await AcApDocManager.instance.editor.getAngle(angleOpt)
          if (angleResult.status === AcEdPromptStatus.Cancel) return
          if (
            angleResult.status === AcEdPromptStatus.OK &&
            angleResult.value != null
          ) {
            const fillAngle = (angleResult.value * Math.PI) / 180
            params.fillAngle = fillAngle
            const fullCircle =
              Math.abs(Math.abs(fillAngle) - Math.PI * 2) < 1e-9
            if (fullCircle && params.itemCount > 0) {
              params.angleBetweenItems = (Math.PI * 2) / params.itemCount
            }
            body.markDirty()
          }
        } else if (key === 'ROTATEITEMS' || key === 'ROT') {
          params.rotateItems = !params.rotateItems
          body.markDirty()
        }
      }

      if (params instanceof AcDbAssocArrayPathParameters) {
        if (key === 'ALIGNITEMS' || key === 'A') {
          params.alignItems = !params.alignItems
          body.markDirty()
        }
      }
    }
  }

  private refreshArray(context: AcApContext, body: AcDbAssocArrayActionBody) {
    AcDbAssocManager.evaluateTopLevelNetwork(context.doc.database)

    const arrayEntity = context.doc.database.getObjectById(body.arrayEntityId)
    if (arrayEntity instanceof AcDbEntity) {
      // Force the view to rebuild the anonymous block contents.
      context.view.removeEntity(arrayEntity)
      context.view.addEntity(arrayEntity)
    }
  }

  private async pickArrayBody(
    context: AcApContext
  ): Promise<AcDbAssocArrayActionBody | undefined> {
    const opt = new AcEdPromptSelectionOptions(
      AcApI18n.t('jig.array.selectArray')
    )
    const result = await AcApDocManager.instance.editor.getSelection(opt)
    if (
      result.status !== AcEdPromptStatus.OK ||
      !result.value ||
      result.value.count === 0
    ) {
      return undefined
    }

    for (const id of result.value.ids) {
      const entity = context.doc.database.tables.blockTable.getEntityById(id)
      if (!(entity instanceof AcDbBlockReference)) continue
      const body = AcDbAssocArrayActionBody.getAssociativeArray(entity)
      if (body) return body
    }

    AcApDocManager.instance.editor.showMessage(
      AcApI18n.t('jig.array.notAssociative'),
      'warning'
    )
    return undefined
  }

  private addKeyword(
    prompt: AcEdPromptKeywordOptions,
    key:
      | 'columns'
      | 'rows'
      | 'spacing'
      | 'items'
      | 'fillAngle'
      | 'rotateItems'
      | 'alignItems'
      | 'exit'
  ) {
    prompt.keywords.add(
      AcApI18n.t(`jig.array.keywords.${key}.display`),
      AcApI18n.t(`jig.array.keywords.${key}.global`),
      AcApI18n.t(`jig.array.keywords.${key}.local`)
    )
  }

  private async promptInteger(
    message: string,
    defaultValue: number,
    lowerLimit: number
  ): Promise<number | undefined> {
    const opt = new AcEdPromptIntegerOptions(message)
    opt.defaultValue = defaultValue
    opt.lowerLimit = lowerLimit
    const result = await AcApDocManager.instance.editor.getInteger(opt)
    if (result.status === AcEdPromptStatus.Cancel) return undefined
    if (result.status === AcEdPromptStatus.OK && result.value != null) {
      return result.value
    }
    return defaultValue
  }

  private async promptDistance(
    message: string,
    defaultValue: number
  ): Promise<number | undefined> {
    const opt = new AcEdPromptDistanceOptions(message)
    opt.defaultValue = defaultValue
    const result = await AcApDocManager.instance.editor.getDistance(opt)
    if (result.status === AcEdPromptStatus.Cancel) return undefined
    if (result.status === AcEdPromptStatus.OK && result.value != null) {
      return result.value
    }
    return defaultValue
  }
}
