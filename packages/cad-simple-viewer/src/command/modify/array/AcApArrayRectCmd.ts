import {
  AcDbAssocArrayRectangularParameters,
  AcGePoint3d
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../../app/index.js'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptDistanceOptions,
  AcEdPromptIntegerOptions,
  AcEdPromptKeywordOptions,
  AcEdPromptPointOptions,
  AcEdPromptStatus
} from '../../../editor/index.js'
import { AcApI18n } from '../../../i18n/index.js'
import { resolveSelectedEntities } from '../../../service/index.js'
import { acapArrayAssociativity, acapCommitArray } from './AcApArrayCommit.js'
import { AcApArrayPreview } from './AcApArrayPreview.js'

/**
 * ARRAYRECT — creates a rectangular associative (or classic) array.
 */
export class AcApArrayRectCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const selection = await resolveSelectedEntities(context, {
      promptKey: 'arrayrect'
    })
    if (!selection) return

    const { entities, ids: sourceIds } = selection
    let associative = acapArrayAssociativity(context.doc.database)

    const basePrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.array.basePoint')
    )
    const baseResult = await AcApDocManager.instance.editor.getPoint(basePrompt)
    if (baseResult.status !== AcEdPromptStatus.OK || !baseResult.value) return
    const basePoint = new AcGePoint3d(baseResult.value)

    let columnCount = 4
    let rowCount = 3
    let columnSpacing = 1
    let rowSpacing = 1

    // Seed spacing from the first entity so the live preview is useful before
    // the user opens the Spacing option (same heuristic as commit).
    const box = entities[0]?.geometricExtents
    if (box) {
      const w = box.max.x - box.min.x
      const h = box.max.y - box.min.y
      if (w > 1e-9) columnSpacing = w * 1.5
      if (h > 1e-9) rowSpacing = h * 1.5
    }

    const preview = new AcApArrayPreview(context.view, entities, basePoint)
    const refreshPreview = () => {
      preview.refresh(
        this.buildParams(columnSpacing, rowSpacing, columnCount, rowCount)
      )
    }
    refreshPreview()

    try {
      for (;;) {
        const opt = new AcEdPromptKeywordOptions(
          AcApI18n.t('jig.array.rectOptions')
            .replace('{columns}', String(columnCount))
            .replace('{rows}', String(rowCount))
            .replace('{associative}', associative ? 'Yes' : 'No')
        )
        this.addKeyword(opt, 'associative')
        this.addKeyword(opt, 'count')
        this.addKeyword(opt, 'spacing')
        this.addKeyword(opt, 'columns')
        this.addKeyword(opt, 'rows')
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
        } else if (key === 'COUNT' || key === 'COU') {
          const counts = await this.promptCounts(columnCount, rowCount)
          if (!counts) return
          columnCount = counts.columns
          rowCount = counts.rows
          refreshPreview()
        } else if (key === 'SPACING' || key === 'S') {
          const spacing = await this.promptSpacing(columnSpacing, rowSpacing)
          if (!spacing) return
          columnSpacing = spacing.column
          rowSpacing = spacing.row
          refreshPreview()
        } else if (key === 'COLUMNS' || key === 'COL') {
          const n = await this.promptInteger(
            AcApI18n.t('jig.array.columnCount'),
            columnCount,
            1
          )
          if (n == null) return
          columnCount = n
          refreshPreview()
        } else if (key === 'ROWS' || key === 'R') {
          const n = await this.promptInteger(
            AcApI18n.t('jig.array.rowCount'),
            rowCount,
            1
          )
          if (n == null) return
          rowCount = n
          refreshPreview()
        } else {
          break
        }
      }

      const params = this.buildParams(
        columnSpacing,
        rowSpacing,
        columnCount,
        rowCount
      )
      preview.dispose()
      acapCommitArray(context, sourceIds, basePoint, params, associative)
    } finally {
      preview.dispose()
    }
  }

  private buildParams(
    columnSpacing: number,
    rowSpacing: number,
    columnCount: number,
    rowCount: number
  ): AcDbAssocArrayRectangularParameters {
    return new AcDbAssocArrayRectangularParameters(
      columnSpacing,
      rowSpacing,
      1,
      columnCount,
      rowCount,
      1,
      0,
      Math.PI / 2
    )
  }

  private addKeyword(
    prompt: AcEdPromptKeywordOptions,
    key: 'associative' | 'count' | 'spacing' | 'columns' | 'rows' | 'exit'
  ) {
    prompt.keywords.add(
      AcApI18n.t(`jig.array.keywords.${key}.display`),
      AcApI18n.t(`jig.array.keywords.${key}.global`),
      AcApI18n.t(`jig.array.keywords.${key}.local`)
    )
  }

  private async promptYesNo(current: boolean): Promise<boolean> {
    const opt = new AcEdPromptKeywordOptions(
      AcApI18n.t('jig.array.associativePrompt').replace(
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

  private async promptCounts(
    columns: number,
    rows: number
  ): Promise<{ columns: number; rows: number } | undefined> {
    const c = await this.promptInteger(
      AcApI18n.t('jig.array.columnCount'),
      columns,
      1
    )
    if (c == null) return undefined
    const r = await this.promptInteger(
      AcApI18n.t('jig.array.rowCount'),
      rows,
      1
    )
    if (r == null) return undefined
    return { columns: c, rows: r }
  }

  private async promptSpacing(
    column: number,
    row: number
  ): Promise<{ column: number; row: number } | undefined> {
    const colOpt = new AcEdPromptDistanceOptions(
      AcApI18n.t('jig.array.columnSpacing')
    )
    colOpt.defaultValue = column
    const colResult = await AcApDocManager.instance.editor.getDistance(colOpt)
    if (colResult.status === AcEdPromptStatus.Cancel) return undefined
    const columnSpacing =
      colResult.status === AcEdPromptStatus.OK && colResult.value != null
        ? colResult.value
        : column

    const rowOpt = new AcEdPromptDistanceOptions(
      AcApI18n.t('jig.array.rowSpacing')
    )
    rowOpt.defaultValue = row
    const rowResult = await AcApDocManager.instance.editor.getDistance(rowOpt)
    if (rowResult.status === AcEdPromptStatus.Cancel) return undefined
    const rowSpacing =
      rowResult.status === AcEdPromptStatus.OK && rowResult.value != null
        ? rowResult.value
        : row

    return { column: columnSpacing, row: rowSpacing }
  }
}
