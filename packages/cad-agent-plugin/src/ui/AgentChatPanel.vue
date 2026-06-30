<script setup lang="ts">
import '../ui/agent-panel.css'

import { AcApI18n } from '@mlightcad/cad-simple-viewer'
import type { UIMessage } from 'ai'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import { useAgentI18n } from '../i18n/useAgentI18n'
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
import { useAgentChatRef } from './useAgentChat'

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

const { chat, resetChat } = useAgentChatRef(() => ({ ...activeSettings.value }))

onMounted(async () => {
  const loaded = await loadLlmSettings()
  settings.value = { ...loaded }
  activeSettings.value = { ...loaded }
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
const supportsVision = computed(() =>
  modelSupportsVision(
    activeSettings.value.provider,
    activeSettings.value.model
  )
)

watch(supportsVision, supported => {
  if (!supported) clearPendingImages()
})

const isBusy = computed(
  () => status.value === 'streaming' || status.value === 'submitted'
)

const canSend = computed(
  () =>
    settingsReady.value &&
    !settingsDirty.value &&
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
      ...(files.length > 0 ? { files } : {})
    })
  } catch {
    // error surfaced via chat.error
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
          class="cad-agent-panel-btn"
          @click="showSettings = !showSettings"
        >
          {{ labels.settings }}
        </button>
        <button type="button" class="cad-agent-panel-btn" @click="clearChat">
          {{ labels.clear }}
        </button>
        <button type="button" class="cad-agent-panel-btn" @click="emit('close')">
          {{ labels.close }}
        </button>
      </div>
    </div>
    <div v-else class="cad-agent-panel-toolbar">
      <button
        type="button"
        class="cad-agent-panel-btn"
        @click="showSettings = !showSettings"
      >
        {{ labels.settings }}
      </button>
      <button type="button" class="cad-agent-panel-btn" @click="clearChat">
        {{ labels.clear }}
      </button>
    </div>

    <div v-if="showSettings" class="cad-agent-settings">
      <label>
        {{ labels.provider }}
        <select v-model="settings.provider">
          <option value="deepseek">{{ labels.providerDeepseek }}</option>
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
        :class="message.role"
      >
        <div>{{ partText(message) }}</div>
        <div v-if="imageParts(message).length" class="cad-agent-msg-images">
          <img
            v-for="(part, index) in imageParts(message)"
            :key="`${message.id}-img-${index}`"
            class="cad-agent-msg-image"
            :src="part.url"
            :alt="part.filename ?? labels.imageAlt"
          />
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
            @click="dismissError"
          >
            ×
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
            @click="removePendingImage(index)"
          >
            ×
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
      <div class="cad-agent-panel-input-row">
        <div class="cad-agent-panel-input-actions">
          <button
            type="button"
            class="cad-agent-icon-btn"
            :disabled="isBusy || !supportsVision"
            :title="labels.attachImage"
            @click="openFilePicker"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"
              />
            </svg>
          </button>
        </div>
        <button
          type="button"
          class="cad-agent-panel-btn"
          :disabled="!canSend"
          @click="sendMessage"
        >
          {{ isBusy ? labels.working : labels.send }}
        </button>
      </div>
    </div>
  </div>
</template>
