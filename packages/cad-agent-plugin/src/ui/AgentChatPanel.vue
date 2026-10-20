<script setup lang="ts">
import '../ui/agent-panel.css'

import { AcApI18n } from '@mlightcad/cad-simple-viewer'
import type { UIMessage } from 'ai'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import { agentT } from '../i18n'
import { useAgentI18n } from '../i18n/useAgentI18n'
import {
  type AgentMode,
  loadAgentMode,
  saveAgentMode
} from '../storage/AgentModeStore'
import {
  getProviderDefaults,
  type LlmProviderId,
  type LlmSettings,
  loadLlmSettings,
  saveLlmSettings
} from '../storage/LlmSettingsStore'
import {
  CUSTOM_MODEL_VALUE,
  type LlmModelOption,
  modelOptionsForProvider,
  modelSupportsVision,
  resolveModelSelection
} from '../storage/modelCatalog'
import { areLlmSettingsEqual } from '../storage/settingsEquality'
import { formatChatError } from './formatChatError'
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

const settings = ref<LlmSettings>({
  provider: 'openai-compatible',
  apiKey: '',
  baseUrl: '',
  model: ''
})
const activeSettings = ref<LlmSettings>({
  provider: 'openai-compatible',
  apiKey: '',
  baseUrl: '',
  model: ''
})
const settingsReady = ref(false)
const showSettings = ref(false)
const input = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)
const pendingImages = ref<File[]>([])
const pendingPreviewUrls = ref<string[]>([])
const modelSelection = ref(
  resolveModelSelection(settings.value.provider, settings.value.model)
)
const agentMode = ref<AgentMode>('simple')

watch(
  () => settings.value.provider,
  (provider: LlmProviderId, previous: LlmProviderId | undefined) => {
    // Skip hydration / same-value updates so a saved custom baseUrl is not
    // overwritten by provider defaults after loadLlmSettings().
    if (!settingsReady.value || previous === undefined || previous === provider) {
      return
    }
    const defaults = getProviderDefaults(provider)
    settings.value.baseUrl = defaults.baseUrl
    settings.value.model = defaults.model
    modelSelection.value = resolveModelSelection(provider, defaults.model)
  }
)

