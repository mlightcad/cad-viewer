<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'

import {
  type DiscoveredModel,
  fetchAvailableModels,
  ModelListingError
} from '../agent/fetchAvailableModels'
import type { AgentChatLabelKey } from '../i18n'
import { useAgentI18n } from '../i18n/useAgentI18n'
import {
  createBuiltinProviderConfig,
  createCustomProviderConfig,
  CUSTOM_PROVIDER_ID_PATTERN,
  effectiveBaseUrl,
  effectiveModels,
  type LlmConfig,
  type LlmProviderConfig,
  removeProvider,
  upsertProvider
} from '../storage/LlmSettingsStore'
import {
  BUILTIN_PROVIDER_IDS,
  BUILTIN_PROVIDERS,
  type BuiltinProviderId,
  guessModelVision,
  isBuiltinProviderId,
  LLM_API_PROTOCOLS,
  type LlmApiProtocol,
  type LlmModelEntry,
  visionAfterIdEdit
} from '../storage/modelCatalog'
import { areProviderConfigsEqual } from '../storage/settingsEquality'
import { builtinProviderLabel, providerLabel } from './providerLabels'

/**
 * Model provider settings card of the CAD Agent panel.
 *
 * Offers two modes: a built-in provider that only needs an API key (with an
 * optional base URL override), and a custom OpenAI / Anthropic compatible API
 * declared by the user. Both edit the provider's model catalog, which can be
 * filled from the provider's own model listing.
 */
const props = defineProps<{
  /** Saved config the card edits a copy of. */
  config: LlmConfig
}>()

const emit = defineEmits<{
  /** The user saved or deleted a provider; carries the new config. */
  save: [config: LlmConfig]
  /** The user dismissed the card without saving. */
  cancel: []
  /** Whether the card holds unsaved edits. */
  dirtyChange: [dirty: boolean]
}>()

const { labels } = useAgentI18n()

type SettingsMode = 'builtin' | 'custom'

const PROTOCOL_LABEL_KEYS: Record<LlmApiProtocol, AgentChatLabelKey> = {
  'openai-chat': 'protocolOpenaiChat',
  'openai-responses': 'protocolOpenaiResponses',
  'anthropic-messages': 'protocolAnthropicMessages'
}

/** Deep copy so draft edits never reach the saved config. */
function cloneProvider(provider: LlmProviderConfig): LlmProviderConfig {
  return {
    ...provider,
    models: provider.models
      ? provider.models.map(model => ({ ...model }))
      : null
  }
}

function storedProvider(id: string): LlmProviderConfig | undefined {
  return props.config.providers.find(provider => provider.id === id)
}

function loadBuiltin(id: BuiltinProviderId): LlmProviderConfig {
  return cloneProvider(storedProvider(id) ?? createBuiltinProviderConfig(id))
}

function loadCustom(id: string): LlmProviderConfig {
  const stored = id ? storedProvider(id) : undefined
  return cloneProvider(stored ?? createCustomProviderConfig())
}

const customProviders = computed(() =>
  props.config.providers.filter(provider => provider.kind === 'custom')
)

const activeId = props.config.activeProviderId
const mode = ref<SettingsMode>(
  isBuiltinProviderId(activeId) ? 'builtin' : 'custom'
)
const builtinId = ref<BuiltinProviderId>(
  isBuiltinProviderId(activeId) ? activeId : 'deepseek'
)
const customId = ref(
  storedProvider(activeId)?.kind === 'custom'
    ? activeId
    : (customProviders.value[0]?.id ?? '')
)
const builtinDraft = ref(loadBuiltin(builtinId.value))
const customDraft = ref(loadCustom(customId.value))
const showAdvanced = ref(builtinDraft.value.baseUrl.trim().length > 0)

const draft = computed(() =>
  mode.value === 'builtin' ? builtinDraft.value : customDraft.value
)
const isNewCustom = computed(
  () => mode.value === 'custom' && !storedProvider(customId.value)
)

