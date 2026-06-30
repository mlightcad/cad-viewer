import type { LlmProviderId } from './LlmSettingsStore'

/**
 * A selectable model entry in the agent settings dropdown.
 */
export interface LlmModelOption {
  /** Model id sent to the provider API. */
  value: string
  /** English display label. */
  labelEn: string
  /** Chinese display label. */
  labelZh: string
  /** Whether the model accepts image attachments in chat. */
  supportsVision: boolean
}

/** Sentinel select value when the user enters a custom model name. */
export const CUSTOM_MODEL_VALUE = '__custom__'

/**
 * Preset model lists grouped by {@link LlmProviderId} for the settings UI.
 */
export const PROVIDER_MODEL_OPTIONS: Record<
  LlmProviderId,
  readonly LlmModelOption[]
> = {
  openai: [
    {
      value: 'gpt-4o',
      labelEn: 'GPT-4o',
      labelZh: 'GPT-4o',
      supportsVision: true
    },
    {
      value: 'gpt-4o-mini',
      labelEn: 'GPT-4o Mini',
      labelZh: 'GPT-4o Mini',
      supportsVision: true
    },
    {
      value: 'gpt-4-turbo',
      labelEn: 'GPT-4 Turbo',
      labelZh: 'GPT-4 Turbo',
      supportsVision: true
    },
    {
      value: 'gpt-3.5-turbo',
      labelEn: 'GPT-3.5 Turbo',
      labelZh: 'GPT-3.5 Turbo',
      supportsVision: false
    }
  ],
  anthropic: [
    {
      value: 'claude-3-5-sonnet-latest',
      labelEn: 'Claude 3.5 Sonnet',
      labelZh: 'Claude 3.5 Sonnet',
      supportsVision: true
    },
    {
      value: 'claude-3-5-haiku-latest',
      labelEn: 'Claude 3.5 Haiku',
      labelZh: 'Claude 3.5 Haiku',
      supportsVision: true
    },
    {
      value: 'claude-3-opus-latest',
      labelEn: 'Claude 3 Opus',
      labelZh: 'Claude 3 Opus',
      supportsVision: true
    }
  ],
  deepseek: [
    {
      value: 'deepseek-chat',
      labelEn: 'DeepSeek Chat',
      labelZh: 'DeepSeek Chat',
      supportsVision: false
    },
    {
      value: 'deepseek-reasoner',
      labelEn: 'DeepSeek Reasoner',
      labelZh: 'DeepSeek Reasoner',
      supportsVision: false
    }
  ],
  'openai-compatible': [
    {
      value: 'gpt-4o-mini',
      labelEn: 'GPT-4o Mini',
      labelZh: 'GPT-4o Mini',
      supportsVision: true
    },
    {
      value: 'gpt-4o',
      labelEn: 'GPT-4o',
      labelZh: 'GPT-4o',
      supportsVision: true
    },
    {
      value: 'gpt-3.5-turbo',
      labelEn: 'GPT-3.5 Turbo',
      labelZh: 'GPT-3.5 Turbo',
      supportsVision: false
    }
  ]
}

/** Heuristic patterns for vision-capable models not listed in presets. */
const VISION_MODEL_PATTERNS = [
  /gpt-4o/i,
  /gpt-4-turbo/i,
  /gpt-4-vision/i,
  /claude-3/i,
  /claude-sonnet-4/i,
  /claude-opus-4/i,
  /claude-haiku-4/i,
  /gemini/i,
  /qwen.*vl/i,
  /deepseek-vl/i,
  /glm-4v/i,
  /llava/i,
  /pixtral/i
]

/**
 * Finds a preset model option for the given provider and model id.
 *
 * @param provider - LLM provider id.
 * @param model - Model id to look up.
 * @returns The matching option, or `undefined` for custom models.
 */
export function findModelOption(
  provider: LlmProviderId,
  model: string
): LlmModelOption | undefined {
  return PROVIDER_MODEL_OPTIONS[provider].find(option => option.value === model)
}

/**
 * Determines whether a model supports image input for the agent chat.
 *
 * Checks preset options first, then falls back to {@link VISION_MODEL_PATTERNS}.
 *
 * @param provider - LLM provider id.
 * @param model - Model id to evaluate.
 * @returns `true` when image attachments are allowed for this model.
 */
export function modelSupportsVision(
  provider: LlmProviderId,
  model: string
): boolean {
  const preset = findModelOption(provider, model)
  if (preset) return preset.supportsVision
  return VISION_MODEL_PATTERNS.some(pattern => pattern.test(model))
}

/**
 * Maps a stored model id to a settings dropdown value.
 *
 * @param provider - LLM provider id.
 * @param model - Current model id from settings.
 * @returns The model id when preset, or {@link CUSTOM_MODEL_VALUE} otherwise.
 */
export function resolveModelSelection(
  provider: LlmProviderId,
  model: string
): string {
  return findModelOption(provider, model) ? model : CUSTOM_MODEL_VALUE
}

/**
 * Returns preset models for a provider filtered by vision support.
 *
 * @param provider - LLM provider id.
 * @param vision - When `true`, return vision models; otherwise text-only models.
 * @returns Filtered copy of the provider's preset list.
 */
export function modelOptionsForProvider(
  provider: LlmProviderId,
  vision: boolean
): LlmModelOption[] {
  return PROVIDER_MODEL_OPTIONS[provider].filter(
    option => option.supportsVision === vision
  )
}
