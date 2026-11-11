import {
  acapAllocateBlockName,
  type AcApContext,
  AcApDashBSearchCmd,
  AcApDocManager,
  AcApEntityPreviewConvertor,
  acapFindEquivalentBlocks,
  AcApI18n,
  acapInvertAffine2d,
  type AcApSmartBlockConvertOptions,
  acapSmartBlockPlacement,
  type AcApSmartBlockSearch,
  acapValidateNewBlockName,
  AcEdPromptPointOptions,
  type AcEdPromptPointResult,
  AcEdPromptStatus
} from '@mlightcad/cad-simple-viewer'
import { nextTick } from 'vue'

import {
  acuiBeginBSearch,
  acuiEndBSearch,
  acuiNextBSearchAction,
  acuiPrepareBConvertDialog,
  acuiRequestBSearchCancel,
  acuiSetBSearchThumbnail,
  acuiWaitBConvertDialog,
  type MlBConvertResult,
  type MlBSearchAction,
  type MlBSearchAttributeRow,
  useBSearch,
  useDialogManager
} from '../composable'
import { i18n } from '../locale'
import { acuiOpenCommandPaletteTab } from './acuiCommandPaletteTab'

const THUMBNAIL_SIZE = 112

type PickOutcome =
  | { kind: 'action'; action: MlBSearchAction }
  | { kind: 'point'; x: number; y: number }
  | { kind: 'cancel' }

/**
 * `BSEARCH` — Smart Blocks: Search and Convert (AutoCAD 2026).
 *
 * Select the objects of one instance; every identical copy is found and
 * highlighted and listed in the Search and Convert tab of the tool palette.
 * Click an instance in the list to zoom to it, check or uncheck instances in
 * the list (or click one in the drawing) to include or exclude them, change
 * the search filters, then open the Convert to Block dialog to turn the
 * selection and the included instances into a new or an existing block.
 *
 * The command stays active during the review so the whole conversion is one
 * undo step. `-BSEARCH` offers the same workflow at the command line.
 */
export class AcApBSearchCmd extends AcApDashBSearchCmd {
  protected override promptKey = 'bsearch'

  protected override async review(
    context: AcApContext,
    search: AcApSmartBlockSearch
  ): Promise<AcApSmartBlockConvertOptions | undefined> {
    const view = context.view
    acuiBeginBSearch(search)
    // Closing the palette cancels the review.
    const restorePalette = acuiOpenCommandPaletteTab(
      'bsearch',
      acuiRequestBSearchCancel
    )
    let running = true
    void this.captureThumbnail(search, () => running)
    try {
      search.highlight(view)
      while (true) {
        const outcome = await this.waitForInput()
        if (outcome.kind === 'cancel') return undefined
        if (outcome.kind === 'point') {
          const hit = view
            .pick({ x: outcome.x, y: outcome.y })
            .map(item => search.indexOfEntity(item.id))
            .find(index => index >= 0)
          if (hit !== undefined) {
            search.setIncluded(hit)
            search.setCurrent(hit)
            search.highlight(view)
          }
          continue
        }
        const action = outcome.action
        if (action.type === 'cancel') return undefined
        if (action.type === 'next' || action.type === 'prev') {
          if (action.type === 'next') search.next()
          else search.prev()
          search.zoomToCurrent(view)
        } else if (action.type === 'select') {
          search.setCurrent(action.index)
          search.zoomToCurrent(view)
        } else if (action.type === 'toggleCurrent') {
          if (search.current >= 0) search.setIncluded(search.current)
          search.highlight(view)
        } else if (action.type === 'setIncluded') {
          search.setIncluded(action.index, action.included)
          search.highlight(view)
        } else if (action.type === 'setAllIncluded') {
          search.setAllIncluded(action.included)
          search.highlight(view)
        } else if (action.type === 'options') {
          search.setOptions(action.options)
          search.highlight(view)
        } else if (action.type === 'convert') {
          const options = await this.runConvertDialog(context, search)
          if (options) return options
          search.highlight(view)
        }
      }
    } finally {
      running = false
      restorePalette()
      acuiEndBSearch()
    }
  }