/** Saved copy of the provider being edited, for dirty tracking. */
const savedDraft = computed(() =>
  mode.value === 'builtin'
    ? (storedProvider(builtinId.value) ??
      createBuiltinProviderConfig(builtinId.value))
    : (storedProvider(customId.value) ?? createCustomProviderConfig())
)
const dirty = computed(
  () => !areProviderConfigsEqual(draft.value, savedDraft.value)
)
watch(dirty, value => emit('dirtyChange', value), { immediate: true })

const displayModels = computed(() => effectiveModels(draft.value))

/** Built-in dropdown label, marking providers that already have a key. */
function builtinOptionLabel(id: BuiltinProviderId): string {
  const label = builtinProviderLabel(id, labels.value)
  return storedProvider(id)?.apiKey.trim()
    ? `${label} · ${labels.value.providerConfigured}`
    : label
}

function onBuiltinChange(event: Event) {
  const id = (event.target as HTMLSelectElement).value
  if (!isBuiltinProviderId(id)) return
  resetFetch()
  builtinId.value = id
  builtinDraft.value = loadBuiltin(id)
  showAdvanced.value = builtinDraft.value.baseUrl.trim().length > 0
}

function onCustomChange(event: Event) {
  resetFetch()
  customId.value = (event.target as HTMLSelectElement).value
  customDraft.value = loadCustom(customId.value)
}

function switchMode(next: SettingsMode) {
  if (next === mode.value) return
  resetFetch()
  mode.value = next
}

// --- Model catalog -------------------------------------------------------

/** Writes a new catalog, turning inherited defaults into an override. */
function setModels(models: LlmModelEntry[]) {
  draft.value.models = models
}

function updateModel(index: number, patch: Partial<LlmModelEntry>) {
  setModels(
    displayModels.value.map((model, at) =>
      at === index ? { ...model, ...patch } : { ...model }
    )
  )
}

function onModelIdInput(index: number, event: Event) {
  const id = (event.target as HTMLInputElement).value
  updateModel(index, {
    id,
    vision: visionAfterIdEdit(displayModels.value[index], id)
  })
}

function removeModel(index: number) {
  setModels(
    displayModels.value
      .filter((_, at) => at !== index)
      .map(model => ({ ...model }))
  )
}

function addModel() {
  setModels([
    ...displayModels.value.map(model => ({ ...model })),
    { id: '', vision: false }
  ])
}

function resetModels() {
  closePicker()
  builtinDraft.value.models = null
}

// --- Fetch available models ---------------------------------------------

const fetching = ref(false)
const fetchError = ref('')
const candidates = ref<DiscoveredModel[] | null>(null)
/** Candidate ids whose checkbox the user flipped from its default. */
const flipped = ref(new Set<string>())
const candidateQuery = ref('')
let fetchAbort: AbortController | undefined

onUnmounted(() => fetchAbort?.abort())

const fetchBlockedReason = computed(() => {
  if (!effectiveBaseUrl(draft.value)) return labels.value.fetchNeedsBaseUrl
  if (!draft.value.apiKey.trim()) return labels.value.fetchNeedsKey
  return ''
})

function listingErrorMessage(error: unknown): string {
  if (!(error instanceof ModelListingError))
    return labels.value.fetchFailedFormat
  if (error.code === 'network') {
    return labels.value.fetchFailedNetwork.replace('{url}', error.url)
  }
  if (error.code === 'http') {
    return labels.value.fetchFailedHttp.replace(
      '{status}',
      String(error.status ?? '')
    )
  }
  return labels.value.fetchFailedFormat
}

async function fetchModels() {
  if (fetching.value || fetchBlockedReason.value) return
  fetchAbort?.abort()
  const abort = new AbortController()
  fetchAbort = abort
  fetching.value = true
  fetchError.value = ''
  try {
    const found = await fetchAvailableModels(
      {
        protocol: draft.value.protocol,
        baseUrl: effectiveBaseUrl(draft.value),
        apiKey: draft.value.apiKey
      },
      undefined,
      abort.signal
    )
    if (abort.signal.aborted) return
    if (!found.length) {
      fetchError.value = labels.value.fetchEmpty
      return
    }
    flipped.value = new Set()
    candidateQuery.value = ''
    candidates.value = found
  } catch (error) {
    if (!abort.signal.aborted) fetchError.value = listingErrorMessage(error)
  } finally {
    if (fetchAbort === abort) {
      fetching.value = false
      fetchAbort = undefined
    }
  }
}

