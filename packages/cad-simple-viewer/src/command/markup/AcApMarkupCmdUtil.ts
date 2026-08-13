import type { AcApContext } from '../../app'
import {
  AcEdCorsorType,
  AcEdOpenMode,
  AcEdPromptStatus,
  AcEdPromptStringOptions,
  AcEdViewMode
} from '../../editor'
import { AcApI18n } from '../../i18n'
import type { AcTrView2d } from '../../view'
import type {
  AcApMarkupMeta,
  AcApMarkupRecord,
  AcApMarkupType
} from './AcApMarkupTypes'
import {
  createMarkupId,
  defaultMarkupStyle,
  getMarkupAuthor,
  markupNow
} from './AcApMarkupUtil'

/** Shared open-mode for all Design Review markup commands. */
export const MARKUP_OPEN_MODE = AcEdOpenMode.Review

/**
 * Apply shared markup-command defaults (Review mode, no empty DB undo marks).
 * Markup undo is handled by {@link runMarkupEdit} instead.
 */
export function configureMarkupCommand(command: {
  mode: AcEdOpenMode
  recordsUndoStack: boolean
}): void {
  command.mode = MARKUP_OPEN_MODE
  command.recordsUndoStack = false
}

/** Create shared metadata fields for a new markup record. */
export function createMarkupMeta(
  type: AcApMarkupType,
  view: AcTrView2d,
  context: AcApContext,
  extras?: Partial<Pick<AcApMarkupMeta, 'text' | 'comment'>>
): Omit<AcApMarkupMeta, 'type'> & { type: AcApMarkupType } {
  const now = markupNow()
  return {
    id: createMarkupId(type),
    type,
    layoutId: view.activeLayoutBtrId,
    style: defaultMarkupStyle(),
    text: extras?.text,
    comment: extras?.comment ?? '',
    status: 'open',
    author: getMarkupAuthor(context.doc.database),
    createdAt: now,
    updatedAt: now
  }
}

/** Prompt for a short label / note string (optional empty). */
export async function promptMarkupText(
  context: AcApContext,
  messageKey: string,
  defaultValue = ''
): Promise<string | undefined> {
  const prompt = new AcEdPromptStringOptions(AcApI18n.t(messageKey))
  prompt.allowEmpty = true
  prompt.allowSpaces = true
  if (defaultValue) {
    prompt.defaultValue = defaultValue
    prompt.useDefaultValue = true
  }
  const result = await context.view.editor.getString(prompt)
  if (result.status !== AcEdPromptStatus.OK) return undefined
  return (result.stringResult ?? defaultValue).trim()
}

/** Run a markup command body inside selection mode + crosshair cursor. */
export async function withMarkupInput(
  context: AcApContext,
  fn: () => Promise<void>
): Promise<void> {
  await context.view.withMode(AcEdViewMode.SELECTION, () =>
    context.view.editor.withCursor(AcEdCorsorType.Crosshair, fn)
  )
}

/** Narrow helper after a record is fully built. */
export type MarkupCommit = (record: AcApMarkupRecord) => void
