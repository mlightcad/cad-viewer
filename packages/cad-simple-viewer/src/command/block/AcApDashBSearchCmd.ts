import { AcGePoint3d } from '@mlightcad/data-model'

import { type AcApContext, AcApDocManager } from '../../app'
import {
  AcEdCommand,
  AcEdOpenMode,
  AcEdPromptAngleOptions,
  AcEdPromptDoubleOptions,
  AcEdPromptKeywordOptions,
  AcEdPromptPointOptions,
  AcEdPromptStatus,
  AcEdPromptStringOptions
} from '../../editor'
import { AcApI18n } from '../../i18n'
import { resolveSelectedEntities } from '../../service/AcApEntitySelection'
import {
  acapAllocateBlockName,
  acapConvertSmartBlock,
  acapFindEquivalentBlocks,
  acapInvertAffine2d,
  type AcApSmartBlockAttributeSpec,
  type AcApSmartBlockConvertOptions,
  type AcApSmartBlockConvertResult,
  acapSmartBlockPlacement,
  AcApSmartBlockSearch,
  type AcApSmartBlockSearchOptions,
  acapValidateNewBlockName
} from '../../smartBlock'

/**
 * Formats `jig.bsearch.<key>` and substitutes `{name}` placeholders.
 *
 * @param key - Key below `jig.bsearch`.
 * @param vars - Placeholder values.
 */
export function acapBSearchT(
  key: string,
  vars: Record<string, string | number> = {}
): string {
  let text = AcApI18n.t(`jig.bsearch.${key}`)
  for (const [name, value] of Object.entries(vars)) {
    text = text.split(`{${name}}`).join(String(value))
  }
  return text
}

/**
 * Asks a keyword question whose keywords live under
 * `jig.bsearch.keywords.<key>`.
 *
 * @param message - Prompt text.
 * @param keys - Keywords to offer, in display order.
 * @param defaultKey - Keyword chosen by Enter.
 * @returns The chosen keyword, or `undefined` when the user cancels.
 */
export async function acapBSearchAskKeyword<K extends string>(
  message: string,
  keys: K[],
  defaultKey: K
): Promise<K | undefined> {
  const prompt = new AcEdPromptKeywordOptions(message)
  prompt.allowNone = true
  const byGlobal = new Map<string, K>()
  for (const key of keys) {
    const base = `jig.bsearch.keywords.${key}`
    const global = AcApI18n.t(`${base}.global`)
    const keyword = prompt.keywords.add(
      AcApI18n.t(`${base}.display`),
      global,
      AcApI18n.t(`${base}.local`)
    )
    byGlobal.set(global, key)
    if (key === defaultKey) prompt.keywords.default = keyword
  }
  const result = await AcApDocManager.instance.editor.getKeywords(prompt)
  if (result.status === AcEdPromptStatus.None) return defaultKey
  if (
    result.status !== AcEdPromptStatus.OK &&
    result.status !== AcEdPromptStatus.Keyword
  ) {
    return undefined
  }
  return byGlobal.get(result.stringResult ?? '') ?? defaultKey
}

/**
 * `-BSEARCH`: Smart Blocks "Search and Convert" at the command line.
 *
 * 1. Select the objects of one instance.
 * 2. Every identical copy in model space is found (rotated and mirrored
 *    copies included, scaled copies optionally) and highlighted.
 * 3. Review the copies one by one, change search options, then convert the
 *    selection and the included copies into a new or an existing block.
 *
 * The whole conversion is one undo step. Subclasses customize defaults
 * (`pdfblock`) or replace {@link review} with a UI (`BSEARCH` in the editor).
 */
export class AcApDashBSearchCmd extends AcEdCommand {
  /** `sysCmdPrompt` key of the selection prompt. */
  protected promptKey = '-bsearch'
  /** Prefix of suggested block names. */
  protected blockNamePrefix = 'Block'

  constructor() {
    super()
    this.mode = AcEdOpenMode.Write
  }

