import {
  AcDbAssocArrayPolarParameters,
  AcGePoint3d
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../../app/index.js'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptAngleOptions,
  AcEdPromptIntegerOptions,
  AcEdPromptKeywordOptions,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../../../editor/index.js'
import { AcApI18n } from '../../../i18n/index.js'
import { resolveSelectedEntities } from '../../../service/index.js'
import { acapArraySelectionBasePoint } from './AcApArrayBasePoint.js'
import { acapArrayAssociativity, acapCommitArray } from './AcApArrayCommit.js'
import { acapBuildPolarArrayParameters } from './AcApArrayPolarParams.js'
import { AcApArrayPreview } from './AcApArrayPreview.js'

/**
 * ARRAYPOLAR — creates a polar associative (or classic) array.
 */
export class AcApArrayPolarCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const selection = await resolveSelectedEntities(context, {
      promptKey: 'arraypolar'
    })
    if (!selection) return

    const { entities, ids: sourceIds } = selection
    let associative = acapArrayAssociativity(context.doc.database)

    const centerPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.array.centerPoint')
    )
    const centerResult =
      await AcApDocManager.instance.editor.getPoint(centerPrompt)
    if (centerResult.status !== AcEdPromptStatus.OK || !centerResult.value) {
      return
    }
    const center = new AcGePoint3d(centerResult.value)

    // Base is on the source objects (extents centroid), not the array center.
    // Radius = |base − center|; preview/commit share the same BTR-local matrices.
    const basePoint = acapArraySelectionBasePoint(entities, center)

    let itemCount = 6
    // getAngle uses degrees; default matches AutoCAD's 360° fill.
    let fillAngleDegrees = 360
    let rotateItems = true

    const preview = new AcApArrayPreview(context.view, entities, basePoint)
    const refreshPreview = () => {
      preview.refresh(
        this.buildParams({
          itemCount,
          fillAngleDegrees,
          rotateItems,
          center,
          basePoint
        })
      )
    }
    refreshPreview()

    try {
      for (;;) {
        const opt = new AcEdPromptKeywordOptions(
          AcApI18n.t('jig.array.polarOptions')
            .replace('{items}', String(itemCount))
            .replace('{associative}', associative ? 'Yes' : 'No')
        )
        this.addKeyword(opt, 'associative')
        this.addKeyword(opt, 'items')
        this.addKeyword(opt, 'fillAngle')
        this.addKeyword(opt, 'rotateItems')
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
        } else if (key === 'ITEMS' || key === 'I') {
          const n = await this.promptInteger(
            AcApI18n.t('jig.array.itemCount'),
            itemCount,
            1
          )
          if (n == null) return
          itemCount = n
          refreshPreview()
        } else if (key === 'FILLANGLE' || key === 'F') {
          const angleOpt = new AcEdPromptAngleOptions(
            AcApI18n.t('jig.array.fillAngle')
          )
          angleOpt.defaultValue = fillAngleDegrees
          const angleResult =
            await AcApDocManager.instance.editor.getAngle(angleOpt)
          if (angleResult.status === AcEdPromptStatus.Cancel) return
          if (
            angleResult.status === AcEdPromptStatus.OK &&
            angleResult.value != null
          ) {
            fillAngleDegrees = angleResult.value
            refreshPreview()
          }
        } else if (key === 'ROTATEITEMS' || key === 'ROT') {
          rotateItems = await this.promptYesNo(rotateItems)
          refreshPreview()
        } else {
          break
        }
      }

      const params = this.buildParams({
        itemCount,
        fillAngleDegrees,
        rotateItems,
        center,
        basePoint
      })
      preview.dispose()
      acapCommitArray(context, sourceIds, basePoint, params, associative)
    } finally {
      preview.dispose()
    }
  }

  private buildParams(options: {
    itemCount: number
    fillAngleDegrees: number
    rotateItems: boolean
    center: AcGePoint3d
    basePoint: AcGePoint3d
  }): AcDbAssocArrayPolarParameters {
    return acapBuildPolarArrayParameters(options)
  }

  private addKeyword(
    prompt: AcEdPromptKeywordOptions,
    key: 'associative' | 'items' | 'fillAngle' | 'rotateItems' | 'exit'
  ) {
    prompt.keywords.add(
      AcApI18n.t(`jig.array.keywords.${key}.display`),
      AcApI18n.t(`jig.array.keywords.${key}.global`),
      AcApI18n.t(`jig.array.keywords.${key}.local`)
    )
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
