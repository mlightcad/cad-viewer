<script setup lang="ts">
import '../ui/agent-panel.css'

import type { UIMessage } from 'ai'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import {
  type AgentContextUsage,
  type AgentContextUsageCategoryId,
  contextUsagePercent,
  formatTokenCount,
  resolveContextWindow
} from '../agent/contextUsage'
import type { AgentChatLabelKey } from '../i18n'
import { agentT } from '../i18n'
import { useAgentI18n } from '../i18n/useAgentI18n'
import {
  type AgentMode,
  loadAgentMode,
  saveAgentMode
} from '../storage/AgentModeStore'
import {
  activeModelSupportsVision,
  createDefaultLlmConfig,
  effectiveModels,
  findProvider,
  type LlmConfig,
  loadLlmConfig,
  resolveActiveSettings,
  saveLlmConfig
} from '../storage/LlmSettingsStore'
import { modelLabel } from '../storage/modelCatalog'
import AgentModelSettings from './AgentModelSettings.vue'
import { formatChatError } from './formatChatError'
import { prepareImageAttachments } from './prepareImageAttachments'
import { providerLabel } from './providerLabels'
import {
  AGENT_TASK_CATEGORY_LABEL_KEYS,
  AGENT_TASK_CATEGORY_ORDER,
  AGENT_TASKS,
  type AgentTaskDef
} from './taskPrompts'
import { createAgentChatOptions, useAgentChatRef } from './useAgentChat'

/** Image file part on a {@link UIMessage} from the AI SDK. */
type FilePart = {
  type: 'file'
  url: string
  mediaType?: string
  filename?: string
}

/**
 * CAD Agent chat UI: settings, message history, image attachments, and tool-call display.
 *
 * Renders embedded in the tool palette or as a standalone overlay panel.
 */
withDefaults(
  defineProps<{
    /** When true, fills the tool palette tab (no overlay chrome). */
    embedded?: boolean
    /** Overlay mode only; ignored when embedded. */
    visible?: boolean
  }>(),
  {
    embedded: false,
    visible: true
  }
)

/** Emitted when the user closes the overlay panel (non-embedded mode). */
const emit = defineEmits<{
  close: []
}>()

const { labels } = useAgentI18n()

/** Saved provider configuration; the settings card edits a copy. */
const config = ref<LlmConfig>(createDefaultLlmConfig())
const activeSettings = computed(() => resolveActiveSettings(config.value))
const settingsReady = ref(false)
const showSettings = ref(false)
/** Whether the open settings card holds unsaved edits. */
const settingsDirty = ref(false)
const input = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const pendingImages = ref<File[]>([])
const pendingPreviewUrls = ref<string[]>([])
const agentMode = ref<AgentMode>('simple')
/** Last-step prompt tokens from the provider; drives the context ring. */
const contextUsage = ref<AgentContextUsage | null>(null)
/** Whether the context-usage detail popover is open. */
const showContextUsage = ref(false)
/** Whether the suggested-task prompt picker is open. */
const showTaskPrompts = ref(false)

watch(showSettings, open => {
  if (!open) settingsDirty.value = false
})

/** Recently copied tool row keys for brief “copied” feedback. */
const copiedToolKeys = ref(new Set<string>())
const copyFeedbackTimers = new Map<string, ReturnType<typeof setTimeout>>()

watch(
  pendingImages,
  files => {
    pendingPreviewUrls.value.forEach(url => URL.revokeObjectURL(url))
    pendingPreviewUrls.value = files.map(file => URL.createObjectURL(file))
  },
  { deep: true }
)

const { chat, resetChat } = useAgentChatRef(() => ({
  settings: { ...activeSettings.value },
  options: {
    ...createAgentChatOptions(agentMode.value),
    onContextUsage: usage => {
      contextUsage.value = usage
    }
  }
}))

const contextWindowTokens = computed(() =>
  resolveContextWindow(activeSettings.value.model)
)

const usedContextTokens = computed(() => contextUsage.value?.usedTokens ?? 0)

const contextUsagePct = computed(() =>
  contextUsagePercent(usedContextTokens.value, contextWindowTokens.value)
)

/** SVG ring geometry matching Cursor's compact context meter. */
const CONTEXT_RING_RADIUS = 6
const CONTEXT_RING_CIRCUMFERENCE = 2 * Math.PI * CONTEXT_RING_RADIUS

const contextRingDashOffset = computed(
  () => CONTEXT_RING_CIRCUMFERENCE * (1 - contextUsagePct.value / 100)
)

const contextUsageLevel = computed(() => {
  const pct = contextUsagePct.value
  if (pct >= 90) return 'danger'
  if (pct >= 70) return 'warning'
  return 'normal'
})

const contextUsageDetailText = computed(() =>
  labels.value.contextUsageDetail
    .replace('{percent}', String(Math.round(contextUsagePct.value)))
    .replace('{used}', formatTokenCount(usedContextTokens.value))
    .replace('{limit}', formatTokenCount(contextWindowTokens.value))
)