  /** Search options the command starts with. */
  protected initialOptions(): AcApSmartBlockSearchOptions {
    return {
      allowRotation: true,
      allowMirror: true,
      allowScale: false,
      matchLayer: true,
      includeExistingBlocks: false,
      textVariations: true
    }
  }

  async execute(context: AcApContext) {
    const resolved = await resolveSelectedEntities(context, {
      promptKey: this.promptKey
    })
    if (!resolved) return
    const selectionSet = context.view.selectionSet
    const search = new AcApSmartBlockSearch(
      context.doc.database,
      resolved.ids,
      this.initialOptions()
    )
    try {
      if (search.template.features.length === 0) {
        this.notify(acapBSearchT('unsupported'), 'warning')
        return
      }
      if (search.template.unsupportedIds.length > 0) {
        this.notify(
          acapBSearchT('skipped', {
            count: search.template.unsupportedIds.length
          }),
          'warning'
        )
      }
      const options = await this.review(context, search)
      if (!options) return
      const result = this.convert(context, search, options)
      this.notify(
        acapBSearchT('summary', {
          name: result.blockName,
          count: result.references.length
        })
      )
    } finally {
      search.dispose()
      selectionSet.clear()
    }
  }

  /**
   * Lets the user review the matches and choose the target block.
   *
   * @returns Conversion options, or `undefined` when the user cancels.
   */
  protected async review(
    context: AcApContext,
    search: AcApSmartBlockSearch
  ): Promise<AcApSmartBlockConvertOptions | undefined> {
    const view = context.view
    while (true) {
      search.highlight(view)
      const choice = await acapBSearchAskKeyword(
        acapBSearchT('found', {
          count: search.matches.length,
          included: search.includedCount
        }),
        ['convert', 'review', 'options', 'exit'],
        'convert'
      )
      if (choice === undefined || choice === 'exit') return undefined
      if (choice === 'convert') return this.promptConvertOptions(search)
      if (choice === 'review') {
        if (search.matches.length === 0) {
          this.notify(acapBSearchT('noMatches'))
          continue
        }
        if (!(await this.reviewOneByOne(context, search))) return undefined
      }
      if (choice === 'options') {
        if (!(await this.promptSearchOptions(search))) return undefined
      }
    }
  }

  /** Converts inside the command's undo mark. */
  protected convert(
    context: AcApContext,
    search: AcApSmartBlockSearch,
    options: AcApSmartBlockConvertOptions
  ): AcApSmartBlockConvertResult {
    return acapConvertSmartBlock(
      context.doc.database,
      search.template,
      search.matches,
      options
    )
  }

  private async reviewOneByOne(
    context: AcApContext,
    search: AcApSmartBlockSearch
  ): Promise<boolean> {
    const view = context.view
    search.setCurrent(0)
    while (true) {
      const match = search.matches[search.current]
      view.selectionSet.clear()
      view.selectionSet.add(match.ids)
      search.zoomToCurrent(view)
      const answer = await acapBSearchAskKeyword(
        acapBSearchT('reviewOne', {
          index: search.current + 1,
          count: search.matches.length,
          state: acapBSearchT(match.included ? 'included' : 'excluded')
        }),
        ['include', 'exclude', 'next', 'previous', 'done'],
        'next'
      )
      if (answer === undefined) return false
      if (answer === 'done') return true
      if (answer === 'include') search.setIncluded(search.current, true)
      if (answer === 'exclude') search.setIncluded(search.current, false)
      if (answer === 'previous') search.prev()
      else search.next()
    }
  }

