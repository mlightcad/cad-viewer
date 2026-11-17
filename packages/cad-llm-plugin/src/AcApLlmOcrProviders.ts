/**
 * Keeps one {@link AcApTextRecognitionService} entry per vision-capable LLM
 * model so the PDF import dialog can list them individually (provider + model).
 */

import { AcApTextRecognitionService } from '@mlightcad/cad-simple-viewer'

import {
  acapLlmRecognizeText,
  acapLlmRecognizeTextBatch
} from './AcApLlmTextRecognizer.js'
import { acapLlmOcrRecognizerId } from './constants.js'
import {
  acapLlmEffectiveModels,
  acapLlmLoadConfig,
  acapLlmOnConfigChange,
  type AcApLlmProviderConfig
} from './storage/AcApLlmConfigStore.js'
import { acapLlmModelLabel } from './storage/AcApLlmModelCatalog.js'
import { acapLlmProviderLabel } from './ui/AcApLlmProviderLabels.js'

/** Ids of per-model OCR recognizers currently registered by this module. */
const registeredModelOcrIds = new Set<string>()

let unsubscribeConfig: (() => void) | undefined
let syncing: Promise<void> | undefined

/**
 * Registers or refreshes one OCR recognizer per configured vision model
 * (`cad-llm:<provider>/<model>`, `auto: false` so only explicit picker use
 * runs them). The bootstrap `cad-llm` recognizer stays for `pdftext`
 * auto-fallback.
 */
export async function acapLlmSyncOcrRecognizers(): Promise<void> {
  if (syncing) return syncing
  syncing = syncOcrRecognizers().finally(() => {
    syncing = undefined
  })
  return syncing
}

/**
 * Starts listening for LLM settings saves so the PDF import OCR list stays
 * current. Idempotent.
 */
export function acapLlmWatchOcrRecognizers(): void {
  if (unsubscribeConfig) return
  unsubscribeConfig = acapLlmOnConfigChange(() => {
    void acapLlmSyncOcrRecognizers()
  })
}

async function syncOcrRecognizers(): Promise<void> {
  const config = await acapLlmLoadConfig()
  const nextIds = new Set<string>()

  for (const provider of config.providers) {
    if (!provider.apiKey.trim()) continue
    const providerLabel = acapLlmProviderLabel(provider)
    for (const model of visionModels(provider)) {
      const id = acapLlmOcrRecognizerId(provider.id, model.id)
      nextIds.add(id)
      const modelLabel = acapLlmModelLabel(model)
      const label = () => `${providerLabel} — ${modelLabel}`
      AcApTextRecognitionService.register({
        id,
        label,
        keyword: () => ({
          display: label(),
          local: label(),
          // Stable English slug for `-pdfimport` keywords.
          global: `${provider.id}/${model.id}`
        }),
        // Picker-only: `pdftext` keeps using the bootstrap `cad-llm` auto entry.
        auto: false,
        isAvailable: () => true,
        recognize: request =>
          acapLlmRecognizeText(request, {
            providerId: provider.id,
            modelId: model.id
          }),
        recognizeBatch: request =>
          acapLlmRecognizeTextBatch(request, {
            providerId: provider.id,
            modelId: model.id
          })
      })
      registeredModelOcrIds.add(id)
    }
  }

  for (const id of [...registeredModelOcrIds]) {
    if (nextIds.has(id)) continue
    AcApTextRecognitionService.unregister(id)
    registeredModelOcrIds.delete(id)
  }
}

function visionModels(provider: AcApLlmProviderConfig) {
  return acapLlmEffectiveModels(provider).filter(model => model.vision)
}