const contextUsageFullText = computed(() =>
  labels.value.contextUsageFull.replace(
    '{percent}',
    String(Math.round(contextUsagePct.value))
  )
)

const contextUsageTokensText = computed(() =>
  labels.value.contextUsageTokens
    .replace('{used}', formatTokenCount(usedContextTokens.value))
    .replace('{limit}', formatTokenCount(contextWindowTokens.value))
)

const contextUsageTitle = computed(() =>
  contextUsage.value
    ? contextUsageDetailText.value
    : labels.value.showContextUsage
)

const CONTEXT_USAGE_LABEL_KEYS: Record<
  AgentContextUsageCategoryId,
  AgentChatLabelKey
> = {
  system: 'contextUsageSystemPrompt',
  tools: 'contextUsageToolDefinitions',
  images: 'contextUsageImages',
  conversation: 'contextUsageConversation'
}

const contextUsageCategories = computed(() => {
  // Scale against the larger of window vs used so an over-capacity report
  // still fits the bar instead of overflowing past 100%.
  const barDenominator = Math.max(
    contextWindowTokens.value,
    usedContextTokens.value,
    1
  )
  return (contextUsage.value?.breakdown ?? []).map(row => ({
    ...row,
    label: labels.value[CONTEXT_USAGE_LABEL_KEYS[row.id]],
    widthPercent: Math.max(0, (row.tokens / barDenominator) * 100)
  }))
})

/** Toggles the context-usage detail popover. */
function toggleContextUsage() {
  showContextUsage.value = !showContextUsage.value
  if (showContextUsage.value) showTaskPrompts.value = false
}

/** Toggles the suggested-task prompt picker. */
function toggleTaskPrompts() {
  showTaskPrompts.value = !showTaskPrompts.value
  if (showTaskPrompts.value) {
    showContextUsage.value = false
    showSettings.value = false
  }
}

/** Toggles the settings card and closes the task picker when opening settings. */
function toggleSettings() {
  showSettings.value = !showSettings.value
  if (showSettings.value) showTaskPrompts.value = false
}

/**
 * Task groups for the picker, with localized category / title / prompt text.
 */
const taskPromptGroups = computed(() =>
  AGENT_TASK_CATEGORY_ORDER.map(category => ({
    category,
    label: labels.value[AGENT_TASK_CATEGORY_LABEL_KEYS[category]],
    tasks: AGENT_TASKS.filter(task => task.category === category).map(task => ({
      ...task,
      title: labels.value[task.titleKey],
      prompt: labels.value[task.promptKey]
    }))
  })).filter(group => group.tasks.length > 0)
)

/**
 * Puts a suggested task prompt into the composer so the user can edit and send.
 */
function applyTaskPrompt(task: AgentTaskDef) {
  const prompt = labels.value[task.promptKey]
  input.value = prompt
  showTaskPrompts.value = false
  showSettings.value = false
  // Next tick isn’t needed for focus; textarea exists whenever the composer does.
  requestAnimationFrame(() => {
    const el = inputRef.value
    if (!el) return
    el.focus()
    el.setSelectionRange(prompt.length, prompt.length)
  })
}

/** Closes floating popovers when clicking outside their anchors. */
function onDocumentPointerDown(event: PointerEvent) {
  const target = event.target
  if (!(target instanceof Element)) return
  if (
    showContextUsage.value &&
    !target.closest('.cad-agent-context-usage') &&
    !target.closest('.cad-agent-context-usage-popover')
  ) {
    showContextUsage.value = false
  }
  if (
    showTaskPrompts.value &&
    !target.closest('.cad-agent-task-prompts') &&
    !target.closest('.cad-agent-task-prompts-popover')
  ) {
    showTaskPrompts.value = false
  }
}

onMounted(async () => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  config.value = await loadLlmConfig()
  agentMode.value = loadAgentMode()
  // Do not resetChat() here: getConfig() is live, and replacing the Chat while
  // a first Enter send is in flight orphans that request (no UI response).
  settingsReady.value = true
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  pendingPreviewUrls.value.forEach(url => URL.revokeObjectURL(url))
  for (const timer of copyFeedbackTimers.values()) clearTimeout(timer)
  copyFeedbackTimers.clear()
})

const messages = computed(() => chat.value.messages)
const status = computed(() => chat.value.status)
const error = computed(() => chat.value.error)
const errorMessage = computed(() =>
  error.value ? formatChatError(error.value) : ''
)

/** Local send-prep error when chat.error is not set yet (e.g. image resize). */
const sendPrepError = ref('')

watch(error, value => {
  if (value) sendPrepError.value = ''
})

const displayErrorMessage = computed(() => {
  if (errorMessage.value) return errorMessage.value
  return sendPrepError.value
})

const hasDisplayError = computed(
  () => !!error.value || sendPrepError.value.length > 0
)

