import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'

import type { AcApLlmSettings } from '../storage/AcApLlmConfigStore'
import { ACAP_LLM_ANTHROPIC_BROWSER_ACCESS_HEADER } from './anthropicBrowserAccess'
import { acapLlmNormalizeBaseUrl } from './normalizeLlmBaseUrl'
import { acapLlmCreateOpenAiCompatibleFetch } from './openAiCompatibleFetch'

/**
 * Instantiates an AI SDK language model from resolved LLM settings.
 *
 * Selects the Anthropic Messages, OpenAI Responses or OpenAI Chat Completions
 * implementation based on {@link AcApLlmSettings.protocol}.
 *
 * @param settings - Provider, protocol, API key, base URL, and model id.
 * @returns A configured {@link LanguageModel}.
 * @throws When {@link AcApLlmSettings.apiKey} is empty.
 */
export function acapLlmCreateModel(settings: AcApLlmSettings): LanguageModel {
  if (!settings.apiKey.trim()) {
    throw new Error(
      'API key is required. Run LLMSETTINGS to configure a model.'
    )
  }

  const baseURL = acapLlmNormalizeBaseUrl(settings.baseUrl)

  if (settings.protocol === 'anthropic-messages') {
    const anthropic = createAnthropic({
      apiKey: settings.apiKey,
      baseURL,
      headers: ACAP_LLM_ANTHROPIC_BROWSER_ACCESS_HEADER
    })
    return anthropic(settings.model)
  }

  if (settings.protocol === 'openai-responses') {
    const openai = createOpenAI({ apiKey: settings.apiKey, baseURL })
    return openai.responses(settings.model)
  }

  if (settings.kind === 'builtin' && settings.provider === 'openai') {
    const openai = createOpenAI({ apiKey: settings.apiKey, baseURL })
    return openai.chat(settings.model)
  }

  // DeepSeek text API, DeepSeek VL, and other OpenAI-compatible endpoints use
  // /chat/completions and reject the `developer` role that AI SDK 5 may emit.
  const openai = createOpenAI({
    apiKey: settings.apiKey,
    baseURL,
    fetch: acapLlmCreateOpenAiCompatibleFetch()
  })
  return openai.chat(settings.model)
}