  private async promptSearchOptions(
    search: AcApSmartBlockSearch
  ): Promise<boolean> {
    const onOff = (value: boolean | undefined) =>
      acapBSearchT(value ? 'on' : 'off')
    while (true) {
      const o = search.options
      const answer = await acapBSearchAskKeyword(
        acapBSearchT('options', {
          rotation: onOff(o.allowRotation ?? true),
          mirror: onOff(o.allowMirror ?? true),
          scale: onOff(o.allowScale),
          layer: onOff(o.matchLayer ?? true),
          blocks: onOff(o.includeExistingBlocks),
          text: onOff(o.textVariations)
        }),
        ['rotation', 'mirror', 'scale', 'layer', 'blocks', 'text', 'done'],
        'done'
      )
      if (answer === undefined) return false
      if (answer === 'done') return true
      const toggles: Record<string, Partial<AcApSmartBlockSearchOptions>> = {
        rotation: { allowRotation: !(o.allowRotation ?? true) },
        mirror: { allowMirror: !(o.allowMirror ?? true) },
        scale: { allowScale: !o.allowScale },
        layer: { matchLayer: !(o.matchLayer ?? true) },
        blocks: { includeExistingBlocks: !o.includeExistingBlocks },
        text: { textVariations: !o.textVariations }
      }
      search.setOptions(toggles[answer])
    }
  }

  private async promptConvertOptions(
    search: AcApSmartBlockSearch
  ): Promise<AcApSmartBlockConvertOptions | undefined> {
    const kind = await acapBSearchAskKeyword(
      acapBSearchT('target'),
      ['new', 'existing'],
      'new'
    )
    if (kind === undefined) return undefined
    const target =
      kind === 'new'
        ? await this.promptNewTarget(search)
        : await this.promptExistingTarget(search)
    if (!target) return undefined
    let sourceOnly = false
    if (search.includedCount > 0) {
      const scope = await acapBSearchAskKeyword(
        acapBSearchT('scope', { count: search.includedCount }),
        ['instances', 'source'],
        'instances'
      )
      if (scope === undefined) return undefined
      sourceOnly = scope === 'source'
    }
    return { target, sourceOnly }
  }

  private async promptNewTarget(
    search: AcApSmartBlockSearch
  ): Promise<AcApSmartBlockConvertOptions['target'] | undefined> {
    const db = search.db
    const suggestion = acapAllocateBlockName(db, this.blockNamePrefix)
    let name: string | undefined
    while (!name) {
      const prompt = new AcEdPromptStringOptions(acapBSearchT('name'))
      prompt.allowSpaces = true
      prompt.allowEmpty = true
      prompt.defaultValue = suggestion
      prompt.useDefaultValue = true
      const result = await this.editor().getString(prompt)
      if (
        result.status !== AcEdPromptStatus.OK &&
        result.status !== AcEdPromptStatus.None
      ) {
        return undefined
      }
      const candidate = (result.stringResult ?? '').trim() || suggestion
      const reason = acapValidateNewBlockName(db, candidate)
      if (!reason) name = candidate
      else {
        this.notify(
          acapBSearchT(reason === 'exists' ? 'nameExists' : 'nameInvalid', {
            name: candidate
          }),
          'warning'
        )
      }
    }

    const center = search.defaultBasePoint
    const basePrompt = new AcEdPromptPointOptions(acapBSearchT('basePoint'))
    basePrompt.allowNone = true
    basePrompt.defaultValue = new AcGePoint3d(center.x, center.y, 0)
    basePrompt.useDefaultValue = true
    const baseResult = await this.editor().getPoint(basePrompt)
    let basePoint = center
    if (baseResult.status === AcEdPromptStatus.OK && baseResult.value) {
      basePoint = { x: baseResult.value.x, y: baseResult.value.y }
    } else if (baseResult.status !== AcEdPromptStatus.None) {
      return undefined
    }

    const attributes: AcApSmartBlockAttributeSpec[] = []
    if (search.options.textVariations) {
      for (const index of search.variableTexts) {
        const fallback = `TEXT${attributes.length + 1}`
        const prompt = new AcEdPromptStringOptions(
          acapBSearchT('attributeTag', {
            text: search.template.texts[index] ?? ''
          })
        )
        prompt.allowEmpty = true
        prompt.defaultValue = fallback
        prompt.useDefaultValue = true
        const result = await this.editor().getString(prompt)
        if (
          result.status !== AcEdPromptStatus.OK &&
          result.status !== AcEdPromptStatus.None
        ) {
          return undefined
        }
        const tag = (result.stringResult ?? '').trim().toUpperCase() || fallback
        attributes.push({ index, tag, prompt: tag })
      }
    }
    return { kind: 'new', name, basePoint, attributes }
  }

