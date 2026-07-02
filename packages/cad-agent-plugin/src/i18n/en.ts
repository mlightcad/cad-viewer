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
  providerDeepseekVl: 'DeepSeek VL (vision)',
  providerDeepseekVlHint:
    'Uses an OpenAI-compatible vision endpoint (default: SiliconFlow). For self-hosted vLLM, set Base URL to your server, e.g. http://127.0.0.1:8000/v1.',
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
  stop: 'Stop',
  working: 'Working…',
  agentMode: 'Agent mode',
  agentModeSimple: 'Simple',
  agentModeHighInference: 'High inference',
  agentModeSimpleHint: 'Fast — no screenshot verification after drawing.',
  agentModeHighInferenceHint:
    'Verifies the drawing with screenshot + vision model (up to 5 rounds). Requires a vision model.',
  highInferenceRequiresVision:
    'High inference mode requires a vision-capable model.',
  verificationTitle: 'Drawing verification',
  verifying: 'Comparing the drawing screenshot with your request and reference images…',
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
  missingApiKey: 'Configure an API key in settings before sending messages.'
} as const