/** Separates provider id and model id in input-bar option values. */
const MODEL_VALUE_SEPARATOR = '|'

interface ModelOptionGroup {
  providerId: string
  label: string
  options: { value: string; label: string }[]
}

/**
 * Input-bar model choices: every model of every provider that has a key, plus
 * the active provider, grouped by provider. The active model is listed even
 * when its catalog no longer names it.
 */
const modelOptionGroups = computed<ModelOptionGroup[]>(() => {
  const { activeProviderId, activeModel } = config.value
  const ids = config.value.providers
    .filter(provider => provider.apiKey.trim())
    .map(provider => provider.id)
  if (!ids.includes(activeProviderId)) ids.unshift(activeProviderId)

  return ids.flatMap(id => {
    const provider = findProvider(config.value, id)
    if (!provider) return []
    const models = [...effectiveModels(provider)]
    if (
      id === activeProviderId &&
      activeModel &&
      !models.some(model => model.id === activeModel)
    ) {
      models.push({ id: activeModel, vision: false })
    }
    return [
      {
        providerId: id,
        label: providerDisplayName(id),
        options: models.map(model => ({
          value: `${id}${MODEL_VALUE_SEPARATOR}${model.id}`,
          label: modelLabel(model)
        }))
      }
    ]
  })
})

const activeModelValue = computed(
  () =>
    `${config.value.activeProviderId}${MODEL_VALUE_SEPARATOR}${config.value.activeModel}`
)

const supportsVision = computed(() => activeModelSupportsVision(config.value))

const highInferenceActive = computed(() => agentMode.value === 'high-inference')

const agentModeHint = computed(() =>
  highInferenceActive.value
    ? labels.value.agentModeHighInferenceHint
    : labels.value.agentModeSimpleHint
)

const highInferenceBlocked = computed(
  () => highInferenceActive.value && !supportsVision.value
)

watch(supportsVision, supported => {
  if (!supported) clearPendingImages()
})

const isBusy = computed(
  () => status.value === 'streaming' || status.value === 'submitted'
)

const modelSelectDisabled = computed(
  () => !settingsReady.value || isBusy.value || settingsDirty.value
)

const agentModeSelectDisabled = computed(() => modelSelectDisabled.value)

const modelSelectTitle = computed(() =>
  settingsDirty.value ? labels.value.unsavedSettings : labels.value.model
)

const canSend = computed(
  () =>
    settingsReady.value &&
    !settingsDirty.value &&
    !highInferenceBlocked.value &&
    activeSettings.value.apiKey.trim().length > 0 &&
    !isBusy.value &&
    (input.value.trim().length > 0 ||
      (supportsVision.value && pendingImages.value.length > 0))
)

const inputHint = computed(() => {
  if (!settingsReady.value) {
    return ''
  }
  if (settingsDirty.value) {
    return labels.value.unsavedSettings
  }
  if (highInferenceBlocked.value) {
    return labels.value.highInferenceRequiresVision
  }
  if (!activeSettings.value.apiKey.trim()) {
    return labels.value.missingApiKey
  }
  return ''
})

/** Returns the label of a provider for the input-bar model groups. */
function providerDisplayName(id: string): string {
  const provider = findProvider(config.value, id)
  return provider ? providerLabel(provider, labels.value) : id
}

/** Clears the current chat error state without removing messages. */
function dismissError() {
  sendPrepError.value = ''
  chat.value.clearError()
}

/** Persists the config saved by the settings card and resets the chat. */
async function applySettings(next: LlmConfig) {
  config.value = next
  showSettings.value = false
  showContextUsage.value = false
  contextUsage.value = null
  await saveLlmConfig(next)
  resetChat()
}

/** Switches the active provider/model from the input bar and persists it. */
async function onInputModelChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  const separator = value.indexOf(MODEL_VALUE_SEPARATOR)
  if (separator < 0 || value === activeModelValue.value) return
  config.value = {
    ...config.value,
    activeProviderId: value.slice(0, separator),
    activeModel: value.slice(separator + 1)
  }
  // Drop prior step usage so the ring doesn't mix old tokens with the new window.
  showContextUsage.value = false
  contextUsage.value = null
  await saveLlmConfig(config.value)
}

/** Persists agent mode when the input bar dropdown changes. */
function onAgentModeChange(event: Event) {
  const mode = (event.target as HTMLSelectElement).value as AgentMode
  if (mode !== 'simple' && mode !== 'high-inference') return
  agentMode.value = mode
  saveAgentMode(mode)
  // Mode changes the system prompt / tools; clear until the next step reports.
  showContextUsage.value = false
  contextUsage.value = null
}

/** Opens the hidden file input for image attachments. */
function openFilePicker() {
  fileInputRef.value?.click()
}