  private async promptExistingTarget(
    search: AcApSmartBlockSearch
  ): Promise<AcApSmartBlockConvertOptions['target'] | undefined> {
    const db = search.db
    const equivalents = acapFindEquivalentBlocks(db, search.template, {
      textVariations: search.options.textVariations
    })
    let blockName: string | undefined
    while (!blockName) {
      const prompt = new AcEdPromptStringOptions(acapBSearchT('existingName'))
      prompt.allowSpaces = true
      prompt.allowEmpty = equivalents.length > 0
      if (equivalents.length > 0) {
        prompt.defaultValue = equivalents[0].blockName
        prompt.useDefaultValue = true
      }
      const result = await this.editor().getString(prompt)
      if (result.status === AcEdPromptStatus.None && equivalents.length > 0) {
        blockName = equivalents[0].blockName
        break
      }
      if (result.status !== AcEdPromptStatus.OK) return undefined
      const candidate = (result.stringResult ?? '').trim()
      const record = db.tables.blockTable.getAt(candidate)
      if (record && !candidate.startsWith('*')) blockName = record.name
      else {
        this.notify(
          acapBSearchT('blockNotFound', { name: candidate }),
          'warning'
        )
      }
    }

    const equivalent = equivalents.find(b => b.blockName === blockName)
    if (equivalent) {
      return {
        kind: 'existing',
        blockName,
        placement: acapInvertAffine2d(equivalent.transform)
      }
    }

    // Unrelated geometry: the user decides how the block covers the source.
    const center = search.defaultBasePoint
    const basePrompt = new AcEdPromptPointOptions(acapBSearchT('basePoint'))
    basePrompt.allowNone = true
    basePrompt.defaultValue = new AcGePoint3d(center.x, center.y, 0)
    basePrompt.useDefaultValue = true
    const baseResult = await this.editor().getPoint(basePrompt)
    let basePoint = center
    if (baseResult.status === AcEdPromptStatus.OK && baseResult.value) {
      basePoint = { x: baseResult.value.x, y: baseResult.value.y }
    } else if (baseResult.status !== AcEdPromptStatus.None) {
      return undefined
    }

    const anglePrompt = new AcEdPromptAngleOptions(acapBSearchT('rotation'))
    anglePrompt.allowNone = true
    anglePrompt.allowNegative = true
    anglePrompt.allowZero = true
    anglePrompt.defaultValue = 0
    anglePrompt.useDefaultValue = true
    anglePrompt.useBasePoint = false
    const angleResult = await this.editor().getAngle(anglePrompt)
    if (
      angleResult.status !== AcEdPromptStatus.OK &&
      angleResult.status !== AcEdPromptStatus.None
    ) {
      return undefined
    }
    const rotation = ((angleResult.value ?? 0) * Math.PI) / 180

    const scalePrompt = new AcEdPromptDoubleOptions(acapBSearchT('scale'))
    scalePrompt.allowNone = true
    scalePrompt.allowNegative = false
    scalePrompt.allowZero = false
    scalePrompt.defaultValue = 1
    scalePrompt.useDefaultValue = true
    const scaleResult = await this.editor().getDouble(scalePrompt)
    if (
      scaleResult.status !== AcEdPromptStatus.OK &&
      scaleResult.status !== AcEdPromptStatus.None
    ) {
      return undefined
    }
    const scale = scaleResult.value ?? 1

    return {
      kind: 'existing',
      blockName,
      placement: acapSmartBlockPlacement(basePoint, rotation, scale)
    }
  }

  private editor() {
    return AcApDocManager.instance.editor
  }
}