function closePicker() {
  candidates.value = null
  flipped.value = new Set()
  candidateQuery.value = ''
}

/**
 * Drops an in-flight fetch, its error and the picker, so a listing requested
 * for one provider never lands in another provider's catalog.
 */
function resetFetch() {
  fetchAbort?.abort()
  fetchAbort = undefined
  fetching.value = false
  fetchError.value = ''
  closePicker()
}

// The picker opens with the current catalog checked, so confirming adds the
// newly checked candidates and drops the unchecked ones in one step. With an
// empty catalog every candidate starts checked.
const configuredIds = computed(
  () => new Set(displayModels.value.map(model => model.id).filter(Boolean))
)

function pickedByDefault(id: string): boolean {
  return configuredIds.value.size === 0 || configuredIds.value.has(id)
}

function isPicked(id: string): boolean {
  return pickedByDefault(id) !== flipped.value.has(id)
}

function toggleCandidate(id: string) {
  const next = new Set(flipped.value)
  if (!next.delete(id)) next.add(id)
  flipped.value = next
}

const visibleCandidates = computed(() => {
  const query = candidateQuery.value.trim().toLowerCase()
  const all = candidates.value ?? []
  if (!query) return all
  return all.filter(
    candidate =>
      candidate.id.toLowerCase().includes(query) ||
      !!candidate.name?.toLowerCase().includes(query)
  )
})

const allVisiblePicked = computed(
  () =>
    visibleCandidates.value.length > 0 &&
    visibleCandidates.value.every(candidate => isPicked(candidate.id))
)

/** "checked / listed" counter shown next to the picker title. */
const pickedSummary = computed(() => {
  const all = candidates.value ?? []
  const picked = all.filter(candidate => isPicked(candidate.id)).length
  return `${picked} / ${all.length}`
})

/** Checks or clears only the visible candidates, never hidden ones. */
function toggleVisibleCandidates() {
  const target = !allVisiblePicked.value
  const next = new Set(flipped.value)
  for (const candidate of visibleCandidates.value) {
    if (pickedByDefault(candidate.id) === target) next.delete(candidate.id)
    else next.add(candidate.id)
  }
  flipped.value = next
}

/** Catalog that confirming the picker would produce. */
const pickedModels = computed<LlmModelEntry[]>(() => {
  const listed = new Set(
    (candidates.value ?? []).map(candidate => candidate.id)
  )
  // Rows the listing does not name (typed by hand) are outside the picker and stay.
  const kept = displayModels.value
    .filter(model => !listed.has(model.id) || isPicked(model.id))
    .map(model => ({ ...model }))
  const keptIds = new Set(kept.map(model => model.id))
  const added = (candidates.value ?? [])
    .filter(candidate => isPicked(candidate.id) && !keptIds.has(candidate.id))
    .map(candidate => ({
      id: candidate.id,
      ...(candidate.name ? { name: candidate.name } : {}),
      vision: guessModelVision(candidate.id)
    }))
  return [...kept, ...added]
})

function adoptPicked() {
  if (!pickedModels.value.length) return
  setModels(pickedModels.value)
  closePicker()
}

// --- Validation and save ------------------------------------------------

/** Catalog with blank rows dropped and ids trimmed and de-duplicated. */
function cleanModels(models: readonly LlmModelEntry[]): LlmModelEntry[] {
  const seen = new Set<string>()
  const result: LlmModelEntry[] = []
  for (const model of models) {
    const id = model.id.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    const name = model.name?.trim()
    result.push({ id, ...(name ? { name } : {}), vision: model.vision })
  }
  return result
}

