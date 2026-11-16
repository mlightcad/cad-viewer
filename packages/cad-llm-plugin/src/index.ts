/**
 * Shared AI model (LLM) settings for cad-viewer: provider configuration,
 * model factory, a framework-free settings dialog and LLM text recognition.
 *
 * Used by `@mlightcad/cad-agent-plugin` (chat) and, through
 * `AcApTextRecognitionService`, by `@mlightcad/cad-pdf-plugin` (`pdftext`).
 *
 * @packageDocumentation
 */

export * from './AcApLlmPlugin.js'
export * from './AcApLlmTextRecognizer.js'
export * from './command/AcApLlmSettingsCmd.js'
export * from './constants.js'
export {
  type AcApLlmLabelKey,
  type AcApLlmLabels,
  llmT,
  mergeLlmI18nIntoVueI18n,
  registerLlmI18n
} from './i18n/index.js'
export * from './model/AcApLlmModelFactory.js'
export * from './model/AcApLlmModelListing.js'
export * from './model/normalizeLlmBaseUrl.js'
export * from './model/skipDataUrlDownload.js'
export * from './storage/AcApLlmConfigStore.js'
export * from './storage/AcApLlmModelCatalog.js'
export * from './storage/settingsEquality.js'
export * from './ui/AcApLlmModelChoices.js'
export * from './ui/AcApLlmProviderLabels.js'
export * from './ui/AcUiLlmSettingsDialog.js'
