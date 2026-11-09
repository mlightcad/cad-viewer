import {
  type AcApContext,
  AcApDocManager,
  AcApI18n,
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptPointOptions,
  AcEdPromptStatus,
  AcEdPromptStringOptions,
  resolveSelectedEntities
} from '@mlightcad/cad-simple-viewer'
import {
  AcDbBlockReference,
  AcDbBlockTableRecord,
  type AcDbEntity,
  type AcDbObjectId,
  AcGeMatrix3d,
  AcGePoint3d
} from '@mlightcad/data-model'

import { acapPdfT } from './acapPdfI18n'
import { acapPdfAskKeyword } from './acapPdfPrompts'
import { pdfEntityToFeature } from './pdfEntityFeatures'
import { type PdfMatchFeature } from './recognition/pdfShapeMatching'
import {
  applyPdfAffine,
  findPdfShapeMatches,
  type PdfShapeMatch
} from './recognition/pdfShapeMatching'

/** Name prefix for generated block names. */
const BLOCK_NAME_PREFIX = 'PDF_BLOCK_'

/**
 * `pdfblock`: turns repeated geometry from a PDF back into a block.
 *
 * Workflow:
 * 1. Select the shapes of one instance (a symbol, a door, a bolt, ...).
 * 2. Pick the block base point (`Scale` toggles matching scaled copies).
 * 3. Enter the block name.
 * 4. Every other copy in model space is found, under rotation and mirroring
 *    (and scale when enabled), and highlighted. Replace all of them, keep
 *    them, or review them one by one.
 *
 * The selected shapes and every accepted copy become block references.
 * Shapes matching cannot describe (hatches, images, inserts) are left as is.
 */
export class AcApPdfBlockCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  async execute(context: AcApContext) {
    const resolved = await resolveSelectedEntities(context, {
      promptKey: 'pdfblock'
    })
    if (!resolved) return
    const view = context.view
    const selectionSet = view.selectionSet

    const templateEntities: AcDbEntity[] = []
    const templateFeatures: PdfMatchFeature<AcDbObjectId>[] = []
    resolved.entities.forEach((entity, i) => {
      const feature = pdfEntityToFeature(entity, resolved.ids[i])
      if (!feature) return
      templateEntities.push(entity)
      templateFeatures.push(feature)
    })
    if (templateFeatures.length === 0) {
      selectionSet.clear()
      this.notify(AcApI18n.t('jig.pdfblock.unsupported'), 'warning')
      return
    }

    const options = await this.promptBasePoint()
    if (!options) {
      selectionSet.clear()
      return
    }
    const name = await this.promptName(context)
    if (!name) {
      selectionSet.clear()
      return
    }

    const blockTable = context.doc.database.tables.blockTable
    const modelSpace = blockTable.modelSpace
    const templateIds = new Set(templateFeatures.map(f => f.id))
    const candidates: PdfMatchFeature<AcDbObjectId>[] = []
    const entityById = new Map<AcDbObjectId, AcDbEntity>()
    for (const entity of modelSpace.newIterator()) {
      if (templateIds.has(entity.objectId)) continue
      const feature = pdfEntityToFeature(entity, entity.objectId)
      if (!feature) continue
      candidates.push(feature)
      entityById.set(entity.objectId, entity)
    }

    const matches = findPdfShapeMatches(templateFeatures, candidates, {
      allowScale: options.allowScale
    })
    const accepted = await this.confirmMatches(context, matches)
    if (!accepted) {
      selectionSet.clear()
      return
    }

    // Block definition: the template shapes, moved so the base point is the
    // block origin.
    const base = options.basePoint
    const record = new AcDbBlockTableRecord({
      name,
      origin: new AcGePoint3d(0, 0, 0)
    })
    blockTable.add(record)
    const toOrigin = new AcGeMatrix3d().makeTranslation(-base.x, -base.y, 0)
    record.appendEntity(
      templateEntities.map(entity => entity.clone().transformBy(toOrigin))
    )

    const layer = templateEntities[0].layer
    const references: AcDbBlockReference[] = []
    const addReference = (
      position: { x: number; y: number },
      rotation: number,
      scale: number,
      mirrored: boolean
    ) => {
      const ref = new AcDbBlockReference(name)
      ref.position = new AcGePoint3d(position.x, position.y, 0)
      ref.rotation = rotation
      ref.scaleFactors = new AcGePoint3d(scale, mirrored ? -scale : scale, 1)
      ref.layer = layer
      references.push(ref)
    }
    addReference(base, 0, 1, false)
    for (const match of accepted) {
      addReference(
        applyPdfAffine(match.transform, base),
        match.rotation,
        match.scale,
        match.mirrored
      )
    }
    modelSpace.appendEntity(references)

