/**
 * English UI strings for the CAD Agent panel.
 *
 * Flat keys under `main.toolPalette.agent` (merged into {@link AcApI18n}).
 * Keys must stay in sync with {@link agentZh}.
 */
export const agentEn = {
  tab: 'Agent',
  title: 'CAD Agent',
  settings: 'Settings',
  clear: 'New chat',
  close: 'Close',
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
  model: 'Model',
  apiKey: 'API Key',
  emptyHint:
    'Describe what to draw, or attach a reference image (sketch, screenshot, floor plan).',
  toolPrefix: 'tool',
  copyTool: 'Copy tool call (input & output)',
  toolCopied: 'Copied',
  inputPlaceholder: 'Describe your request…',
  attachImage: 'Attach image',
  removeAttachment: 'Remove',
  imageAlt: 'Attached image',
  imageOnlyRequest:
    'Please analyze the attached reference image(s) and help me draw this in CAD.',
  prepareImageFailed:
    'Failed to prepare the attached image. Try a smaller PNG or JPEG.',
  errorTitle: 'Something went wrong',
  dismissError: 'Dismiss',
  send: 'Send',
  stop: 'Stop',
  working: 'Working…',
  agentMode: 'Agent mode',
  agentModeSimple: 'Simple',
  agentModeHighInference: 'High inference',
  agentModeSimpleHint:
    'Default. Fast — measure-API self-check only; no screenshots or vision verification.',
  agentModeHighInferenceHint:
    'Opt-in for complex tasks. Allows screenshots and verifies with screenshot + vision model (up to 5 rounds). Requires a vision model.',
  highInferenceRequiresVision:
    'High inference mode requires a vision-capable model.',
  verificationTitle: 'Drawing verification',
  verifying:
    'Comparing the drawing screenshot with your request and reference images…',
  verificationPassed: 'Verification passed — the drawing matches the request.',
  verificationFailed: 'Verification failed — issues found:',
  verificationSkipped: 'Verification skipped',
  verificationError: 'Verification error',
  verificationContinuing: 'Continuing to optimize the drawing…',
  verificationMaxAttempts:
    'Verification did not pass within the maximum number of attempts.',
  referenceImages: 'Reference image(s)',
  drawingScreenshot: 'Current drawing screenshot',
  unsavedSettings: 'Save settings before sending messages.',
  missingApiKey: 'Configure an API key in settings before sending messages.',
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
  toolsSummary: 'Tool calls: {count}',
  toolsRunning: 'Running tools ({count})…',
  toolsFailed: '{count} failed'
} as const
