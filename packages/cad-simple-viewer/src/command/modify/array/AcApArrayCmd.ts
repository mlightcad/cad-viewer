import { AcDbSystemVariables, AcDbSysVarManager } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../../../app/index.js'
import {
  AcEdCommand,
  AcEdKeyword,
  AcEdOpenMode,
  AcEdPromptKeywordOptions,
  AcEdPromptStatus
} from '../../../editor/index.js'
import { AcApI18n } from '../../../i18n/index.js'
import { AcApArrayPathCmd } from './AcApArrayPathCmd.js'
import { AcApArrayPolarCmd } from './AcApArrayPolarCmd.js'
import { AcApArrayRectCmd } from './AcApArrayRectCmd.js'

/** AutoCAD `ARRAYTYPE`: 0 rectangular, 1 path, 2 polar. */
type AcApArrayTypeCode = 0 | 1 | 2

/**
 * ARRAY / -ARRAY — asks for array type then delegates to ARRAYRECT /
 * ARRAYPOLAR / ARRAYPATH. Default type comes from {@link AcDbSystemVariables.ARRAYTYPE}.
 */
export class AcApArrayCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const db = context.doc.database
    const opt = new AcEdPromptKeywordOptions(AcApI18n.t('jig.array.selectType'))
    const rectangular = opt.keywords.add(
      AcApI18n.t('jig.array.keywords.rectangular.display'),
      'Rectangular',
      AcApI18n.t('jig.array.keywords.rectangular.local')
    )
    const path = opt.keywords.add(
      AcApI18n.t('jig.array.keywords.path.display'),
      'Path',
      AcApI18n.t('jig.array.keywords.path.local')
    )
    const polar = opt.keywords.add(
      AcApI18n.t('jig.array.keywords.polar.display'),
      'Polar',
      AcApI18n.t('jig.array.keywords.polar.local')
    )

    const typeCode = this.readArrayType(db)
    opt.keywords.default = this.keywordForType(typeCode, {
      rectangular,
      path,
      polar
    })
    opt.allowNone = true

    const result = await AcApDocManager.instance.editor.getKeywords(opt)
    if (result.status === AcEdPromptStatus.Cancel) {
      return
    }

    let key: string
    if (
      result.status === AcEdPromptStatus.None ||
      ((result.status === AcEdPromptStatus.OK ||
        result.status === AcEdPromptStatus.Keyword) &&
        !result.stringResult)
    ) {
      key = this.globalNameForType(typeCode)
    } else if (
      result.status === AcEdPromptStatus.OK ||
      result.status === AcEdPromptStatus.Keyword
    ) {
      key = (
        result.stringResult || this.globalNameForType(typeCode)
      ).toUpperCase()
    } else {
      return
    }

    let cmd: AcEdCommand
    let nextType: AcApArrayTypeCode
    if (key === 'PATH' || key === 'PA') {
      cmd = new AcApArrayPathCmd()
      nextType = 1
    } else if (key === 'POLAR' || key === 'PO') {
      cmd = new AcApArrayPolarCmd()
      nextType = 2
    } else {
      cmd = new AcApArrayRectCmd()
      nextType = 0
    }

    // Remember the chosen type as AutoCAD does (ARRAYTYPE is registry-scoped).
    AcDbSysVarManager.instance().setVar(
      AcDbSystemVariables.ARRAYTYPE,
      nextType,
      db
    )

    // Run nested command without a second undo mark (parent ARRAY already
    // records undo via AcEdCommand.trigger).
    await cmd.execute(context)
  }

  private readArrayType(db: { /* AcDbDatabase */ }): AcApArrayTypeCode {
    const raw = AcDbSysVarManager.instance().getVar(
      AcDbSystemVariables.ARRAYTYPE,
      db as never
    )
    const n = typeof raw === 'number' ? raw : Number(raw)
    if (n === 1 || n === 2) return n
    return 0
  }

  private keywordForType(
    type: AcApArrayTypeCode,
    keywords: {
      rectangular: AcEdKeyword
      path: AcEdKeyword
      polar: AcEdKeyword
    }
  ): AcEdKeyword {
    if (type === 1) return keywords.path
    if (type === 2) return keywords.polar
    return keywords.rectangular
  }

  private globalNameForType(type: AcApArrayTypeCode): string {
    if (type === 1) return 'Path'
    if (type === 2) return 'Polar'
    return 'Rectangular'
  }
}