    const replaced = [
      ...templateFeatures.map(f => f.id),
      ...accepted.flatMap(match => match.ids)
    ]
    context.doc.entityService.eraseEntities(replaced)
    selectionSet.clear()
    this.notify(
      acapPdfT('jig.pdfblock.summary', {
        name,
        count: references.length
      })
    )
  }

  /** Base point prompt with a `Scale` toggle for matching scaled copies. */
  private async promptBasePoint(): Promise<
    { basePoint: AcGePoint3d; allowScale: boolean } | undefined
  > {
    const editor = AcApDocManager.instance.editor
    let allowScale = false
    while (true) {
      const prompt = new AcEdPromptPointOptions(
        acapPdfT('jig.pdfblock.basePoint', {
          scale: AcApI18n.t(
            allowScale ? 'jig.pdfblock.scaleOn' : 'jig.pdfblock.scaleOff'
          )
        })
      )
      prompt.keywords.add(
        AcApI18n.t('jig.pdfblock.keywords.scale.display'),
        AcApI18n.t('jig.pdfblock.keywords.scale.global'),
        AcApI18n.t('jig.pdfblock.keywords.scale.local')
      )
      const result = await editor.getPoint(prompt)
      if (result.status === AcEdPromptStatus.OK && result.value) {
        return { basePoint: new AcGePoint3d(result.value), allowScale }
      }
      if (
        result.status === AcEdPromptStatus.Keyword &&
        result.stringResult === 'Scale'
      ) {
        allowScale = !allowScale
        continue
      }
      return undefined
    }
  }

  /** Block name prompt; suggests a free `PDF_BLOCK_n` name. */
  private async promptName(context: AcApContext): Promise<string | undefined> {
    const blockTable = context.doc.database.tables.blockTable
    let index = 1
    while (blockTable.has(`${BLOCK_NAME_PREFIX}${index}`)) index++
    const suggestion = `${BLOCK_NAME_PREFIX}${index}`
    const editor = AcApDocManager.instance.editor
    while (true) {
      const prompt = new AcEdPromptStringOptions(
        acapPdfT('jig.pdfblock.name', { suggestion })
      )
      prompt.allowSpaces = true
      prompt.allowEmpty = true
      prompt.defaultValue = suggestion
      prompt.useDefaultValue = true
      const result = await editor.getString(prompt)
      if (
        result.status !== AcEdPromptStatus.OK &&
        result.status !== AcEdPromptStatus.None
      ) {
        return undefined
      }
      const name = (result.stringResult ?? '').trim() || suggestion
      if (!blockTable.has(name)) return name
      this.notify(acapPdfT('jig.pdfblock.nameExists', { name }), 'warning')
    }
  }

  /**
   * Highlights the copies and asks which to replace.
   *
   * @returns Accepted copies (possibly empty), or `undefined` on cancel.
   */
  private async confirmMatches(
    context: AcApContext,
    matches: PdfShapeMatch<AcDbObjectId>[]
  ): Promise<PdfShapeMatch<AcDbObjectId>[] | undefined> {
    if (matches.length === 0) {
      this.notify(AcApI18n.t('jig.pdfblock.noCopies'))
      return []
    }
    const selectionSet = context.view.selectionSet
    selectionSet.clear()
    selectionSet.add(matches.flatMap(match => match.ids))

    const mode = await acapPdfAskKeyword(
      acapPdfT('jig.pdfblock.replaceAll', { count: matches.length }),
      ['yes', 'no', 'review'],
      'yes'
    )
    if (mode === undefined) return undefined
    if (mode === 'yes') return matches
    if (mode === 'no') return []

    const accepted: PdfShapeMatch<AcDbObjectId>[] = []
    for (let i = 0; i < matches.length; i++) {
      selectionSet.clear()
      selectionSet.add(matches[i].ids)
      const answer = await acapPdfAskKeyword(
        acapPdfT('jig.pdfblock.replaceOne', {
          index: i + 1,
          count: matches.length
        }),
        ['yes', 'no', 'all', 'exit'],
        'yes'
      )
      if (answer === undefined) return undefined
      if (answer === 'yes') accepted.push(matches[i])
      if (answer === 'all') {
        accepted.push(...matches.slice(i))
        break
      }
      if (answer === 'exit') break
    }
    return accepted
  }
}
