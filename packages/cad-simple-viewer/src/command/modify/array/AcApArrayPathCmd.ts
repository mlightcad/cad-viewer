import {
  AcDbAssocArrayPathMethod,
  AcDbAssocArrayPathParameters,
  AcDbCurve,
  AcGePoint3d
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../../app/index.js'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptIntegerOptions,
  AcEdPromptKeywordOptions,
  AcEdPromptPointOptions,
  AcEdPromptSelectionOptions,
  AcEdPromptStatus
} from '../../../editor/index.js'
import { AcApI18n } from '../../../i18n/index.js'
import { resolveSelectedEntities } from '../../../service/index.js'
import { acapArraySelectionBasePoint } from './AcApArrayBasePoint.js'
import { acapArrayAssociativity, acapCommitArray } from './AcApArrayCommit.js'
import { AcApArrayPreview } from './AcApArrayPreview.js'

/**
 * ARRAYPATH — creates a path associative (or classic) array.
 */
export class AcApArrayPathCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const selection = await resolveSelectedEntities(context, {
      promptKey: 'arraypath'
    })
    if (!selection) return

    const { entities, ids: sourceIds } = selection
    let associative = acapArrayAssociativity(context.doc.database)

    // Drop array sources from the pick-first set before the path prompt.
    // getSelection merges into view.selectionSet, so a leftover source (e.g.
    // the circle at the path start) would otherwise be returned as ids[0].
    context.view.selectionSet.clear()

    const pathEntity = await this.promptPathCurve(context, sourceIds)
    if (!pathEntity) return

    // AutoCAD: after the path is chosen, preview starts immediately with a
    // default base on the source objects. "Base point" is an option — forcing
    // an upfront pick made users snap the path end and offset every item.
    let basePoint = acapArraySelectionBasePoint(
      entities,
      new AcGePoint3d(
        pathEntity.getPointAtParam(pathEntity.startParam) ?? {
          x: 0,
          y: 0,
          z: 0
        }
      )
    )

    let itemCount = 5
    let method = AcDbAssocArrayPathMethod.kDivide
    let alignItems = true

    const pathLength = this.curveLength(pathEntity)
    let preview = new AcApArrayPreview(context.view, entities, basePoint)
    const refreshPreview = () => {
      preview.refresh(
        this.buildParams({
          pathEntity,
          pathLength,
          itemCount,
          method,
          alignItems,
          basePoint
        })
      )
    }
    refreshPreview()

    try {
      for (;;) {
        const opt = new AcEdPromptKeywordOptions(
          AcApI18n.t('jig.array.pathOptions')
            .replace('{items}', String(itemCount))
            .replace('{associative}', associative ? 'Yes' : 'No')
        )
        this.addKeyword(opt, 'associative')
        this.addKeyword(opt, 'base')
        this.addKeyword(opt, 'method')
        this.addKeyword(opt, 'items')
        this.addKeyword(opt, 'alignItems')
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

        if (key === 'ASSOCIATIVE' || key === 'AS') {
          associative = await this.promptYesNo(associative)
        } else if (key === 'BASE' || key === 'B') {
          const next = await this.promptBasePoint(basePoint)
          if (next == null) return
          basePoint = next
          preview.dispose()
          preview = new AcApArrayPreview(context.view, entities, basePoint)
          refreshPreview()
        } else if (key === 'METHOD' || key === 'M') {
          method = await this.promptMethod(method)
          refreshPreview()
        } else if (key === 'ITEMS' || key === 'I') {
          const n = await this.promptInteger(
            AcApI18n.t('jig.array.itemCount'),
            itemCount,
            1
          )
          if (n == null) return
          itemCount = n
          refreshPreview()
        } else if (key === 'ALIGNITEMS' || key === 'A') {
          alignItems = await this.promptYesNo(alignItems)
          refreshPreview()
        } else {
          break
        }
      }

      const params = this.buildParams({
        pathEntity,
        pathLength,
        itemCount,
        method,
        alignItems,
        basePoint
      })
      preview.dispose()
      acapCommitArray(context, sourceIds, basePoint, params, associative)
    } finally {
      preview.dispose()
    }
  }

  private buildParams(options: {
    pathEntity: AcDbCurve
    pathLength: number
    itemCount: number
    method: AcDbAssocArrayPathMethod
    alignItems: boolean
    basePoint: AcGePoint3d
  }): AcDbAssocArrayPathParameters {
    const { pathEntity, pathLength, itemCount, method, alignItems, basePoint } =
      options
    const itemSpacing =
      method === AcDbAssocArrayPathMethod.kMeasure && itemCount > 1
        ? pathLength / (itemCount - (pathEntity.closed ? 0 : 1))
        : pathLength / Math.max(1, itemCount)

    const params = new AcDbAssocArrayPathParameters(
      itemSpacing,
      1,
      1,
      itemCount,
      1,
      1,
      0
    )
    params.method = method
    params.alignItems = alignItems
    params.basePoint = basePoint
    params.setPath({ entityId: pathEntity.objectId })
    params.setPathCurve(pathEntity)
    return params
  }

  private async promptPathCurve(
    context: AcApContext,
    sourceIds: readonly string[]
  ): Promise<AcDbCurve | undefined> {
    const opt = new AcEdPromptSelectionOptions(
      AcApI18n.t('jig.array.selectPath')
    )
    opt.singleOnly = true
    const result = await AcApDocManager.instance.editor.getSelection(opt)
    if (
      result.status !== AcEdPromptStatus.OK ||
      !result.value ||
      result.value.count === 0
    ) {
      return undefined
    }
    const sourceIdSet = new Set(sourceIds)
    // Prefer a non-source id (path pick is usually last when selection merged).
    const id =
      [...result.value.ids]
        .reverse()
        .find(candidate => !sourceIdSet.has(candidate)) ??
      result.value.ids[result.value.ids.length - 1]
    if (sourceIdSet.has(id)) {
      AcApDocManager.instance.editor.showMessage(
        AcApI18n.t('jig.array.pathIsSource'),
        'warning'
      )
      return undefined
    }
    const entity = context.doc.database.tables.blockTable.getEntityById(id)
    if (entity instanceof AcDbCurve) return entity
    AcApDocManager.instance.editor.showMessage(
      AcApI18n.t('jig.array.pathNotCurve'),
      'warning'
    )
    return undefined
  }

  private curveLength(curve: AcDbCurve): number {
    const start = curve.getDistAtParam(curve.startParam)
    const end = curve.getDistAtParam(curve.endParam)
    if (start == null || end == null) return 0
    return Math.abs(end - start)
  }

  private addKeyword(
    prompt: AcEdPromptKeywordOptions,
    key: 'associative' | 'base' | 'method' | 'items' | 'alignItems' | 'exit'
  ) {
    prompt.keywords.add(
      AcApI18n.t(`jig.array.keywords.${key}.display`),
      AcApI18n.t(`jig.array.keywords.${key}.global`),
      AcApI18n.t(`jig.array.keywords.${key}.local`)
    )
  }

  /**
   * Prompts for the object base that is mapped onto path sample points.
   * Prefer a point on the arrayed objects (e.g. circle center); a distant
   * point such as the path end keeps a large offset from every item.
   */
  private async promptBasePoint(
    current: AcGePoint3d
  ): Promise<AcGePoint3d | undefined> {
    const opt = new AcEdPromptPointOptions(AcApI18n.t('jig.array.basePoint'))
    opt.defaultValue = current
    opt.useDefaultValue = true
    const result = await AcApDocManager.instance.editor.getPoint(opt)
    if (result.status === AcEdPromptStatus.Cancel) return undefined
    if (result.status === AcEdPromptStatus.OK && result.value) {
      return new AcGePoint3d(result.value)
    }
    return current.clone()
  }

  private async promptMethod(
    current: AcDbAssocArrayPathMethod
  ): Promise<AcDbAssocArrayPathMethod> {
    const opt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.array.methodPrompt')
    )
    opt.keywords.add(
      AcApI18n.t('jig.array.keywords.divide.display'),
      'Divide',
      AcApI18n.t('jig.array.keywords.divide.local')
    )
    opt.keywords.add(
      AcApI18n.t('jig.array.keywords.measure.display'),
      'Measure',
      AcApI18n.t('jig.array.keywords.measure.local')
    )
    const result = await AcApDocManager.instance.editor.getKeywords(opt)
    if (
      result.status !== AcEdPromptStatus.OK &&
      result.status !== AcEdPromptStatus.Keyword
    ) {
      return current
    }
    const key = (result.stringResult || '').toUpperCase()
    if (key === 'DIVIDE' || key === 'D') {
      return AcDbAssocArrayPathMethod.kDivide
    }
    if (key === 'MEASURE' || key === 'M') {
      return AcDbAssocArrayPathMethod.kMeasure
    }
    return current
  }

  private async promptYesNo(current: boolean): Promise<boolean> {
    const opt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.array.yesNoPrompt').replace(
        '{value}',
        current ? 'Yes' : 'No'
      )
    )
    opt.keywords.add(
      AcApI18n.t('jig.array.keywords.yes.display'),
      'Yes',
      AcApI18n.t('jig.array.keywords.yes.local')
    )
    opt.keywords.add(
      AcApI18n.t('jig.array.keywords.no.display'),
      'No',
      AcApI18n.t('jig.array.keywords.no.local')
    )
    const result = await AcApDocManager.instance.editor.getKeywords(opt)
    if (
      result.status !== AcEdPromptStatus.OK &&
      result.status !== AcEdPromptStatus.Keyword
    ) {
      return current
    }
    const key = (result.stringResult || '').toUpperCase()
    if (key === 'YES' || key === 'Y') return true
    if (key === 'NO' || key === 'N') return false
    return current
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
}