/** Appends image files to the pending attachment list when vision is available. */
function appendPendingImages(files: Iterable<File>) {
  if (!supportsVision.value || isBusy.value) return
  const images = [...files].filter(file => file.type.startsWith('image/'))
  if (!images.length) return
  pendingImages.value = [...pendingImages.value, ...images]
}

/** Appends selected image files to the pending attachment list. */
function onFilesSelected(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files?.length) return
  appendPendingImages(target.files)
  target.value = ''
}

/**
 * Accepts image paste from the clipboard (e.g. screenshot).
 * Text paste is left alone; image-only paste is prevented from inserting junk.
 */
function onPaste(event: ClipboardEvent) {
  if (!supportsVision.value || isBusy.value) return

  const clipboard = event.clipboardData
  if (!clipboard) return

  const images: File[] = []
  if (clipboard.items?.length) {
    for (const item of Array.from(clipboard.items)) {
      if (!item.type.startsWith('image/')) continue
      const blob = item.getAsFile()
      if (!blob) continue
      if (blob instanceof File && blob.name) {
        images.push(blob)
        continue
      }
      const ext = blob.type.split('/')[1]?.split('+')[0] || 'png'
      images.push(
        new File([blob], `paste-${Date.now()}-${images.length}.${ext}`, {
          type: blob.type || 'image/png'
        })
      )
    }
  } else if (clipboard.files?.length) {
    images.push(
      ...Array.from(clipboard.files).filter(file =>
        file.type.startsWith('image/')
      )
    )
  }

  if (!images.length) return

  appendPendingImages(images)
  const text = clipboard.getData('text/plain')?.trim() ?? ''
  if (!text) {
    event.preventDefault()
  }
}

/** Removes one pending image attachment by index. */
function removePendingImage(index: number) {
  pendingImages.value = pendingImages.value.filter((_, i) => i !== index)
}

/** Clears all pending image attachments before send. */
function clearPendingImages() {
  pendingImages.value = []
}

/** Sends the current text and optional images to the CAD agent. */
async function sendMessage() {
  // Align with the send button: Enter must not bypass settingsReady / canSend.
  if (!canSend.value) return

  const text = input.value.trim()
  const files = supportsVision.value ? [...pendingImages.value] : []
  sendPrepError.value = ''

  let fileParts: Awaited<ReturnType<typeof prepareImageAttachments>> = []
  if (files.length > 0) {
    try {
      fileParts = await prepareImageAttachments(files)
    } catch (prepError) {
      sendPrepError.value =
        prepError instanceof Error && prepError.message.trim()
          ? prepError.message
          : labels.value.prepareImageFailed
      return
    }
  }

  const requestText =
    text || (fileParts.length > 0 ? labels.value.imageOnlyRequest : '')
  if (!requestText && fileParts.length === 0) return

  // Clear only after attachments are ready so a prep failure keeps the draft.
  input.value = ''
  clearPendingImages()

  try {
    await chat.value.sendMessage({
      text: requestText,
      ...(fileParts.length > 0 ? { files: fileParts } : {})
    })
  } catch (sendError) {
    // makeRequest errors land on chat.error; restore the draft for the rest.
    if (!chat.value.error) {
      sendPrepError.value =
        sendError instanceof Error
          ? formatChatError(sendError)
          : labels.value.prepareImageFailed
    }
    input.value = text
    if (files.length) pendingImages.value = files
  }
}

/** Stops the in-flight agent response while keeping partial output. */
async function stopAgent() {
  if (!isBusy.value) return

  try {
    await chat.value.stop()
  } catch {
    // ignore stop errors
  }
}

/** Discards the conversation and starts a fresh agent session. */
function clearChat() {
  input.value = ''
  clearPendingImages()
  dismissError()
  showSettings.value = false
  showTaskPrompts.value = false
  showContextUsage.value = false
  contextUsage.value = null
  toolGroupOverrides.value = new Map()
  resetChat()
}

/** Concatenates all text parts of a UI message for display. */
function partText(message: UIMessage): string {
  if (!message.parts?.length) return ''
  return message.parts
    .filter(part => part?.type === 'text')
    .map(part => (part.type === 'text' ? part.text : ''))
    .join('')
}

/** Extracts image file parts from a UI message for inline preview. */
function imageParts(message: UIMessage): FilePart[] {
  if (!message.parts?.length) return []
  return message.parts.filter(
    (part): part is FilePart =>
      part?.type === 'file' && !!part.mediaType?.startsWith('image/')
  )
}

interface ToolCallSummary {
  name: string
  detail?: string
  input?: unknown
  output?: unknown
  state?: string
}

/** Returns tool names and, for scripts, a short result preview. */
function toolParts(message: UIMessage): ToolCallSummary[] {
  if (!message.parts?.length) return []
  return message.parts.flatMap(part => {
    if (typeof part?.type !== 'string' || !part.type.startsWith('tool-')) {
      return []
    }
    const name = part.type.replace(/^tool-/, '')
    const toolPart = part as {
      input?: unknown
      output?: unknown
      state?: string
    }
    const input = toolPart.input
    const output = toolPart.output
    const state = toolPart.state
    return [
      {
        name,
        input,
        output,
        state,
        detail:
          name === 'execute_cad_script' ? scriptToolDetail(output) : undefined
      }
    ]
  })
}