  /** Captures the preview of the selected source for the palette. */
  private async captureThumbnail(
    search: AcApSmartBlockSearch,
    running: () => boolean
  ) {
    // Let the palette render first; capturing renders offscreen.
    await new Promise(resolve => setTimeout(resolve, 0))
    if (!running()) return
    try {
      const capture = new AcApEntityPreviewConvertor().capture(
        search.template.ids,
        THUMBNAIL_SIZE
      )
      if (capture.ok && running()) acuiSetBSearchThumbnail(capture.dataUrl)
    } catch {
      // A missing preview only leaves the placeholder.
    }
  }

  /**
   * Waits for a canvas click (toggles an instance), a command-line keyword
   * or a palette action, whichever comes first.
   */
  private async waitForInput(): Promise<PickOutcome> {
    const editor = AcApDocManager.instance.editor
    const prompt = new AcEdPromptPointOptions(
      i18n.global.t('main.bsearch.pickPrompt')
    )
    prompt.allowNone = true
    const keywordOf = (key: 'convert' | 'exit') => {
      const base = `jig.bsearch.keywords.${key}`
      return prompt.keywords.add(
        AcApI18n.t(`${base}.display`),
        AcApI18n.t(`${base}.global`),
        AcApI18n.t(`${base}.local`)
      )
    }
    const convertKeyword = keywordOf('convert')
    keywordOf('exit')
    prompt.keywords.default = convertKeyword

    const actionPromise = acuiNextBSearchAction()
    const pointPromise = editor.getPoint(prompt)
    const first = await Promise.race([
      actionPromise.then(action => ({ action })),
      pointPromise.then(result => ({ result }))
    ])
    if ('action' in first) {
      // The palette won: abort the canvas prompt before acting.
      editor.cancelActiveInput()
      await pointPromise.catch(() => undefined)
      return { kind: 'action', action: first.action }
    }
    return this.outcomeOfPoint(first.result, convertKeyword.globalName)
  }

  private outcomeOfPoint(
    result: AcEdPromptPointResult,
    convertGlobal: string
  ): PickOutcome {
    if (result.status === AcEdPromptStatus.OK && result.value) {
      return { kind: 'point', x: result.value.x, y: result.value.y }
    }
    if (result.status === AcEdPromptStatus.None) {
      return { kind: 'action', action: { type: 'convert' } }
    }
    if (result.status === AcEdPromptStatus.Keyword) {
      return result.stringResult === convertGlobal
        ? { kind: 'action', action: { type: 'convert' } }
        : { kind: 'cancel' }
    }
    return { kind: 'cancel' }
  }

  /**
   * Shows the Convert to Block dialog until the user confirms or cancels;
   * "pick insertion point" hides it for one point prompt.
   */
  private async runConvertDialog(
    context: AcApContext,
    search: AcApSmartBlockSearch
  ): Promise<AcApSmartBlockConvertOptions | undefined> {
    const db = context.doc.database
    const { toggleDialog } = useDialogManager()
    const { draft } = useBSearch()
    const center = search.defaultBasePoint
    const equivalents = acapFindEquivalentBlocks(db, search.template, {
      textVariations: search.options.textVariations
    })
    const blockNames: string[] = []
    for (const record of db.tables.blockTable.newIterator()) {
      const name = record.name
      if (!name || name.startsWith('*')) continue
      if (record.isModelSapce || record.isPaperSapce || record.isXref) continue
      blockNames.push(name)
    }
    blockNames.sort((a, b) => a.localeCompare(b))

    acuiPrepareBConvertDialog({
      draft: {
        target: 'new',
        name: acapAllocateBlockName(db, this.blockNamePrefix),
        basePoint: { ...center },
        existingBlock: equivalents[0]?.blockName ?? blockNames[0] ?? '',
        rotation: 0,
        scale: 1,
        sourceOnly: false,
        attributes: this.attributeRows(search)
      },
      blockNames,
      equivalentBlocks: equivalents,
      defaultBasePoint: center
    })

    while (true) {
      const result: MlBConvertResult = await this.openDialog(toggleDialog)
      toggleDialog('BConvertDlg', false)
      if (result.type === 'cancel') return undefined
      if (result.type === 'ok') {
        const built = acuiBConvertOptionsFromDraft(search, draft)
        if (built.options) return built.options
        this.notify(convertErrorMessage(built.error!, draft.name), 'warning')
        continue
      }
      // pickBasePoint
      const prompt = new AcEdPromptPointOptions(
        AcApI18n.t('jig.bsearch.basePoint')
      )
      const point = await AcApDocManager.instance.editor.getPoint(prompt)
      if (point.status === AcEdPromptStatus.OK && point.value) {
        draft.basePoint = { x: point.value.x, y: point.value.y }
      }
    }
  }

