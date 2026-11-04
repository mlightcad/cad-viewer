/**
 * Wire protocol a provider speaks. Each provider uses exactly one, so a
 * gateway that serves two protocols is configured as two providers.
 */
export type LlmApiProtocol =
  | 'openai-chat'
  | 'openai-responses'
  | 'anthropic-messages'

/** Every protocol the settings UI offers, in display order. */
export const LLM_API_PROTOCOLS: readonly LlmApiProtocol[] = [
  'openai-chat',
  'openai-responses',
  'anthropic-messages'
]

/** One model a provider serves, as listed in the model selector. */
export interface LlmModelEntry {
  /** Model id sent to the provider API. */
  id: string
  /** Optional human-readable label; the id is shown when absent. */
  name?: string
  /** Whether the model accepts image input in chat. */
  vision: boolean
}

/** Ids of the providers that ship with the plugin. */
export type BuiltinProviderId =
  | 'deepseek'
  | 'deepseek-vl'
  | 'openai'
  | 'anthropic'

/** Static description of a built-in provider. */
export interface BuiltinProviderInfo {
  /** Protocol the provider speaks. */
  protocol: LlmApiProtocol
  /** Default REST base URL. */
  baseUrl: string
  /** Models offered when the user has not customized the catalog. */
  models: readonly LlmModelEntry[]
}

/** Built-in providers in the order the provider dropdown lists them. */
export const BUILTIN_PROVIDER_IDS: readonly BuiltinProviderId[] = [
  'deepseek',
  'deepseek-vl',
  'openai',
  'anthropic'
]

const OPENAI_MODELS: readonly LlmModelEntry[] = [
  { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini', vision: true },
  { id: 'gpt-5.4', name: 'GPT-5.4', vision: true },
  { id: 'gpt-5.5', name: 'GPT-5.5', vision: true },
  { id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna', vision: true },
  { id: 'gpt-5.6-terra', name: 'GPT-5.6 Terra', vision: true },
  { id: 'gpt-5.6-sol', name: 'GPT-5.6 Sol', vision: true }
]

/** Registry of built-in providers keyed by {@link BuiltinProviderId}. */
export const BUILTIN_PROVIDERS: Readonly<
  Record<BuiltinProviderId, BuiltinProviderInfo>
> = {
  deepseek: {
    protocol: 'openai-chat',
    baseUrl: 'https://api.deepseek.com/v1',
    models: [
      { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash', vision: false },
      { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', vision: false },
      { id: 'deepseek-chat', name: 'DeepSeek Chat (legacy)', vision: false },
      {
        id: 'deepseek-reasoner',
        name: 'DeepSeek Reasoner (legacy)',
        vision: false
      }
    ]
  },
  'deepseek-vl': {
    protocol: 'openai-chat',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: [
      { id: 'deepseek-vl2', name: 'DeepSeek VL2', vision: true },
      {
        id: 'deepseek-ai/deepseek-vl2-small',
        name: 'DeepSeek VL2 Small',
        vision: true
      },
      {
        id: 'deepseek-ai/deepseek-vl2-tiny',
        name: 'DeepSeek VL2 Tiny',
        vision: true
      },
      {
        id: 'deepseek-ai/deepseek-vl2',
        name: 'DeepSeek VL2 (HF)',
        vision: true
      }
    ]
  },
  openai: {
    protocol: 'openai-chat',
    baseUrl: 'https://api.openai.com/v1',
    models: OPENAI_MODELS
  },
  anthropic: {
    protocol: 'anthropic-messages',
    baseUrl: 'https://api.anthropic.com/v1',
    models: [
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', vision: true },
      { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', vision: true },
      { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', vision: true },
      { id: 'claude-opus-4-7', name: 'Claude Opus 4.7', vision: true },
      { id: 'claude-opus-4-8', name: 'Claude Opus 4.8', vision: true },
      { id: 'claude-opus-5', name: 'Claude Opus 5', vision: true },
      { id: 'claude-fable-5', name: 'Claude Fable 5', vision: true }
    ]
  }
}

/**
 * Checks whether a provider id names a built-in provider.
 *
 * @param id - Provider id to test.
 * @returns `true` for ids in {@link BUILTIN_PROVIDER_IDS}.
 */
export function isBuiltinProviderId(id: string): id is BuiltinProviderId {
  return (BUILTIN_PROVIDER_IDS as readonly string[]).includes(id)
}

/** Heuristic patterns for vision-capable models not listed in presets. */
const VISION_MODEL_PATTERNS = [
  /gpt-5/i,
  /gpt-4o/i,
  /gpt-4\.1/i,
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
  /glm-4(\.\d+)?v/i,
  /kimi.*(vl|vision)/i,
  /llava/i,
  /pixtral/i
]

/**
 * Guesses whether a model accepts image input from its id alone.
 *
 * Used for models the user adds by hand or adopts from a provider listing,
 * which rarely discloses input modalities.
 *
 * @param modelId - Model id to evaluate.
 * @returns `true` when the id matches a known vision model family.
 */
export function guessModelVision(modelId: string): boolean {
  return VISION_MODEL_PATTERNS.some(pattern => pattern.test(modelId))
}

/**
 * Computes a model row's vision flag after its id is edited.
 *
 * While the flag still agrees with the guess for the previous id the user has
 * not overridden it, so it keeps following the id as it is typed; a flag the
 * user set explicitly is left alone.
 *
 * @param previous - Row before the edit.
 * @param id - Edited model id.
 * @returns Vision flag for the edited row.
 */
export function visionAfterIdEdit(
  previous: LlmModelEntry,
  id: string
): boolean {
  return previous.vision === guessModelVision(previous.id)
    ? guessModelVision(id)
    : previous.vision
}

/**
 * Returns the display label of a model entry.
 *
 * @param entry - Model entry.
 * @returns The entry name, or its id when unnamed.
 */
export function modelLabel(entry: LlmModelEntry): string {
  return entry.name?.trim() || entry.id
}