function scriptToolDetail(output: unknown): string | undefined {
  if (!output || typeof output !== 'object') return undefined
  const record = output as {
    message?: unknown
    error?: unknown
    data?: unknown
  }
  const bits: string[] = []
  if (typeof record.message === 'string' && record.message)
    bits.push(record.message)
  if (typeof record.error === 'string' && record.error) bits.push(record.error)
  if (record.data !== undefined) {
    try {
      let preview = JSON.stringify(record.data)
      if (preview.length > 240) preview = `${preview.slice(0, 240)}…`
      bits.push(preview)
    } catch {
      // Non-serializable tool output is omitted from the panel preview.
    }
  }
  return bits.length ? bits.join(' — ') : undefined
}

/** Stable JSON for clipboard debugging; strips bulky image payloads. */
function serializeToolValue(value: unknown): string {
  if (value === undefined) return '(none)'
  try {
    return JSON.stringify(sanitizeToolValue(value), null, 2)
  } catch {
    return String(value)
  }
}

/** Removes data-URL images so copied tool dumps stay readable. */
function sanitizeToolValue(value: unknown): unknown {
  if (!value || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(sanitizeToolValue)

  const record = value as Record<string, unknown>
  const next: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(record)) {
    if (key === 'images' && Array.isArray(entry)) {
      next.images = entry.map(image => {
        if (!image || typeof image !== 'object') return image
        const img = image as Record<string, unknown>
        if (typeof img.dataUrl === 'string') {
          return {
            ...img,
            dataUrl: `[omitted data URL, length=${img.dataUrl.length}]`
          }
        }
        return image
      })
      continue
    }
    next[key] = sanitizeToolValue(entry)
  }
  return next
}

/** Builds a debug dump of a tool call for clipboard copy. */
function formatToolCallCopyText(toolCall: ToolCallSummary): string {
  const lines = [
    `${labels.value.toolPrefix}: ${toolCall.name}`,
    toolCall.state ? `state: ${toolCall.state}` : undefined,
    '',
    'input:',
    serializeToolValue(toolCall.input),
    '',
    'output:',
    serializeToolValue(toolCall.output)
  ]
  return lines.filter(line => line !== undefined).join('\n')
}

/** Copies tool tip / input / output to the clipboard for debugging. */
async function copyToolCall(
  messageId: string,
  toolIndex: number,
  toolCall: ToolCallSummary
) {
  const text = formatToolCallCopyText(toolCall)
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
  } catch {
    return
  }

  const key = `${messageId}-${toolIndex}`
  const next = new Set(copiedToolKeys.value)
  next.add(key)
  copiedToolKeys.value = next

  const previous = copyFeedbackTimers.get(key)
  if (previous) clearTimeout(previous)
  copyFeedbackTimers.set(
    key,
    setTimeout(() => {
      const cleared = new Set(copiedToolKeys.value)
      cleared.delete(key)
      copiedToolKeys.value = cleared
      copyFeedbackTimers.delete(key)
    }, 1500)
  )
}

/** Whether the copy button for a tool row should show the “copied” state. */
function isToolCopied(messageId: string, toolIndex: number): boolean {
  return copiedToolKeys.value.has(`${messageId}-${toolIndex}`)
}

/**
 * Tool groups the user opened or closed by hand, keyed by message id. Groups
 * without an entry follow {@link isMessageInFlight}: open while the response
 * streams so progress stays visible, collapsed once the turn completes.
 */
const toolGroupOverrides = ref(new Map<string, boolean>())

/** True for the assistant message the agent is still producing. */
function isMessageInFlight(message: UIMessage): boolean {
  const list = messages.value
  return (
    isBusy.value &&
    message.role === 'assistant' &&
    list[list.length - 1]?.id === message.id
  )
}

/** Whether a message's tool-call list is expanded. */
function isToolGroupOpen(message: UIMessage): boolean {
  return toolGroupOverrides.value.get(message.id) ?? isMessageInFlight(message)
}

/** Expands or collapses a message's tool-call list. */
function toggleToolGroup(message: UIMessage) {
  const next = new Map(toolGroupOverrides.value)
  next.set(message.id, !isToolGroupOpen(message))
  toolGroupOverrides.value = next
}

/** One-line header of a tool group, e.g. "Tool calls: 3 · 1 failed". */
function toolGroupSummary(message: UIMessage): string {
  const tools = toolParts(message)
  const count = String(tools.length)
  const summary = (
    isMessageInFlight(message)
      ? labels.value.toolsRunning
      : labels.value.toolsSummary
  ).replace('{count}', count)
  const failed = tools.filter(tool => tool.state === 'output-error').length
  return failed
    ? `${summary} · ${labels.value.toolsFailed.replace('{count}', String(failed))}`
    : summary
}

