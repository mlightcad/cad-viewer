import {
  AcDbDatabase,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../app'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptAngleOptions,
  AcEdPromptEntityOptions,
  AcEdPromptPointOptions,
  AcEdPromptStatus,
  AcEdPromptStringOptions
} from '../editor'
import { AcApI18n } from '../i18n'
import { AcApUcsFrame, AcApUcsService, UCS_WORLD_NAME } from '../service'

type UcsKeyword =
  | 'Named'
  | 'Object'
  | 'Previous'
  | 'View'
  | 'World'
  | 'X'
  | 'Y'
  | 'Z'
  | 'ZAxis'
  | 'Apply'
  | 'Restore'
  | 'Save'
  | 'Delete'
  | '?'

/**
 * UCS command — sets the origin and orientation of the current user
 * coordinate system (AutoCAD-compatible 2D subset; Face omitted).
 *
 * @see https://help.autodesk.com/cloudhelp/2026/ENU/AutoCAD-Core/files/GUID-0BE49DA1-B323-4758-B49B-4C497D194C7A.htm
 */
export class AcApUcsCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const db = context.doc.database
    const editor = AcApDocManager.instance.editor

    const prompt = new AcEdPromptPointOptions(AcApI18n.t('jig.ucs.originOrOptions'))
    this.addMainKeywords(prompt)
    const worldKw = prompt.keywords.findByGlobalName('World')
    if (worldKw) prompt.keywords.default = worldKw

    const result = await editor.getPoint(prompt)
    if (result.status === AcEdPromptStatus.Cancel) return

    if (
      result.status === AcEdPromptStatus.None ||
      (result.status === AcEdPromptStatus.Keyword &&
        result.stringResult === 'World')
    ) {
      AcApUcsService.setWorld(db)
      return
    }

    if (result.status === AcEdPromptStatus.OK && result.value) {
      await this.runOriginFlow(context, db, result.value)
      return
    }

    if (result.status !== AcEdPromptStatus.Keyword) return
    await this.dispatchKeyword(context, db, result.stringResult as UcsKeyword)
  }

  private addMainKeywords(prompt: AcEdPromptPointOptions) {
    const keys = [
      'named',
      'object',
      'previous',
      'view',
      'world',
      'x',
      'y',
      'z',
      'zAxis',
      'apply'
    ] as const
    for (const key of keys) {
      prompt.keywords.add(
        AcApI18n.t(`jig.ucs.keywords.${key}.display`),
        AcApI18n.t(`jig.ucs.keywords.${key}.global`),
        AcApI18n.t(`jig.ucs.keywords.${key}.local`)
      )
    }
  }

  private async dispatchKeyword(
    context: AcApContext,
    db: AcDbDatabase,
    keyword: string | undefined
  ) {
    switch (keyword) {
      case 'World':
        AcApUcsService.setWorld(db)
        return
      case 'Previous':
        if (!AcApUcsService.restorePrevious(db)) {
          this.notify(AcApI18n.t('jig.ucs.noPrevious'), 'warning')
        }
        return
      case 'View':
        this.applyView(db)
        return
      case 'X':
      case 'Y':
      case 'Z':
        await this.runRotate(db, keyword.toLowerCase() as 'x' | 'y' | 'z')
        return
      case 'ZAxis':
        await this.runZAxis(db)
        return
      case 'Object':
        await this.runObject(db)
        return
      case 'Named':
        await this.runNamed(db)
        return
      case 'Apply':
        AcApUcsService.applyCurrentToAllViewports(db)
        return
      case 'Restore':
        await this.runRestore(db)
        return
      case 'Save':
        await this.runSave(db)
        return
      case 'Delete':
        await this.runDelete(db)
        return
      case '?':
        this.listNamed(db)
        return
      default:
        void context
        return
    }
  }

  private async runOriginFlow(
    context: AcApContext,
    db: AcDbDatabase,
    origin: AcGePoint3dLike
  ) {
    const editor = AcApDocManager.instance.editor
    const current = AcApUcsService.getActiveFrame(db)

    const xPrompt = new AcEdPromptPointOptions(AcApI18n.t('jig.ucs.pointOnXAxis'))
    xPrompt.useBasePoint = true
    xPrompt.useDashedLine = true
    xPrompt.basePoint = new AcGePoint3d(origin)
    xPrompt.allowNone = true

    const xResult = await editor.getPoint(xPrompt)
    if (xResult.status === AcEdPromptStatus.Cancel) return

    if (
      xResult.status === AcEdPromptStatus.None ||
      xResult.status !== AcEdPromptStatus.OK ||
      !xResult.value
    ) {
      AcApUcsService.applyFrame(
        db,
        AcApUcsService.frameFromPoints(origin, undefined, undefined, current)
      )
      return
    }

    const yPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.ucs.pointOnXyPlane')
    )
    yPrompt.useBasePoint = true
    yPrompt.useDashedLine = true
    yPrompt.basePoint = new AcGePoint3d(origin)
    yPrompt.allowNone = true

    const yResult = await editor.getPoint(yPrompt)
    if (yResult.status === AcEdPromptStatus.Cancel) return

    if (
      yResult.status === AcEdPromptStatus.None ||
      yResult.status !== AcEdPromptStatus.OK ||
      !yResult.value
    ) {
      AcApUcsService.applyFrame(
        db,
        AcApUcsService.frameFromPoints(origin, xResult.value, undefined, current)
      )
      return
    }

    AcApUcsService.applyFrame(
      db,
      AcApUcsService.frameFromPoints(
        origin,
        xResult.value,
        yResult.value,
        current
      )
    )
    void context
  }

  private applyView(db: AcDbDatabase) {
    const current = AcApUcsService.getActiveFrame(db)
    // 2D top view: screen X right, Y up in WCS when untwisted.
    AcApUcsService.applyFrame(
      db,
      AcApUcsService.frameFromView(current, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 })
    )
  }

  private async runRotate(db: AcDbDatabase, axis: 'x' | 'y' | 'z') {
    const editor = AcApDocManager.instance.editor
    const prompt = new AcEdPromptAngleOptions(
      AcApI18n.t('jig.ucs.rotationAngle').replace('{axis}', axis.toUpperCase())
    )
    prompt.allowNegative = true
    prompt.allowZero = true
    prompt.useDefaultValue = true
    prompt.defaultValue = 0
    const result = await editor.getAngle(prompt)
    if (result.status !== AcEdPromptStatus.OK) return
    const deg = result.value ?? 0
    const rad = (deg * Math.PI) / 180
    const next = AcApUcsService.rotateFrame(
      AcApUcsService.getActiveFrame(db),
      axis,
      rad
    )
    AcApUcsService.applyFrame(db, next)
  }

  private async runZAxis(db: AcDbDatabase) {
    const editor = AcApDocManager.instance.editor
    const originPrompt = new AcEdPromptPointOptions(
      AcApI18n.t('jig.ucs.zAxisOrigin')
    )
    const originResult = await editor.getPoint(originPrompt)
    if (originResult.status !== AcEdPromptStatus.OK || !originResult.value) {
      return
    }

    const zPrompt = new AcEdPromptPointOptions(AcApI18n.t('jig.ucs.pointOnZAxis'))
    zPrompt.useBasePoint = true
    zPrompt.useDashedLine = true
    zPrompt.basePoint = new AcGePoint3d(originResult.value)
    const zResult = await editor.getPoint(zPrompt)
    if (zResult.status !== AcEdPromptStatus.OK || !zResult.value) return

    AcApUcsService.applyFrame(
      db,
      AcApUcsService.frameFromZAxis(originResult.value, zResult.value)
    )
  }

  private async runObject(db: AcDbDatabase) {
    const editor = AcApDocManager.instance.editor
    const prompt = new AcEdPromptEntityOptions(AcApI18n.t('jig.ucs.selectObject'))
    const picked = await editor.getEntity(prompt)
    if (picked.status !== AcEdPromptStatus.OK || !picked.objectId) return

    const entity = db.tables.blockTable.getEntityById(picked.objectId)
    if (!entity) {
      this.notify(AcApI18n.t('jig.ucs.invalidObject'), 'warning')
      return
    }

    const pickPoint =
      picked.pickedPoint ?? AcApUcsService.getActiveFrame(db).origin

    const frame = AcApUcsService.frameFromEntity(entity, pickPoint)
    if (!frame) {
      this.notify(AcApI18n.t('jig.ucs.invalidObject'), 'warning')
      return
    }
    AcApUcsService.applyFrame(db, frame)
  }

  private async runNamed(db: AcDbDatabase) {
    const editor = AcApDocManager.instance.editor
    const prompt = new AcEdPromptStringOptions(
      AcApI18n.t('jig.ucs.namedOption')
    )
    for (const key of ['restore', 'save', 'delete', 'list'] as const) {
      prompt.keywords.add(
        AcApI18n.t(`jig.ucs.keywords.${key}.display`),
        AcApI18n.t(`jig.ucs.keywords.${key}.global`),
        AcApI18n.t(`jig.ucs.keywords.${key}.local`)
      )
    }
    const restoreKw = prompt.keywords.findByGlobalName('Restore')
    if (restoreKw) prompt.keywords.default = restoreKw

    const result = await editor.getString(prompt)
    if (result.status === AcEdPromptStatus.Cancel) return

    const entered = String(result.stringResult ?? '').trim()
    if (
      result.status === AcEdPromptStatus.None ||
      (result.status === AcEdPromptStatus.Keyword &&
        result.stringResult === 'Restore') ||
      (result.status === AcEdPromptStatus.OK && entered === '')
    ) {
      await this.runRestore(db)
      return
    }

    if (result.status === AcEdPromptStatus.Keyword) {
      if (result.stringResult === 'Save') {
        await this.runSave(db)
        return
      }
      if (result.stringResult === 'Delete') {
        await this.runDelete(db)
        return
      }
      if (result.stringResult === '?' || result.stringResult === 'List') {
        this.listNamed(db)
        return
      }
    }

    if (result.status === AcEdPromptStatus.OK && entered) {
      if (!AcApUcsService.setCurrent(entered, db)) {
        this.notify(
          AcApI18n.t('jig.ucs.notFound').replace('{name}', entered),
          'warning'
        )
      }
    }
  }

  private async runRestore(db: AcDbDatabase) {
    const editor = AcApDocManager.instance.editor
    const prompt = new AcEdPromptStringOptions(AcApI18n.t('jig.ucs.enterName'))
    prompt.allowSpaces = false
    const result = await editor.getString(prompt)
    const name = String(result.stringResult ?? '').trim()
    if (result.status !== AcEdPromptStatus.OK || !name) return
    if (name === '?' || name === '*') {
      this.listNamed(db)
      return
    }
    if (!AcApUcsService.setCurrent(name, db)) {
      this.notify(
        AcApI18n.t('jig.ucs.notFound').replace('{name}', name),
        'warning'
      )
    }
  }

  private async runSave(db: AcDbDatabase) {
    const editor = AcApDocManager.instance.editor
    const prompt = new AcEdPromptStringOptions(AcApI18n.t('jig.ucs.saveName'))
    prompt.allowSpaces = false
    const result = await editor.getString(prompt)
    const name = String(result.stringResult ?? '').trim()
    if (result.status !== AcEdPromptStatus.OK || !name) return
    if (!AcApUcsService.saveNamed(name, db)) {
      this.notify(AcApI18n.t('jig.ucs.invalidName'), 'warning')
    }
  }

  private async runDelete(db: AcDbDatabase) {
    const editor = AcApDocManager.instance.editor
    const prompt = new AcEdPromptStringOptions(AcApI18n.t('jig.ucs.deleteName'))
    prompt.allowSpaces = false
    const result = await editor.getString(prompt)
    const name = String(result.stringResult ?? '').trim()
    if (result.status !== AcEdPromptStatus.OK || !name) return
    if (!AcApUcsService.deleteNamed(name, db)) {
      this.notify(
        AcApI18n.t('jig.ucs.notFound').replace('{name}', name),
        'warning'
      )
    }
  }

  private listNamed(db: AcDbDatabase) {
    const items = AcApUcsService.listUcsNames(db).filter(
      i => i.kind === 'named' || i.kind === 'world'
    )
    if (items.length === 0) {
      this.notify(AcApI18n.t('jig.ucs.noNamed'), 'info')
      return
    }
    for (const item of items) {
      const frame =
        item.kind === 'world'
          ? AcApUcsService.getFrameByName(UCS_WORLD_NAME, db)!
          : AcApUcsService.getFrameByName(item.name, db)
      if (!frame) continue
      this.notify(this.formatFrameLine(item.name, frame), 'info')
    }
  }

  private formatFrameLine(name: string, frame: AcApUcsFrame): string {
    const fmt = (p: { x: number; y: number; z: number }) =>
      `${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`
    return `${name}: Origin=${fmt(frame.origin)} X=${fmt(frame.xAxis)} Y=${fmt(frame.yAxis)}`
  }
}
