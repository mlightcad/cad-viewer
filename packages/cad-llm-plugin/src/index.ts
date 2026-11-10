/**
 * Shared AI model (LLM) settings for cad-viewer: provider configuration,
 * model factory, a framework-free settings dialog and LLM text recognition.
 *
 * Used by `@mlightcad/cad-agent-plugin` (chat) and, through
 * `AcApTextRecognitionService`, by `@mlightcad/cad-pdf-plugin` (`pdftext`).
 *
 * @packageDocumentation
 */

export * from './AcApLlmPlugin'
export * from './AcApLlmTextRecognizer'
export * from './command/AcApLlmSettingsCmd'
export * from './constants'
export {
  type AcApLlmLabelKey,
  type AcApLlmLabels,
  llmT,
  mergeLlmI18nIntoVueI18n,
  registerLlmI18n
} from './i18n'
export * from './model/AcApLlmModelFactory'
export * from './model/AcApLlmModelListing'
export * from './model/normalizeLlmBaseUrl'
export * from './model/skipDataUrlDownload'
export * from './storage/AcApLlmConfigStore'
export * from './storage/AcApLlmModelCatalog'
export * from './storage/settingsEquality'
export * from './ui/AcApLlmModelChoices'
export * from './ui/AcApLlmProviderLabels'
export * from './ui/AcUiLlmSettingsDialog'
