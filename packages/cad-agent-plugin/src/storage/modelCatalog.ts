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
      value: 'gpt-5.4-mini',
      labelEn: 'GPT-5.4 Mini',
      labelZh: 'GPT-5.4 Mini',
      supportsVision: true
    },
    {
      value: 'gpt-5.4',
      labelEn: 'GPT-5.4',
      labelZh: 'GPT-5.4',
      supportsVision: true
    },
    {
      value: 'gpt-5.5',
      labelEn: 'GPT-5.5',
      labelZh: 'GPT-5.5',
      supportsVision: true
    },
    {
      value: 'gpt-5.6-luna',
      labelEn: 'GPT-5.6 Luna',
      labelZh: 'GPT-5.6 Luna',
      supportsVision: true
    },
    {
      value: 'gpt-5.6-terra',
      labelEn: 'GPT-5.6 Terra',
      labelZh: 'GPT-5.6 Terra',
      supportsVision: true
    },
    {
      value: 'gpt-5.6-sol',
      labelEn: 'GPT-5.6 Sol',
      labelZh: 'GPT-5.6 Sol',
      supportsVision: true
    }
  ],
  anthropic: [
    {
      value: 'claude-sonnet-4-6',
      labelEn: 'Claude Sonnet 4.6',
      labelZh: 'Claude Sonnet 4.6',
      supportsVision: true
    },
    {
      value: 'claude-sonnet-5',
      labelEn: 'Claude Sonnet 5',
      labelZh: 'Claude Sonnet 5',
      supportsVision: true
    },
    {
      value: 'claude-opus-4-6',
      labelEn: 'Claude Opus 4.6',
      labelZh: 'Claude Opus 4.6',
      supportsVision: true
    },
    {
      value: 'claude-opus-4-7',
      labelEn: 'Claude Opus 4.7',
      labelZh: 'Claude Opus 4.7',
      supportsVision: true
    },
    {
      value: 'claude-opus-4-8',
      labelEn: 'Claude Opus 4.8',
      labelZh: 'Claude Opus 4.8',
      supportsVision: true
    },
    {
      value: 'claude-opus-5',
      labelEn: 'Claude Opus 5',
      labelZh: 'Claude Opus 5',
      supportsVision: true
    },
    {
      value: 'claude-fable-5',
      labelEn: 'Claude Fable 5',
      labelZh: 'Claude Fable 5',
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
      value: 'gpt-5.4-mini',
      labelEn: 'GPT-5.4 Mini',
      labelZh: 'GPT-5.4 Mini',
      supportsVision: true
    },
    {
      value: 'gpt-5.4',
      labelEn: 'GPT-5.4',
      labelZh: 'GPT-5.4',
      supportsVision: true
    },
    {
      value: 'gpt-5.5',
      labelEn: 'GPT-5.5',
      labelZh: 'GPT-5.5',
      supportsVision: true
    },
    {
      value: 'gpt-5.6-luna',
      labelEn: 'GPT-5.6 Luna',
      labelZh: 'GPT-5.6 Luna',
      supportsVision: true
    },
    {
      value: 'gpt-5.6-terra',
      labelEn: 'GPT-5.6 Terra',
      labelZh: 'GPT-5.6 Terra',
      supportsVision: true
    },
    {
      value: 'gpt-5.6-sol',
      labelEn: 'GPT-5.6 Sol',
      labelZh: 'GPT-5.6 Sol',
      supportsVision: true
    }
  ]
}

/** Heuristic patterns for vision-capable models not listed in presets. */
const VISION_MODEL_PATTERNS = [
  /gpt-5/i,
  /gpt-4o/i,
  /gpt-4-turbo/i,
  /gpt-4-vision/i,
  /claude-3/i,
  /claude-sonnet/i,
  /claude-opus/i,
  /claude-haiku/i,
  /claude-fable/i,
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
