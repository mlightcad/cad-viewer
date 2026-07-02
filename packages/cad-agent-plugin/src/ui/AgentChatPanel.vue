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
  saveLlmSettings} from '../storage/LlmSettingsStore'
import {
  CUSTOM_MODEL_VALUE,
  type LlmModelOption,
  modelOptionsForProvider,
  modelSupportsVision,
  resolveModelSelection} from '../storage/modelCatalog'
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
const agentMode = ref<AgentMode>('high-inference')

watch(
  () => settings.value.provider,
  (provider: LlmProviderId) => {
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
  settingsReady.value = true
  resetChat()
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
  modelSupportsVision(
    activeSettings.value.provider,
    activeSettings.value.model
  )
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

const agentModeSelectDisabled = computed(
  () => modelSelectDisabled.value
)

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

/** Appends selected image files to the pending attachment list. */
function onFilesSelected(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files?.length) return
  pendingImages.value = [
    ...pendingImages.value,
    ...Array.from(target.files).filter(file => file.type.startsWith('image/'))
  ]
  target.value = ''
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
  const text = input.value.trim()
  const files = supportsVision.value ? pendingImages.value : []
  if ((!text && files.length === 0) || isBusy.value) return

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

/** Returns tool names invoked in an assistant message (without the `tool-` prefix). */
function toolParts(message: UIMessage): string[] {
  if (!message.parts?.length) return []
  return message.parts
    .filter(
      (part): part is { type: string } =>
        typeof part?.type === 'string' && part.type.startsWith('tool-')
    )
    .map(part => part.type.replace(/^tool-/, ''))
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
              d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
            />
          </svg>
        </button>
        <button type="button" class="cad-agent-panel-btn" @click="emit('close')">
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
            d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
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
      <p v-if="settings.provider === 'deepseek-vl'" class="cad-agent-model-hint">
        {{ labels.providerDeepseekVlHint }}
      </p>
      <label>
        {{ labels.model }}
        <select v-model="modelSelection">
          <optgroup v-if="visionModelOptions.length" :label="labels.visionModels">
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
        {{
          supportsVision ? labels.modelSupportsVision : labels.modelTextOnly
        }}
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
        <div v-for="toolName in toolParts(message)" :key="toolName" class="cad-agent-tool">
          {{ labels.toolPrefix }}: {{ toolName }}
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
          <img
            :src="pendingPreviewUrls[index]"
            :alt="file.name"
          />
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
        @keydown.enter.exact.prevent="sendMessage"
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
      <p v-else-if="agentModeHint" class="cad-agent-mode-hint">{{ agentModeHint }}</p>
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
            <option
              v-if="isActiveCustomModel"
              :value="activeSettings.model"
            >
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
            <svg
              v-if="isBusy"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
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