  private async openDialog(
    toggleDialog: ReturnType<typeof useDialogManager>['toggleDialog']
  ): Promise<MlBConvertResult> {
    const answer = acuiWaitBConvertDialog()
    toggleDialog('BConvertDlg', false)
    await nextTick()
    toggleDialog('BConvertDlg', true)
    return answer
  }

  private attributeRows(search: AcApSmartBlockSearch): MlBSearchAttributeRow[] {
    if (!search.options.textVariations) return []
    return search.variableTexts.map((index, i) => {
      const variants = new Set<string>()
      for (const match of search.matches) {
        const text = match.texts[index]
        if (match.included && text !== undefined) variants.add(text)
        if (variants.size >= 3) break
      }
      const tag = `TEXT${i + 1}`
      return {
        index,
        sample: search.template.texts[index] ?? '',
        variants: [...variants],
        tag,
        prompt: tag
      }
    })
  }
}

/** Reasons {@link acuiBConvertOptionsFromDraft} rejects a draft. */
export type MlBConvertError =
  | 'nameEmpty'
  | 'nameInvalid'
  | 'nameExists'
  | 'tagInvalid'
  | 'tagDuplicate'
  | 'noBlock'
  | 'scaleInvalid'

function convertErrorMessage(error: MlBConvertError, name: string): string {
  const t = i18n.global.t
  const messages: Record<MlBConvertError, () => string> = {
    nameEmpty: () => t('dialog.bconvertDlg.error.nameEmpty'),
    nameInvalid: () => t('dialog.bconvertDlg.error.nameInvalid', { name }),
    nameExists: () => t('dialog.bconvertDlg.error.nameExists', { name }),
    tagInvalid: () => t('dialog.bconvertDlg.error.tagInvalid'),
    tagDuplicate: () => t('dialog.bconvertDlg.error.tagDuplicate'),
    noBlock: () => t('dialog.bconvertDlg.error.noBlock'),
    scaleInvalid: () => t('dialog.bconvertDlg.error.scaleInvalid')
  }
  return messages[error]()
}

/**
 * Turns the dialog draft into conversion options.
 *
 * @returns Options, or the reason the draft is rejected.
 */
export function acuiBConvertOptionsFromDraft(
  search: AcApSmartBlockSearch,
  draft: ReturnType<typeof useBSearch>['draft']
): { options?: AcApSmartBlockConvertOptions; error?: MlBConvertError } {
  const basePoint = { x: draft.basePoint.x, y: draft.basePoint.y }
  if (draft.target === 'new') {
    const reason = acapValidateNewBlockName(search.db, draft.name)
    if (reason) {
      const errors = {
        empty: 'nameEmpty',
        invalid: 'nameInvalid',
        exists: 'nameExists'
      } as const
      return { error: errors[reason] }
    }
    const tags = draft.attributes.map(a => a.tag.trim().toUpperCase())
    if (tags.some(tag => !tag || /\s/.test(tag))) {
      return { error: 'tagInvalid' }
    }
    if (new Set(tags).size !== tags.length) return { error: 'tagDuplicate' }
    return {
      options: {
        sourceOnly: draft.sourceOnly,
        target: {
          kind: 'new',
          name: draft.name.trim(),
          basePoint,
          attributes: draft.attributes.map((a, i) => ({
            index: a.index,
            tag: tags[i],
            prompt: a.prompt.trim() || tags[i]
          }))
        }
      }
    }
  }
  if (!draft.existingBlock) return { error: 'noBlock' }
  const equivalent = acapFindEquivalentBlocks(search.db, search.template, {
    textVariations: search.options.textVariations
  }).find(b => b.blockName === draft.existingBlock)
  if (!(draft.scale > 0)) return { error: 'scaleInvalid' }
  return {
    options: {
      sourceOnly: draft.sourceOnly,
      target: {
        kind: 'existing',
        blockName: draft.existingBlock,
        placement: equivalent
          ? acapInvertAffine2d(equivalent.transform)
          : acapSmartBlockPlacement(
              basePoint,
              (draft.rotation * Math.PI) / 180,
              draft.scale
            )
      }
    }
  }
}
