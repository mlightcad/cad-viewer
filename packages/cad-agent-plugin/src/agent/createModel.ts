import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'

import type { LlmSettings } from '../storage/LlmSettingsStore'
import { ANTHROPIC_BROWSER_ACCESS_HEADER } from './anthropicBrowserAccess'
import { normalizeLlmBaseUrl } from './normalizeLlmBaseUrl'
import { createOpenAiCompatibleFetch } from './openAiCompatibleFetch'

/**
 * Instantiates an AI SDK language model from resolved LLM settings.
 *
 * Selects the Anthropic Messages, OpenAI Responses or OpenAI Chat Completions
 * implementation based on {@link LlmSettings.protocol}.
 *
 * @param settings - Provider, protocol, API key, base URL, and model id.
 * @returns A configured {@link LanguageModel}.
 * @throws When {@link LlmSettings.apiKey} is empty.
 */
export function createModelFromSettings(settings: LlmSettings): LanguageModel {
  if (!settings.apiKey.trim()) {
    throw new Error('API key is required. Open Agent settings to configure it.')
  }

  const baseURL = normalizeLlmBaseUrl(settings.baseUrl)

  if (settings.protocol === 'anthropic-messages') {
    const anthropic = createAnthropic({
      apiKey: settings.apiKey,
      baseURL,
      headers: ANTHROPIC_BROWSER_ACCESS_HEADER
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
    fetch: createOpenAiCompatibleFetch()
  })
  return openai.chat(settings.model)
}
