/**
 * English strings for the AI model settings dialog and the model picker.
 *
 * Flat keys under `main.llm` (merged into {@link AcApI18n}). Every other
 * locale file must define the same keys.
 */
export const llmEn = {
  title: 'AI Model Settings',
  activeModel: 'Model in use',
  activeModelHint:
    'Used by the CAD Agent chat. Text recognition (OCR) uses this model when it accepts images, otherwise the first image-capable model you configured.',
  activeModelNone: 'No provider configured yet',
  providerSettings: 'Providers',
  saved: 'Settings saved.',
  discardChangesConfirm: 'Discard unsaved provider changes?',
  visionMissing:
    'None of the configured models accepts images, so text recognition (OCR) is unavailable.',
  provider: 'Provider',
  providerDeepseek: 'DeepSeek',
  providerDeepseekVl: 'DeepSeek VL (vision)',
  providerDeepseekVlHint:
    'Uses an OpenAI-compatible vision endpoint (default: SiliconFlow). For self-hosted vLLM, set Base URL to your server, e.g. http://127.0.0.1:8000/v1.',
  providerOpenai: 'OpenAI',
  providerAnthropic: 'Anthropic',
  baseUrl: 'Base URL',
  baseUrlHint:
    'Must include /v1 for most gateways, e.g. https://ai-api.example.com/v1. Host-only URLs are auto-corrected.',
  apiKey: 'API Key',
  tabBuiltin: 'Third-party providers',
  tabCustom: 'Custom model API',
  builtinIntro:
    'Pick a built-in provider such as DeepSeek, OpenAI or Anthropic and enter its API key.',
  customIntro:
    'Connect a relay, self-hosted service or any other OpenAI / Anthropic compatible endpoint. Enter its API URL, protocol and models.',
  providerConfigured: 'configured',
  apiKeyPlaceholder: 'Enter API key',
  apiKeyRequired:
    'No API key yet. Enter one to send messages with this provider.',
  advancedSettings: 'Custom settings',
  baseUrlDefault: 'Leave blank to use the default: {url}',
  baseUrlInvalid: 'The API URL must start with http:// or https://.',
  customProvider: 'Custom provider',
  newCustomProvider: '+ New custom API',
  providerId: 'Provider ID',
  providerIdHint:
    'A lowercase identifier that starts with a letter (letters, digits and hyphens). It cannot be changed after creation.',
  providerIdInvalid:
    'Provider ID must start with a lowercase letter and contain only lowercase letters, digits and hyphens.',
  providerIdTaken: 'This Provider ID is already in use.',
  displayName: 'Display name',
  protocol: 'API protocol',
  protocolOpenaiChat: 'OpenAI Chat Completions',
  protocolOpenaiResponses: 'OpenAI Responses',
  protocolAnthropicMessages: 'Anthropic Messages',
  models: 'Model catalog',
  modelsDefault: 'Using built-in default models',
  modelsCustomized: 'Customized',
  resetModels: 'Restore defaults',
  modelsEmpty:
    'No models yet. Click "Fetch available models" or add a model ID manually.',
  modelId: 'Model ID',
  modelVision: 'Image',
  modelVisionHint: 'Accepts image input',
  removeModel: 'Remove model',
  addModel: 'Add model',
  fetchModels: 'Fetch available models',
  fetching: 'Fetching…',
  fetchNeedsKey: 'Enter an API key first',
  fetchNeedsBaseUrl: 'Enter an API URL first',
  fetchTitle: 'Choose models',
  fetchSearch: 'Search models',
  fetchSelectAll: 'Select all',
  fetchDeselectAll: 'Deselect all',
  fetchNoMatches: 'No matching models',
  fetchAdopt: 'Apply',
  fetchKeepOne: 'Keep at least one model',
  fetchEmpty: 'The endpoint returned no models. Add them manually.',
  fetchFailedNetwork:
    'Could not reach {url}. The network may be down, or the endpoint does not allow browser (CORS) requests. Add models manually.',
  fetchFailedHttp:
    'Failed to fetch models: the endpoint returned HTTP {status}. Check the API key and URL.',
  fetchFailedFormat:
    'The model list returned by the endpoint is not recognized. Add models manually.',
  needsProviderId: 'Enter a Provider ID.',
  needsBaseUrl: 'Enter the API URL.',
  needsModels: 'Add at least one model.',
  cancel: 'Cancel',
  save: 'Save',
  createProvider: 'Create provider',
  deleteProvider: 'Delete provider',
  deleteProviderConfirm: 'Delete provider "{id}" and its API key?',
  close: 'Close'
} as const
