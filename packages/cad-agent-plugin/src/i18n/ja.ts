/**
 * English UI strings for the CAD Agent panel.
 *
 * Flat keys under `main.toolPalette.agent` (merged into {@link AcApI18n}).
 * Keys must stay in sync with {@link agentEn}.
 */
export const agentJa = {
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
  copyMessage: 'Copy message',
  messageCopied: 'Copied',
  editMessage: 'Edit message',
  cancelEdit: 'Cancel',
  resendMessage: 'Send',
  relativeTimeJustNow: 'just now',
  relativeTimeSeconds: '{n}s ago',
  relativeTimeMinutes: '{n}m ago',
  relativeTimeHours: '{n}h ago',
  relativeTimeDays: '{n}d ago',
  queuedSendNow: 'Send now',
  queuedEdit: 'Edit',
  queuedDelete: 'Delete',
  inputPlaceholder: 'Describe your request…',
  attachImage: 'Attach image',
  showContextUsage: 'Show context usage',
  contextUsage: 'Context Usage',
  contextUsageDetail: '{percent}% · {used} / {limit}',
  contextUsageFull: '{percent}% Full',
  contextUsageTokens: '~{used} / {limit} Tokens',
  contextUsageSystemPrompt: 'System prompt',
  contextUsageToolDefinitions: 'Tool definitions',
  contextUsageImages: 'Images',
  contextUsageConversation: 'Conversation',
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
  toolsFailed: '{count} failed',
  taskPrompts: 'Suggested tasks',
  taskPromptsTitle: 'Common tasks',
  taskCategoryExtract: 'Extract',
  taskCategoryStats: 'Statistics',
  taskCategoryModify: 'Modify',
  taskCategoryCreate: 'Create',
  taskCategoryReview: 'Review',
  taskDrawingOverviewTitle: 'Drawing overview',
  taskDrawingOverviewPrompt:
    'Summarize the open drawing: extents, unit system if detectable, layer list, and a short description of what the drawing appears to contain. Query the drawing — do not redraw.',
  taskExtractTextTitle: 'Extract text & title block',
  taskExtractTextPrompt:
    'Extract all readable text from the open drawing, including title-block fields if present. Group by layer or area when helpful, and list the values clearly.',
  taskListDimensionsTitle: 'List dimensions',
  taskListDimensionsPrompt:
    'Find dimension entities in the open drawing and list their measured values, associated text, and approximate locations. Summarize any obvious missing or inconsistent dimensions.',
  taskEntityStatsTitle: 'Entity counts',
  taskEntityStatsPrompt:
    'Count entities in the open drawing by type and by layer. Prefer summary queries (counts / per-block stats) over dumping every entity. Present a compact table or bullet summary.',
  taskLayerReportTitle: 'Layer usage report',
  taskLayerReportPrompt:
    'Report on layers in the open drawing: name, on/off, freeze, color, linetype, and approximate entity count per layer. Flag empty, unused, or oddly named layers.',
  taskOrganizeLayersTitle: 'Organize by layer',
  taskOrganizeLayersPrompt:
    'Propose and apply a sensible layer organization for the open drawing (e.g. walls, doors, text, dimensions, furniture). Move misplaced entities onto appropriate layers and create missing layers if needed. Explain what you changed.',
  taskCleanupDrawingTitle: 'Clean up drawing',
  taskCleanupDrawingPrompt:
    'Inspect the open drawing for common cleanup issues (zero-length geometry, duplicate overlapping entities where detectable, empty text, unused layers) and fix what is safe to fix. Summarize actions taken and anything left for manual review.',
  taskDrawDimensionedRectTitle: 'Draw dimensioned rectangle',
  taskDrawDimensionedRectPrompt:
    'Draw a closed rectangle 1000 × 600 (drawing units) with the lower-left corner at (0, 0). Add horizontal and vertical dimensions for width and height. Use clear layers for geometry and dimensions.',
  taskCreateTitleBlockTitle: 'Create a title block',
  taskCreateTitleBlockPrompt:
    'Create a simple A3-style title block in model space (or paper space if already set up): outer frame, title, drawing number, scale, date, and drawn-by fields with placeholder text. Keep geometry on a dedicated layer.',
  taskFromReferenceTitle: 'Draw from reference image',
  taskFromReferencePrompt:
    'I will attach a reference image (sketch, screenshot, or plan). Analyze it carefully, then reconstruct the intended 2D CAD geometry with correct proportions, layers, and dimensions where visible. Ask only if a critical size is ambiguous.',
  taskDraftingReviewTitle: 'Drafting quality review',
  taskDraftingReviewPrompt:
    'Review the open drawing for drafting quality issues: inconsistent text heights, dimensions that may not match geometry, overlapping annotations, entities on layer 0 that should be elsewhere, and incomplete views. List findings by severity; fix only clear, safe issues unless I ask otherwise.',
  taskLayerStandardsTitle: 'Layer naming check',
  taskLayerStandardsPrompt:
    'Review layer names, colors, and usage against common CAD conventions. Suggest a clearer naming scheme and optionally rename/recolor layers after summarizing the proposed changes.'
} as const
