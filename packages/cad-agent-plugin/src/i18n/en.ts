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
  clear: 'Clear',
  close: 'Close',
  provider: 'Provider',
  providerDeepseek: 'DeepSeek',
  providerOpenai: 'OpenAI',
  providerAnthropic: 'Anthropic',
  providerOpenaiCompatible: 'OpenAI Compatible',
  baseUrl: 'Base URL',
  model: 'Model',
  visionModels: 'Vision models',
  textModels: 'Text-only models',
  customModel: 'Custom model…',
  customModelName: 'Custom model name',
  modelSupportsVision: 'Supports image input',
  modelTextOnly: 'Text only — image attachments disabled',
  apiKey: 'API Key',
  saveSettings: 'Save settings',
  emptyHint:
    'Describe what to draw, or attach a reference image (sketch, screenshot, floor plan).',
  toolPrefix: 'tool',
  inputPlaceholder: 'Describe the geometry to create…',
  attachImage: 'Attach image',
  removeAttachment: 'Remove',
  imageAlt: 'Attached image',
  errorTitle: 'Something went wrong',
  dismissError: 'Dismiss',
  send: 'Send',
  working: 'Working…',
  unsavedSettings: 'Save settings before sending messages.',
  missingApiKey: 'Configure an API key in settings before sending messages.'
} as const