function isHttpUrl(value: string): boolean {
  try {
    const protocol = new URL(value).protocol
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

const providerIdError = computed(() => {
  if (!isNewCustom.value) return ''
  const id = customDraft.value.id
  if (!id) return ''
  if (!CUSTOM_PROVIDER_ID_PATTERN.test(id))
    return labels.value.providerIdInvalid
  if (isBuiltinProviderId(id) || storedProvider(id)) {
    return labels.value.providerIdTaken
  }
  return ''
})

const baseUrlError = computed(() => {
  const url = draft.value.baseUrl.trim()
  return url && !isHttpUrl(url) ? labels.value.baseUrlInvalid : ''
})

/** First unmet requirement, shown above the footer; empty when savable. */
const validationMessage = computed(() => {
  if (providerIdError.value || baseUrlError.value) return ''
  if (mode.value === 'custom') {
    if (!customDraft.value.id) return labels.value.needsProviderId
    if (!customDraft.value.baseUrl.trim()) return labels.value.needsBaseUrl
  }
  if (!cleanModels(displayModels.value).length) return labels.value.needsModels
  return ''
})

const canSave = computed(
  () =>
    !fetching.value &&
    !candidates.value &&
    !providerIdError.value &&
    !baseUrlError.value &&
    !validationMessage.value
)

function save() {
  if (!canSave.value) return
  const provider: LlmProviderConfig = {
    ...draft.value,
    id: draft.value.id.trim(),
    displayName: draft.value.displayName?.trim(),
    baseUrl: draft.value.baseUrl.trim(),
    apiKey: draft.value.apiKey.trim(),
    models: draft.value.models ? cleanModels(draft.value.models) : null
  }
  if (provider.kind === 'builtin') delete provider.displayName
  emit('save', upsertProvider(props.config, provider))
}

function deleteProvider() {
  const id = customId.value
  if (!storedProvider(id)) return
  if (!window.confirm(labels.value.deleteProviderConfirm.replace('{id}', id))) {
    return
  }
  emit('save', removeProvider(props.config, id))
}

const defaultBaseUrlHint = computed(() =>
  labels.value.baseUrlDefault.replace(
    '{url}',
    BUILTIN_PROVIDERS[builtinId.value].baseUrl
  )
)
</script>

<template>
  <div class="cad-agent-settings">
    <div class="cad-agent-segmented" role="tablist">
      <button
        type="button"
        role="tab"
        class="cad-agent-segmented-item"
        :class="{ 'is-active': mode === 'builtin' }"
        :aria-selected="mode === 'builtin'"
        @click="switchMode('builtin')"
      >
        {{ labels.tabBuiltin }}
      </button>
      <button
        type="button"
        role="tab"
        class="cad-agent-segmented-item"
        :class="{ 'is-active': mode === 'custom' }"
        :aria-selected="mode === 'custom'"
        @click="switchMode('custom')"
      >
        {{ labels.tabCustom }}
      </button>
    </div>
    <p class="cad-agent-model-hint">
      {{ mode === 'builtin' ? labels.builtinIntro : labels.customIntro }}
    </p>

    <template v-if="mode === 'builtin'">
      <label class="cad-agent-field">
        <span class="cad-agent-field-label">{{ labels.provider }}</span>
        <select :value="builtinId" @change="onBuiltinChange">
          <option v-for="id in BUILTIN_PROVIDER_IDS" :key="id" :value="id">
            {{ builtinOptionLabel(id) }}
          </option>
        </select>
      </label>
      <label class="cad-agent-field">
        <span class="cad-agent-field-label">{{ labels.apiKey }}</span>
        <input
          v-model="builtinDraft.apiKey"
          type="password"
          autocomplete="off"
          spellcheck="false"
          :placeholder="labels.apiKeyPlaceholder"
        />
      </label>
      <p v-if="!builtinDraft.apiKey.trim()" class="cad-agent-field-warning">
        {{ labels.apiKeyRequired }}
      </p>

      <div class="cad-agent-settings-divider" />
      <button
        type="button"
        class="cad-agent-disclosure"
        :aria-expanded="showAdvanced"
        @click="showAdvanced = !showAdvanced"
      >
        <svg
          class="cad-agent-disclosure-icon"
          :class="{ 'is-open': showAdvanced }"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"
          />
        </svg>
        {{ labels.advancedSettings }}
      </button>
      <div v-if="showAdvanced" class="cad-agent-settings-group">
        <label class="cad-agent-field">
          <span class="cad-agent-field-label">{{ labels.baseUrl }}</span>
          <input
            v-model="builtinDraft.baseUrl"
            type="text"
            spellcheck="false"
            :placeholder="BUILTIN_PROVIDERS[builtinId].baseUrl"
          />
        </label>
        <p v-if="baseUrlError" class="cad-agent-field-error">
          {{ baseUrlError }}
        </p>
        <p v-else class="cad-agent-model-hint">{{ defaultBaseUrlHint }}</p>
        <p v-if="builtinId === 'deepseek-vl'" class="cad-agent-model-hint">
          {{ labels.providerDeepseekVlHint }}
        </p>
      </div>
    </template>

    <template v-else>
      <label v-if="customProviders.length" class="cad-agent-field">
        <span class="cad-agent-field-label">{{ labels.customProvider }}</span>
        <select :value="customId" @change="onCustomChange">
          <option
            v-for="provider in customProviders"
            :key="provider.id"
            :value="provider.id"
          >
            {{ providerLabel(provider, labels) }}
          </option>
          <option value="">{{ labels.newCustomProvider }}</option>
        </select>
      </label>
      <label class="cad-agent-field">
        <span class="cad-agent-field-label">{{ labels.providerId }}</span>
        <input
          v-model.trim="customDraft.id"
          type="text"
          spellcheck="false"
          autocomplete="off"
          placeholder="acme-gateway"
          :disabled="!isNewCustom"
        />
      </label>
      <p v-if="providerIdError" class="cad-agent-field-error">
        {{ providerIdError }}
      </p>
      <p v-else class="cad-agent-model-hint">{{ labels.providerIdHint }}</p>
      <label class="cad-agent-field">
        <span class="cad-agent-field-label">{{ labels.displayName }}</span>
        <input
          v-model="customDraft.displayName"
          type="text"
          :placeholder="labels.displayName"
        />
      </label>
      <label class="cad-agent-field">
        <span class="cad-agent-field-label">{{ labels.baseUrl }}</span>
        <input
          v-model="customDraft.baseUrl"
          type="text"
          spellcheck="false"
          placeholder="https://gateway.example/v1"
        />
      </label>
      <p v-if="baseUrlError" class="cad-agent-field-error">
        {{ baseUrlError }}
      </p>
      <p v-else class="cad-agent-model-hint">{{ labels.baseUrlHint }}</p>
      <label class="cad-agent-field">
        <span class="cad-agent-field-label">{{ labels.protocol }}</span>
        <select v-model="customDraft.protocol">
          <option
            v-for="protocol in LLM_API_PROTOCOLS"
            :key="protocol"
            :value="protocol"
          >
            {{ labels[PROTOCOL_LABEL_KEYS[protocol]] }}
          </option>
        </select>
      </label>
      <label class="cad-agent-field">
        <span class="cad-agent-field-label">{{ labels.apiKey }}</span>
        <input
          v-model="customDraft.apiKey"
          type="password"
          autocomplete="off"
          spellcheck="false"
          :placeholder="labels.apiKeyPlaceholder"
        />
      </label>
    </template>

    <div class="cad-agent-settings-divider" />
    <section class="cad-agent-catalog" :aria-label="labels.models">
      <div class="cad-agent-catalog-head">
        <div class="cad-agent-catalog-heading">
          <span class="cad-agent-field-label">{{ labels.models }}</span>
          <span v-if="mode === 'builtin'" class="cad-agent-catalog-meta">
            {{
              builtinDraft.models === null
                ? labels.modelsDefault
                : labels.modelsCustomized
            }}
          </span>
        </div>
        <div class="cad-agent-catalog-actions">
          <button
            v-if="mode === 'builtin' && builtinDraft.models !== null"
            type="button"
            class="cad-agent-link-btn"
            :disabled="fetching"
            @click="resetModels"
          >
            {{ labels.resetModels }}
          </button>
          <button
            type="button"
            class="cad-agent-link-btn"
            :disabled="fetching || !!fetchBlockedReason || !!candidates"
            :title="fetchBlockedReason || undefined"
            @click="fetchModels"
          >
            {{ fetching ? labels.fetching : labels.fetchModels }}
          </button>
        </div>
      </div>

      <div v-if="candidates" class="cad-agent-picker">
        <div class="cad-agent-picker-title">
          {{ labels.fetchTitle }}
          <span class="cad-agent-catalog-meta">
            {{ pickedSummary }}
          </span>
        </div>
        <div class="cad-agent-picker-toolbar">
          <input
            v-model="candidateQuery"
            type="search"
            :placeholder="labels.fetchSearch"
            :aria-label="labels.fetchSearch"
          />
          <button
            type="button"
            class="cad-agent-link-btn"
            :disabled="!visibleCandidates.length"
            @click="toggleVisibleCandidates"
          >
            {{
              allVisiblePicked ? labels.fetchDeselectAll : labels.fetchSelectAll
            }}
          </button>
        </div>
        <p v-if="!visibleCandidates.length" class="cad-agent-catalog-empty">
          {{ labels.fetchNoMatches }}
        </p>
        <ul v-else class="cad-agent-picker-list">
          <li v-for="candidate in visibleCandidates" :key="candidate.id">
            <label class="cad-agent-picker-item">
              <input
                type="checkbox"
                :checked="isPicked(candidate.id)"
                @change="toggleCandidate(candidate.id)"
              />
              <span
                class="cad-agent-picker-id"
                :title="candidate.name ?? candidate.id"
              >
                {{ candidate.id }}
              </span>
            </label>
          </li>
        </ul>
        <div class="cad-agent-picker-footer">
          <button
            type="button"
            class="cad-agent-panel-btn"
            @click="closePicker"
          >
            {{ labels.cancel }}
          </button>
          <button
            type="button"
            class="cad-agent-panel-btn cad-agent-panel-btn--primary"
            :disabled="!pickedModels.length"
            :title="pickedModels.length ? undefined : labels.fetchKeepOne"
            @click="adoptPicked"
          >
            {{ labels.fetchAdopt }}
          </button>
        </div>
      </div>

      <template v-else>
        <div v-if="!displayModels.length" class="cad-agent-catalog-empty">
          {{ labels.modelsEmpty }}
        </div>
        <ul v-else class="cad-agent-model-rows">
          <li
            v-for="(model, index) in displayModels"
            :key="index"
            class="cad-agent-model-row"
          >
            <input
              class="cad-agent-model-row-id"
              type="text"
              spellcheck="false"
              :value="model.id"
              :title="model.name ?? model.id"
              :placeholder="labels.modelId"
              :aria-label="`${labels.modelId} ${index + 1}`"
              @input="onModelIdInput(index, $event)"
            />
            <label
              class="cad-agent-model-row-vision"
              :title="labels.modelVisionHint"
            >
              <input
                type="checkbox"
                :checked="model.vision"
                @change="
                  updateModel(index, {
                    vision: ($event.target as HTMLInputElement).checked
                  })
                "
              />
              {{ labels.modelVision }}
            </label>
            <button
              type="button"
              class="cad-agent-model-row-remove"
              :title="labels.removeModel"
              :aria-label="`${labels.removeModel} ${index + 1}`"
              @click="removeModel(index)"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                />
              </svg>
            </button>
          </li>
        </ul>
        <button
          type="button"
          class="cad-agent-panel-btn cad-agent-add-model-btn"
          @click="addModel"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          {{ labels.addModel }}
        </button>
      </template>
      <p v-if="fetchError" class="cad-agent-field-error">{{ fetchError }}</p>
    </section>

    <p v-if="validationMessage" class="cad-agent-input-hint">
      {{ validationMessage }}
    </p>
    <div class="cad-agent-settings-footer">
      <button
        v-if="mode === 'custom' && !isNewCustom"
        type="button"
        class="cad-agent-panel-btn cad-agent-panel-btn--danger"
        @click="deleteProvider"
      >
        {{ labels.deleteProvider }}
      </button>
      <span class="cad-agent-settings-footer-spacer" />
      <button type="button" class="cad-agent-panel-btn" @click="emit('cancel')">
        {{ labels.cancel }}
      </button>
      <button
        type="button"
        class="cad-agent-panel-btn cad-agent-panel-btn--primary"
        :disabled="!canSave"
        @click="save"
      >
        {{ isNewCustom ? labels.createProvider : labels.save }}
      </button>
    </div>
  </div>
</template>