/** True when the message contains a high-inference verification review block. */
function isVerificationMessage(message: UIMessage): boolean {
  return (
    message.role === 'assistant' &&
    imageParts(message).length > 0 &&
    partText(message).includes(`--- ${agentT('verificationTitle')}`)
  )
}
</script>

<template>
  <div
    class="cad-agent-panel-root"
    :class="{
      'cad-agent-panel-root--embedded': embedded,
      'is-hidden': !embedded && !visible
    }"
  >
    <div v-if="!embedded" class="cad-agent-panel-header">
      <span class="cad-agent-panel-title">{{ labels.title }}</span>
      <div class="cad-agent-panel-actions">
        <div class="cad-agent-task-prompts">
          <button
            type="button"
            class="cad-agent-icon-btn"
            :class="{ 'is-active': showTaskPrompts }"
            :title="labels.taskPrompts"
            :aria-label="labels.taskPrompts"
            :aria-expanded="showTaskPrompts"
            @click="toggleTaskPrompts"
          >
            <!-- Suggested-tasks icon: stacked prompt cards + spark -->
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M8 3h9c1.1 0 2 .9 2 2v9h-1.75V5.25H8V3zm-3.25 4H14c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H4.75c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2zm1.1 3.15v1.35h7.3V10.15h-7.3zm0 3.1v1.35h5.6v-1.35h-5.6zm0 3.1v1.35h7.3v-1.35h-7.3zM19.2 1.2l.55 1.45 1.45.55-1.45.55-.55 1.45-.55-1.45-1.45-.55 1.45-.55.55-1.45z"
              />
            </svg>
          </button>
        </div>
        <button
          type="button"
          class="cad-agent-icon-btn"
          :class="{ 'is-active': showSettings }"
          :title="labels.settings"
          :aria-label="labels.settings"
          @click="toggleSettings"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
            />
          </svg>
        </button>
        <button
          type="button"
          class="cad-agent-icon-btn"
          :title="labels.clear"
          :aria-label="labels.clear"
          @click="clearChat"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
        </button>
        <button
          type="button"
          class="cad-agent-panel-btn"
          @click="emit('close')"
        >
          {{ labels.close }}
        </button>
      </div>
      <div
        v-if="showTaskPrompts"
        class="cad-agent-task-prompts-popover"
        role="dialog"
        :aria-label="labels.taskPromptsTitle"
      >
        <div class="cad-agent-task-prompts-popover-header">
          {{ labels.taskPromptsTitle }}
        </div>
        <div
          v-for="group in taskPromptGroups"
          :key="group.category"
          class="cad-agent-task-prompts-group"
        >
          <div class="cad-agent-task-prompts-group-label">
            {{ group.label }}
          </div>
          <button
            v-for="task in group.tasks"
            :key="task.id"
            type="button"
            class="cad-agent-task-prompts-item"
            @click="applyTaskPrompt(task)"
          >
            <span class="cad-agent-task-prompts-item-title">
              {{ task.title }}
            </span>
          </button>
        </div>
      </div>
    </div>
    <div v-else class="cad-agent-panel-toolbar">
      <div class="cad-agent-task-prompts">
        <button
          type="button"
          class="cad-agent-icon-btn"
          :class="{ 'is-active': showTaskPrompts }"
          :title="labels.taskPrompts"
          :aria-label="labels.taskPrompts"
          :aria-expanded="showTaskPrompts"
          @click="toggleTaskPrompts"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M8 3h9c1.1 0 2 .9 2 2v9h-1.75V5.25H8V3zm-3.25 4H14c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H4.75c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2zm1.1 3.15v1.35h7.3V10.15h-7.3zm0 3.1v1.35h5.6v-1.35h-5.6zm0 3.1v1.35h7.3v-1.35h-7.3zM19.2 1.2l.55 1.45 1.45.55-1.45.55-.55 1.45-.55-1.45-1.45-.55 1.45-.55.55-1.45z"
            />
          </svg>
        </button>
      </div>
      <button
        type="button"
        class="cad-agent-icon-btn"
        :class="{ 'is-active': showSettings }"
        :title="labels.settings"
        :aria-label="labels.settings"
        @click="toggleSettings"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
          />
        </svg>
      </button>
      <button
        type="button"
        class="cad-agent-icon-btn"
        :title="labels.clear"
        :aria-label="labels.clear"
        @click="clearChat"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
      </button>
      <div
        v-if="showTaskPrompts"
        class="cad-agent-task-prompts-popover"
        role="dialog"
        :aria-label="labels.taskPromptsTitle"
      >
        <div class="cad-agent-task-prompts-popover-header">
          {{ labels.taskPromptsTitle }}
        </div>
        <div
          v-for="group in taskPromptGroups"
          :key="group.category"
          class="cad-agent-task-prompts-group"
        >
          <div class="cad-agent-task-prompts-group-label">
            {{ group.label }}
          </div>
          <button
            v-for="task in group.tasks"
            :key="task.id"
            type="button"
            class="cad-agent-task-prompts-item"
            @click="applyTaskPrompt(task)"
          >
            <span class="cad-agent-task-prompts-item-title">
              {{ task.title }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <AgentModelSettings
      v-if="showSettings && settingsReady"
      :config="config"
      @save="applySettings"
      @cancel="showSettings = false"
      @dirty-change="settingsDirty = $event"
    />

    <div v-show="!showSettings" class="cad-agent-panel-messages">
      <div
        v-if="messages.length === 0 && !hasDisplayError"
        class="cad-agent-panel-empty"
      >
        {{ labels.emptyHint }}
      </div>
      <div
        v-for="message in messages"
        :key="message.id"
        class="cad-agent-msg"
        :class="[
          message.role,
          { 'cad-agent-msg--verification': isVerificationMessage(message) }
        ]"
      >
        <div class="cad-agent-msg-text">{{ partText(message) }}</div>
        <div
          v-if="imageParts(message).length"
          class="cad-agent-msg-images"
          :class="{
            'cad-agent-msg-images--verification': isVerificationMessage(message)
          }"
        >
          <figure
            v-for="(part, index) in imageParts(message)"
            :key="`${message.id}-img-${index}`"
            class="cad-agent-msg-image-wrap"
          >
            <img
              class="cad-agent-msg-image"
              :src="part.url"
              :alt="part.filename ?? labels.imageAlt"
            />
          </figure>
        </div>
        <div
          v-if="toolParts(message).length"
          class="cad-agent-tool-group"
          :class="{ 'is-open': isToolGroupOpen(message) }"
        >
          <button
            type="button"
            class="cad-agent-tool-summary"
            :aria-expanded="isToolGroupOpen(message)"
            @click="toggleToolGroup(message)"
          >
            <svg
              class="cad-agent-tool-chevron"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"
              />
            </svg>
            <span class="cad-agent-tool-summary-text">
              {{ toolGroupSummary(message) }}
            </span>
          </button>
          <template v-if="isToolGroupOpen(message)">
            <div
              v-for="(toolCall, toolIndex) in toolParts(message)"
              :key="`${message.id}-tool-${toolIndex}`"
              class="cad-agent-tool"
            >
              <div class="cad-agent-tool-body">
                {{ `${labels.toolPrefix}: ${toolCall.name}` }}
                <span
                  v-if="toolCall.state && toolCall.state !== 'output-available'"
                  class="cad-agent-tool-detail"
                >
                  {{ toolCall.state }}
                </span>
                <span v-if="toolCall.detail" class="cad-agent-tool-detail">
                  {{ toolCall.detail }}
                </span>
              </div>
              <button
                type="button"
                class="cad-agent-tool-copy"
                :class="{ 'is-copied': isToolCopied(message.id, toolIndex) }"
                :title="
                  isToolCopied(message.id, toolIndex)
                    ? labels.toolCopied
                    : labels.copyTool
                "
                :aria-label="
                  isToolCopied(message.id, toolIndex)
                    ? labels.toolCopied
                    : labels.copyTool
                "
                @click="copyToolCall(message.id, toolIndex, toolCall)"
              >
                <svg
                  v-if="isToolCopied(message.id, toolIndex)"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="currentColor"
                    d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                  />
                </svg>
                <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
                  />
                </svg>
              </button>
            </div>
          </template>
        </div>
      </div>
      <div v-if="hasDisplayError" class="cad-agent-msg error">
        <div class="cad-agent-error-card">
          <svg
            class="cad-agent-error-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
            />
          </svg>
          <div class="cad-agent-error-body">
            <div class="cad-agent-error-title">{{ labels.errorTitle }}</div>
            <div class="cad-agent-error-message">{{ displayErrorMessage }}</div>
          </div>
          <button
            type="button"
            class="cad-agent-error-dismiss"
            :title="labels.dismissError"
            :aria-label="labels.dismissError"
            @click="dismissError"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div class="cad-agent-panel-input">
      <div
        v-if="showContextUsage"
        class="cad-agent-context-usage-popover"
        role="dialog"
        :aria-label="labels.contextUsage"
      >
        <div class="cad-agent-context-usage-popover-header">
          {{ labels.contextUsage }}
        </div>
        <div class="cad-agent-context-usage-popover-summary">
          <span class="cad-agent-context-usage-popover-full">
            {{ contextUsageFullText }}
          </span>
          <span class="cad-agent-context-usage-popover-tokens">
            {{ contextUsageTokensText }}
          </span>
        </div>
        <div class="cad-agent-context-usage-popover-bar">
          <div
            v-for="category in contextUsageCategories"
            :key="category.id"
            class="cad-agent-context-usage-popover-segment"
            :style="{
              width: `${category.widthPercent}%`,
              background: category.color
            }"
            :title="`${category.label}: ${formatTokenCount(category.tokens)}`"
          />
        </div>
        <ul
          v-if="contextUsageCategories.length"
          class="cad-agent-context-usage-popover-list"
        >
          <li
            v-for="category in contextUsageCategories"
            :key="category.id"
            class="cad-agent-context-usage-popover-row"
          >
            <span
              class="cad-agent-context-usage-popover-swatch"
              :style="{ background: category.color }"
              aria-hidden="true"
            />
            <span class="cad-agent-context-usage-popover-label">
              {{ category.label }}
            </span>
            <span class="cad-agent-context-usage-popover-count">
              {{ formatTokenCount(category.tokens) }}
            </span>
          </li>
        </ul>
      </div>
      <div v-if="pendingImages.length" class="cad-agent-attachments">
        <div
          v-for="(file, index) in pendingImages"
          :key="`${file.name}-${file.lastModified}-${index}`"
          class="cad-agent-attachment"
        >
          <img :src="pendingPreviewUrls[index]" :alt="file.name" />
          <button
            type="button"
            class="cad-agent-attachment-remove"
            :title="labels.removeAttachment"
            :aria-label="labels.removeAttachment"
            @click="removePendingImage(index)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </button>
        </div>
      </div>
      <textarea
        ref="inputRef"
        v-model="input"
        :placeholder="labels.inputPlaceholder"
        :disabled="!settingsReady"
        @keydown.enter.exact.prevent="sendMessage"
        @paste="onPaste"
      />
      <input
        ref="fileInputRef"
        class="cad-agent-file-input"
        type="file"
        accept="image/*"
        multiple
        @change="onFilesSelected"
      />
      <p v-if="inputHint" class="cad-agent-input-hint">{{ inputHint }}</p>
      <p v-else-if="agentModeHint" class="cad-agent-mode-hint">
        {{ agentModeHint }}
      </p>
      <div class="cad-agent-panel-input-row">
        <div class="cad-agent-panel-input-left">
          <select
            class="cad-agent-mode-select"
            :value="agentMode"
            :disabled="agentModeSelectDisabled"
            :title="labels.agentMode"
            @change="onAgentModeChange"
          >
            <option value="simple">{{ labels.agentModeSimple }}</option>
            <option value="high-inference">
              {{ labels.agentModeHighInference }}
            </option>
          </select>
          <select
            class="cad-agent-model-select"
            :value="activeModelValue"
            :disabled="modelSelectDisabled"
            :title="modelSelectTitle"
            @change="onInputModelChange"
          >
            <optgroup
              v-for="group in modelOptionGroups"
              :key="group.providerId"
              :label="group.label"
            >
              <option
                v-for="option in group.options"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </optgroup>
          </select>
          <div class="cad-agent-context-usage">
            <button
              type="button"
              class="cad-agent-context-usage-btn"
              :class="`cad-agent-context-usage-btn--${contextUsageLevel}`"
              :title="contextUsageTitle"
              :aria-label="labels.showContextUsage"
              :aria-expanded="showContextUsage"
              @click="toggleContextUsage"
            >
              <svg
                class="cad-agent-context-usage-ring"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <circle
                  class="cad-agent-context-usage-track"
                  cx="8"
                  cy="8"
                  :r="CONTEXT_RING_RADIUS"
                  fill="none"
                  stroke-width="2"
                />
                <circle
                  class="cad-agent-context-usage-progress"
                  cx="8"
                  cy="8"
                  :r="CONTEXT_RING_RADIUS"
                  fill="none"
                  stroke-width="2"
                  stroke-linecap="round"
                  :stroke-dasharray="CONTEXT_RING_CIRCUMFERENCE"
                  :stroke-dashoffset="contextRingDashOffset"
                  transform="rotate(-90 8 8)"
                />
              </svg>
            </button>
          </div>
        </div>
        <div class="cad-agent-panel-input-right">
          <button
            type="button"
            class="cad-agent-icon-btn cad-agent-attach-btn"
            :disabled="isBusy || !supportsVision"
            :title="labels.attachImage"
            @click="openFilePicker"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.66 1.34-3 3-3s3 1.34 3 3v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6h-1.5v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.49-2.01-4.5-4.5-4.5S8 2.51 8 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6H16.5z"
              />
            </svg>
          </button>
          <button
            type="button"
            class="cad-agent-send-btn"
            :class="{ 'cad-agent-send-btn--stop': isBusy }"
            :disabled="!isBusy && !canSend"
            :title="isBusy ? labels.stop : labels.send"
            :aria-label="isBusy ? labels.stop : labels.send"
            @click="isBusy ? stopAgent() : sendMessage()"
          >
            <svg v-if="isBusy" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M7 7h10v10H7z" />
            </svg>
            <svg v-else viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M12 4l-7 7h4v9h6v-9h4z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
