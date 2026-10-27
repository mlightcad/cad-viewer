import {
  AcDbDatabase,
  AcDbDimension,
  AcGePoint3dLike
} from '@mlightcad/data-model'

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
import {
  applySourceDimStyle,
  type ChainKind,
  createContinuedDimension,
  isChainDimension,
  promptSelectChainDimension,
  resolveChainDimension
} from './AcApDimChainUtil'
import {
  addDimKeyword,
  advanceBaselineStep,
  advanceContinueCursor,
  commitDimBlock,
  DIM_PREVIEW_BLOCK,
  getBaselineStep,
  rebuildPreviewBlock,
  removePreviewBlock
} from './AcApDimCmdUtil'

class AcApDimChainJig extends AcEdPreviewJig<AcGePoint3dLike> {
  private _view: AcEdBaseView
  private _dim: AcDbDimension | null = null

  constructor(
    view: AcEdBaseView,
    private _db: AcDbDatabase,
    private _sourceId: string,
    private _mode: ChainKind
  ) {
    super(view)
    this._view = view
  }

  get entity(): AcDbDimension | null {
    return this._dim
  }

  update(point: AcGePoint3dLike) {
    const source = this._db.tables.blockTable.getEntityById(this._sourceId)
    if (!isChainDimension(source)) return
    const step = this._mode === 'baseline' ? getBaselineStep() + 1 : 0
    const dim = createContinuedDimension(source, point, this._mode, step)
    applySourceDimStyle(dim, source)
    // Replace previous preview when object id changes across frames.
    if (this._dim?.objectId && this._dim.objectId !== dim.objectId) {
      this._view.removeTransientEntity(this._dim.objectId)
    }
    this._dim = dim
    rebuildPreviewBlock(
      this._db,
      dim as Parameters<typeof rebuildPreviewBlock>[1],
      DIM_PREVIEW_BLOCK
    )
  }

  end() {
    super.end()
    this._dim = null
    removePreviewBlock(this._db, DIM_PREVIEW_BLOCK)
  }
}

async function runChainCommand(context: AcApContext, mode: ChainKind) {
  const i18n = mode === 'continue' ? 'jig.dimcontinue' : 'jig.dimbaseline'
  const editor = AcApDocManager.instance.editor
  const db = context.doc.database

  let source = resolveChainDimension(db, mode)
  if (!source) {
    source = await promptSelectChainDimension(i18n)
    if (!source) return
  }

  for (;;) {
    const jig = new AcApDimChainJig(context.view, db, source.objectId, mode)
    const prompt = new AcEdPromptPointOptions(
      AcApI18n.t(`${i18n}.nextPoint`)
    )
    prompt.allowNone = true
    addDimKeyword(prompt, 'select', i18n)
    prompt.jig = jig
    const result = await editor.getPoint(prompt)
    jig.end()

    if (result.status === AcEdPromptStatus.Cancel) return
    if (result.status === AcEdPromptStatus.None) return
    if (result.status === AcEdPromptStatus.Keyword) {
      const picked = await promptSelectChainDimension(i18n)
      if (picked) source = picked
      continue
    }
    if (result.status !== AcEdPromptStatus.OK || !result.value) return

    const step = mode === 'baseline' ? getBaselineStep() + 1 : 0
    const dimension = createContinuedDimension(source, result.value, mode, step)
    applySourceDimStyle(dimension, source)
    commitDimBlock(db, dimension as Parameters<typeof commitDimBlock>[1])
    db.tables.blockTable.modelSpace.appendEntity(dimension)
    if (mode === 'continue') {
      advanceContinueCursor(dimension.objectId)
      source = resolveChainDimension(db, 'continue') ?? source
    } else {
      advanceBaselineStep()
    }
  }
}

/** DIMCONTINUE — chain from the previous extension line. */
export class AcApDimContinueCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    await runChainCommand(context, 'continue')
  }
}

/** DIMBASELINE — stack from the first extension line by DIMDLI. */
export class AcApDimBaselineCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    await runChainCommand(context, 'baseline')
  }
}
