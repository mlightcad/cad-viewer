import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'

import type { LlmSettings } from '../storage/LlmSettingsStore'
import { createOpenAiCompatibleFetch } from './openAiCompatibleFetch'

/**
 * Instantiates an AI SDK language model from persisted LLM settings.
 *
 * Selects the Anthropic, OpenAI, or OpenAI-compatible provider implementation
 * based on {@link LlmSettings.provider}.
 *
 * @param settings - Provider, API key, base URL, and model id.
 * @returns A configured {@link LanguageModel}.
 * @throws When {@link LlmSettings.apiKey} is empty.
 */
export function createModelFromSettings(settings: LlmSettings): LanguageModel {
  if (!settings.apiKey.trim()) {
    throw new Error('API key is required. Open Agent settings to configure it.')
  }

  if (settings.provider === 'anthropic') {
    const anthropic = createAnthropic({
      apiKey: settings.apiKey,
      baseURL: settings.baseUrl || undefined
    })
    return anthropic(settings.model)
  }

  if (settings.provider === 'openai') {
    const openai = createOpenAI({
      apiKey: settings.apiKey,
      baseURL: settings.baseUrl || undefined,
      compatibility: 'strict'
    })
    return openai.chat(settings.model)
  }

  // DeepSeek and other OpenAI-compatible endpoints use /chat/completions
  // and reject the `developer` role that AI SDK 5 may emit for system prompts.
  const openai = createOpenAI({
    apiKey: settings.apiKey,
    baseURL: settings.baseUrl || undefined,
    compatibility: 'compatible',
    fetch: createOpenAiCompatibleFetch()
  })
  return openai.chat(settings.model)
}