watch(modelSelection, selection => {
  if (selection !== CUSTOM_MODEL_VALUE) {
    settings.value.model = selection
  }
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

onUnmounted(() => {
  pendingPreviewUrls.value.forEach(url => URL.revokeObjectURL(url))
  for (const timer of copyFeedbackTimers.values()) clearTimeout(timer)
  copyFeedbackTimers.clear()
})

const { chat, resetChat } = useAgentChatRef(() => ({
  settings: { ...activeSettings.value },
  options: createAgentChatOptions(agentMode.value)
}))

onMounted(async () => {
  const loaded = await loadLlmSettings()
  settings.value = { ...loaded }
  activeSettings.value = { ...loaded }
  agentMode.value = loadAgentMode()
  modelSelection.value = resolveModelSelection(loaded.provider, loaded.model)
  // Do not resetChat() here: getConfig() is live, and replacing the Chat while
  // a first Enter send is in flight orphans that request (no UI response).
  settingsReady.value = true
})

const settingsDirty = computed(
  () => !areLlmSettingsEqual(settings.value, activeSettings.value)
)

const messages = computed(() => chat.value.messages)
const status = computed(() => chat.value.status)
const error = computed(() => chat.value.error)
const errorMessage = computed(() =>
  error.value ? formatChatError(error.value) : ''
)

const visionModelOptions = computed(() =>
  modelOptionsForProvider(settings.value.provider, true)
)
const textModelOptions = computed(() =>
  modelOptionsForProvider(settings.value.provider, false)
)
const activeVisionModelOptions = computed(() =>
  modelOptionsForProvider(activeSettings.value.provider, true)
)
const activeTextModelOptions = computed(() =>
  modelOptionsForProvider(activeSettings.value.provider, false)
)
const isActiveCustomModel = computed(
  () =>
    resolveModelSelection(
      activeSettings.value.provider,
      activeSettings.value.model
    ) === CUSTOM_MODEL_VALUE
)
const supportsVision = computed(() =>
  modelSupportsVision(activeSettings.value.provider, activeSettings.value.model)
)

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

/** Returns the localized display label for a model dropdown option. */
function modelLabel(option: LlmModelOption): string {
  return AcApI18n.currentLocale === 'zh' ? option.labelZh : option.labelEn
}

/** Clears the current chat error state without removing messages. */
function dismissError() {
  chat.value.clearError()
}

/** Persists LLM settings, hides the form, and resets the chat session. */
async function applySettings() {
  await saveLlmSettings(settings.value)
  activeSettings.value = { ...settings.value }
  showSettings.value = false
  resetChat()
}

/** Switches the active model from the input bar and persists the change. */
async function applyActiveModel(model: string) {
  if (!model || model === activeSettings.value.model) return

  settings.value = { ...settings.value, model }
  modelSelection.value = resolveModelSelection(settings.value.provider, model)
  activeSettings.value = { ...activeSettings.value, model }
  await saveLlmSettings(activeSettings.value)
}

/** Handles model selection changes in the input bar dropdown. */
async function onInputModelChange(event: Event) {
  const model = (event.target as HTMLSelectElement).value
  await applyActiveModel(model)
}

/** Persists agent mode when the input bar dropdown changes. */
function onAgentModeChange(event: Event) {
  const mode = (event.target as HTMLSelectElement).value as AgentMode
  if (mode !== 'simple' && mode !== 'high-inference') return
  agentMode.value = mode
  saveAgentMode(mode)
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

/** Builds a {@link FileList} so the AI SDK can convert attachments to file UI parts. */
function toFileList(files: File[]): FileList {
  const dataTransfer = new DataTransfer()
  for (const file of files) {
    dataTransfer.items.add(file)
  }
  return dataTransfer.files
}

/** Sends the current text and optional images to the CAD agent. */
async function sendMessage() {
  // Align with the send button: Enter must not bypass settingsReady / canSend.
  if (!canSend.value) return

  const text = input.value.trim()
  const files = supportsVision.value ? pendingImages.value : []

  input.value = ''
  clearPendingImages()

  try {
    await chat.value.sendMessage({
      ...(text ? { text } : {}),
      ...(files.length > 0 ? { files: toFileList(files) } : {})
    })
  } catch {
    // error surfaced via chat.error
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
  if (typeof record.message === 'string' && record.message) bits.push(record.message)
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
        <button
          type="button"
          class="cad-agent-icon-btn"
          :class="{ 'is-active': showSettings }"
          :title="labels.settings"
          :aria-label="labels.settings"
          @click="showSettings = !showSettings"
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
            <path
              fill="currentColor"
              d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
            />
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
    </div>
    <div v-else class="cad-agent-panel-toolbar">
      <button
        type="button"
        class="cad-agent-icon-btn"
        :class="{ 'is-active': showSettings }"
        :title="labels.settings"
        :aria-label="labels.settings"
        @click="showSettings = !showSettings"
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
          <path
            fill="currentColor"
            d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"
          />
        </svg>
      </button>
    </div>

    <div v-if="showSettings" class="cad-agent-settings">
      <label>
        {{ labels.provider }}
        <select v-model="settings.provider">
          <option value="deepseek">{{ labels.providerDeepseek }}</option>
          <option value="deepseek-vl">{{ labels.providerDeepseekVl }}</option>
          <option value="openai">{{ labels.providerOpenai }}</option>
          <option value="anthropic">{{ labels.providerAnthropic }}</option>
          <option value="openai-compatible">
            {{ labels.providerOpenaiCompatible }}
          </option>
        </select>
      </label>
      <label>
        {{ labels.baseUrl }}
        <input v-model="settings.baseUrl" type="text" />
      </label>
      <p class="cad-agent-model-hint">{{ labels.baseUrlHint }}</p>
      <p
        v-if="settings.provider === 'deepseek-vl'"
        class="cad-agent-model-hint"
      >
        {{ labels.providerDeepseekVlHint }}
      </p>
      <label>
        {{ labels.model }}
        <select v-model="modelSelection">
          <optgroup
            v-if="visionModelOptions.length"
            :label="labels.visionModels"
          >
            <option
              v-for="option in visionModelOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ modelLabel(option) }}
            </option>
          </optgroup>
          <optgroup v-if="textModelOptions.length" :label="labels.textModels">
            <option
              v-for="option in textModelOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ modelLabel(option) }}
            </option>
          </optgroup>
          <option :value="CUSTOM_MODEL_VALUE">{{ labels.customModel }}</option>
        </select>
      </label>
      <label v-if="modelSelection === CUSTOM_MODEL_VALUE">
        {{ labels.customModelName }}
        <input v-model="settings.model" type="text" />
      </label>
      <p class="cad-agent-model-hint">
        {{ supportsVision ? labels.modelSupportsVision : labels.modelTextOnly }}
      </p>
      <label>
        {{ labels.apiKey }}
        <input v-model="settings.apiKey" type="password" autocomplete="off" />
      </label>
      <button type="button" class="cad-agent-panel-btn" @click="applySettings">
        {{ labels.saveSettings }}
      </button>
    </div>

    <div class="cad-agent-panel-messages">
      <div v-if="messages.length === 0 && !error" class="cad-agent-panel-empty">
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
      </div>
      <div v-if="error" class="cad-agent-msg error">
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
            <div class="cad-agent-error-message">{{ errorMessage }}</div>
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
            :value="activeSettings.model"
            :disabled="modelSelectDisabled"
            :title="modelSelectTitle"
            @change="onInputModelChange"
          >
            <optgroup
              v-if="activeVisionModelOptions.length"
              :label="labels.visionModels"
            >
              <option
                v-for="option in activeVisionModelOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ modelLabel(option) }}
              </option>
            </optgroup>
            <optgroup
              v-if="activeTextModelOptions.length"
              :label="labels.textModels"
            >
              <option
                v-for="option in activeTextModelOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ modelLabel(option) }}
              </option>
            </optgroup>
            <option v-if="isActiveCustomModel" :value="activeSettings.model">
              {{ activeSettings.model }}
            </option>
          </select>
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
