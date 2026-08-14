import { AcDbEntity, AcDbObjectId } from '@mlightcad/data-model'

import { AcApContext, AcApDocManager } from '../app'
import { AcEdPromptSelectionOptions, AcEdPromptStatus } from '../editor'
import { AcApI18n } from '../i18n'

/**
 * Prompts for a selection and returns entity ids when the user confirms.
 *
 * @param promptKey - I18n `sysCmdPrompt` key for the selection prompt.
 * @returns Selected ids, or `undefined` when the prompt is cancelled or empty.
 */
async function promptForSelectionIds(
  promptKey: string
): Promise<AcDbObjectId[] | undefined> {
  const selectionResult = await AcApDocManager.instance.editor.getSelection(
    new AcEdPromptSelectionOptions(AcApI18n.sysCmdPrompt(promptKey))
  )
  if (
    selectionResult.status !== AcEdPromptStatus.OK ||
    !selectionResult.value ||
    selectionResult.value.count === 0
  ) {
    return undefined
  }
  return selectionResult.value.ids
}

/**
 * Options for {@link resolveSelectedEntities}.
 */
export interface AcApResolveSelectedOptions {
  /** I18n `sysCmdPrompt` key used when prompting for a selection. */
  promptKey?: string
  /** When `true`, empty selection clears the selection set. Default `true`. */
  clearOnEmpty?: boolean
}

/**
 * Result of resolving selected entities from preselection or a prompt.
 */
export interface AcApResolveSelectedResult {
  /** Resolved entity instances. */
  entities: AcDbEntity[]
  /** Object ids corresponding to `entities`. */
  ids: AcDbObjectId[]
}

/**
 * Resolves selected entities from preselection or an interactive prompt.
 *
 * @param context - Application context with view, document, and editor access.
 * @param options - Prompt and empty-selection behavior.
 * @returns Resolved entities and ids, or `undefined` when nothing is selected.
 */
export async function resolveSelectedEntities(
  context: AcApContext,
  options: AcApResolveSelectedOptions = {}
): Promise<AcApResolveSelectedResult | undefined> {
  const selectionSet = context.view.selectionSet
  const blockTable = context.doc.database.tables.blockTable
  const clearOnEmpty = options.clearOnEmpty ?? true

  let selectionIds: AcDbObjectId[] | undefined
  if (selectionSet.count > 0) {
    selectionIds = selectionSet.ids
  } else if (options.promptKey) {
    selectionIds = await promptForSelectionIds(options.promptKey)
  }

  if (!selectionIds || selectionIds.length === 0) return undefined

  const entities: AcDbEntity[] = []
  const ids: AcDbObjectId[] = []
  for (const id of selectionIds) {
    const entity = blockTable.getEntityById(id)
    if (entity) {
      entities.push(entity)
      ids.push(id)
    }
  }

  if (entities.length === 0) {
    if (clearOnEmpty) selectionSet.clear()
    return undefined
  }

  return { entities, ids }
}

/**
 * Resolves entity ids from selection, supporting erase-style preselection handling.
 *
 * Uses the active selection set when non-empty; otherwise prompts with `promptKey`.
 *
 * @param context - Application context with view, document, and editor access.
 * @param promptKey - I18n `sysCmdPrompt` key for the selection prompt.
 * @returns Resolved entity ids, or `undefined` when nothing is selected.
 */
export async function resolveSelectedIds(
  context: AcApContext,
  promptKey: string
): Promise<AcDbObjectId[] | undefined> {
  const selectionSet = context.view.selectionSet

  if (selectionSet.count > 0) {
    return selectionSet.ids
  }

  const selectionIds = await promptForSelectionIds(promptKey)
  return selectionIds && selectionIds.length > 0 ? selectionIds : undefined
}
