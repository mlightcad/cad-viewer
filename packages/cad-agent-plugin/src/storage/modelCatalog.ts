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
  google: [
    {
      value: 'gemini-2.5-pro',
      labelEn: 'Gemini 2.5 Pro',
      labelZh: 'Gemini 2.5 Pro',
      supportsVision: true
    },
    {
      value: 'gemini-2.5-flash',
      labelEn: 'Gemini 2.5 Flash',
      labelZh: 'Gemini 2.5 Flash',
      supportsVision: true
    },
    {
      value: 'gemini-2.0-flash',
      labelEn: 'Gemini 2.0 Flash',
      labelZh: 'Gemini 2.0 Flash',
      supportsVision: true
    },
    {
      value: 'gemini-1.5-pro',
      labelEn: 'Gemini 1.5 Pro',
      labelZh: 'Gemini 1.5 Pro',
      supportsVision: true
    },
    {
      value: 'gemini-1.5-flash',
      labelEn: 'Gemini 1.5 Flash',
      labelZh: 'Gemini 1.5 Flash',
      supportsVision: true
    }
  ],
  deepseek: [
    {
      value: 'deepseek-v4-flash',
      labelEn: 'DeepSeek V4 Flash',
      labelZh: 'DeepSeek V4 Flash',
      supportsVision: false
    },
    {
      value: 'deepseek-v4-pro',
      labelEn: 'DeepSeek V4 Pro',
      labelZh: 'DeepSeek V4 Pro',
      supportsVision: false
    },
    {
      value: 'deepseek-chat',
      labelEn: 'DeepSeek Chat (legacy)',
      labelZh: 'DeepSeek Chat（旧版别名）',
      supportsVision: false
    },
    {
      value: 'deepseek-reasoner',
      labelEn: 'DeepSeek Reasoner (legacy)',
      labelZh: 'DeepSeek Reasoner（旧版别名）',
      supportsVision: false
    }
  ],
  'deepseek-vl': [
    {
      value: 'deepseek-vl2',
      labelEn: 'DeepSeek VL2',
      labelZh: 'DeepSeek VL2',
      supportsVision: true
    },
    {
      value: 'deepseek-ai/deepseek-vl2-small',
      labelEn: 'DeepSeek VL2 Small',
      labelZh: 'DeepSeek VL2 Small',
      supportsVision: true
    },
    {
      value: 'deepseek-ai/deepseek-vl2-tiny',
      labelEn: 'DeepSeek VL2 Tiny',
      labelZh: 'DeepSeek VL2 Tiny',
      supportsVision: true
    },
    {
      value: 'deepseek-ai/deepseek-vl2',
      labelEn: 'DeepSeek VL2 (HuggingFace id)',
      labelZh: 'DeepSeek VL2（HuggingFace 路径）',
      supportsVision: true
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
