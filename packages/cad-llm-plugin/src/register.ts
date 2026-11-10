import {
  AcApDocManager,
  AcApLlmSettingsService,
  type AcApPluginManager,
  AcApTextRecognitionService
} from '@mlightcad/cad-simple-viewer'

import {
  LLM_PLUGIN_NAME,
  LLM_PLUGIN_TRIGGERS,
  LLM_SERVICE_ID
} from './constants'
import { registerLlmI18n } from './i18n'

/** Loads the main bundle on first use. */
const loadMain = () => import('@mlightcad/cad-llm-plugin')

/**
 * Registers the shared AI model settings for lazy loading:
 *
 * - the `llmsettings` command,
 * - the settings dialog in `AcApLlmSettingsService`, so any feature (CAD
 *   agent, PDF text recognition, ...) can open it or check what is
 *   configured,
 * - the LLM text recognizer in `AcApTextRecognitionService`, used by `pdftext`
 *   when a vision-capable model is configured.
 *
 * Import from `@mlightcad/cad-llm-plugin/register` so the main bundle (which
 * includes the AI SDK) stays out of the application entry chunk.
 *
 * @param pluginManager - Plugin manager that receives the lazy registration.
 */
export function registerLazyLlmPlugin(pluginManager: AcApPluginManager): void {
  registerLlmI18n()

  AcApTextRecognitionService.register({
    id: LLM_SERVICE_ID,
    recognize: async request => (await loadMain()).acapLlmRecognizeText(request)
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
} from './constants'
export {
  type AcApLlmLabelKey,
  llmT,
  mergeLlmI18nIntoVueI18n,
  registerLlmI18n
} from './i18n'
