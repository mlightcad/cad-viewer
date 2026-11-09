import {
  AcApDocManager,
  AcApI18n,
  AcEdPromptKeywordOptions,
  AcEdPromptStatus
} from '@mlightcad/cad-simple-viewer'

/** Keywords shared by the PDF conversion commands (`jig.pdfblock.keywords`). */
export type AcApPdfConfirmKeyword = 'yes' | 'no' | 'review' | 'all' | 'exit'

/**
 * Asks a keyword question built from the shared PDF confirmation keywords.
 *
 * @param message - Prompt text.
 * @param keys - Keywords to offer, in display order.
 * @param defaultKey - Keyword chosen by Enter.
 * @returns The chosen keyword, or `undefined` when the user cancels.
 */
export async function acapPdfAskKeyword<K extends AcApPdfConfirmKeyword>(
  message: string,
  keys: K[],
  defaultKey: K
): Promise<K | undefined> {
  const prompt = new AcEdPromptKeywordOptions(message)
  prompt.allowNone = true
  const byGlobal = new Map<string, K>()
  for (const key of keys) {
    const base = `jig.pdfblock.keywords.${key}`
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
