import {
  AcApDocManager,
  AcApLlmSettingsService,
  type AcApPluginManager,
  AcApTextRecognitionService,
  AcApUiRegistry
} from '@mlightcad/cad-simple-viewer'

import {
  LLM_PLUGIN_NAME,
  LLM_PLUGIN_TRIGGERS,
  LLM_SERVICE_ID
} from './constants.js'
import { llmLocaleMessages, llmT, registerLlmI18n } from './i18n/index.js'
import { LLM_SETTINGS_ICON } from './ui/icons.js'

/** Loads the main bundle on first use. */
const loadMain = () => import('@mlightcad/cad-llm-plugin')

/**
 * Registers the shared AI model settings for lazy loading:
 *
 * - the `llmsettings` command,
 * - the settings dialog in `AcApLlmSettingsService`, so any feature (CAD
 *   agent, PDF text recognition, ...) can open it or check what is
 *   configured,
 * - a bootstrap OCR recognizer (`cad-llm`) for the `pdftext` auto chain,
 * - per-model OCR entries (`cad-llm:<provider>/<model>`) refreshed into the
 *   PDF import picker whenever settings change.
 *
 * Import from `@mlightcad/cad-llm-plugin/register` so the main bundle (which
 * includes the AI SDK) stays out of the application entry chunk.
 *
 * @param pluginManager - Plugin manager that receives the lazy registration.
 */
export function registerLazyLlmPlugin(pluginManager: AcApPluginManager): void {
  registerLlmI18n()

  AcApUiRegistry.register({
    plugin: LLM_PLUGIN_NAME,
    messages: llmLocaleMessages(),
    ribbonGroups: [
      {
        id: 'ai-model',
        tabId: 'ai',
        titleKey: 'main.ribbon.group.aiModel',
        placement: 'start',
        order: 1,
        items: [
          {
            id: 'cmd-llmsettings',
            command: 'llmsettings',
            labelKey: 'main.ribbon.command.llmSettings',
            tooltipKey: 'main.ribbon.tooltip.llmSettings',
            iconSvg: LLM_SETTINGS_ICON,
            size: 'large'
          }
        ]
      }
    ]
  })

  AcApTextRecognitionService.register({
    id: LLM_SERVICE_ID,
    label: () => llmT('ocrLabel'),
    keyword: () => ({
      display: llmT('ocrKeywordDisplay'),
      local: llmT('ocrKeywordLocal'),
      global: llmT('ocrKeywordGlobal')
    }),
    // Hidden from the import picker; per-model entries are listed instead.
    isAvailable: () => false,
    // Still used by `pdftext` when no explicit provider id is chosen.
    auto: true,
    refresh: async () => {
      const main = await loadMain()
      main.acapLlmWatchOcrRecognizers()
      await main.acapLlmSyncOcrRecognizers()
    },
    recognize: async request =>
      (await loadMain()).acapLlmRecognizeText(request),
    recognizeBatch: async request =>
      (await loadMain()).acapLlmRecognizeTextBatch(request)
  })

  AcApLlmSettingsService.register({
    id: LLM_SERVICE_ID,
    open: async options => {
      const { AcUiLlmSettingsDialog } = await loadMain()
      await AcUiLlmSettingsDialog.open({
        host:
          options?.host ??
          AcApDocManager.instance.curView?.container ??
          document.body
      })
    },
    getStatus: async () => (await loadMain()).acapLlmGetStatus()
  })

  pluginManager.registerLazyPlugin({
    name: LLM_PLUGIN_NAME,
    triggers: [...LLM_PLUGIN_TRIGGERS],
    loader: async () => (await loadMain()).createLlmPlugin()
  })
}

export {
  LLM_PLUGIN_NAME,
  LLM_PLUGIN_TRIGGERS,
  LLM_SERVICE_ID
} from './constants.js'
export {
  type AcApLlmLabelKey,
  llmT,
  mergeLlmI18nIntoVueI18n,
  registerLlmI18n
} from './i18n/index.js'
