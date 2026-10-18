<script setup lang="ts">
import '../ui/script-panel.css'

import type { ToolResult } from '@mlightcad/cad-agent-core'
import {
  CAD_SCRIPT_API_SUMMARY,
  createDocManagerSession,
  executeCadScript
} from '@mlightcad/cad-agent-core'
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'

import type { ScriptLabelKey } from '../i18n'
import { useScriptI18n } from '../i18n/useScriptI18n'

/** Draft key so a refresh keeps the last script the user typed. */
const SCRIPT_DRAFT_KEY = 'mlightcad.cad-script.draft'

/** How many entity ids to print before collapsing the rest. */
const ID_PREVIEW_LIMIT = 40

const DEFAULT_CAD_SCRIPT = `const counts = {}
for (const entity of cad.entities.where(() => true)) {
  counts[entity.type] = (counts[entity.type] || 0) + 1
}
cad.log('entity count by type', counts)
return {
  title: cad.drawing.title,
  layer: cad.drawing.currentLayer,
  counts
}`

const { labels } = useScriptI18n()
const session = createDocManagerSession()
const code = ref(readDraft())
const result = ref<ToolResult | null>(null)
const running = ref(false)
const showApi = ref(false)
let saveTimer: ReturnType<typeof setTimeout> | undefined

watch(code, value => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(SCRIPT_DRAFT_KEY, value)
    } catch {
      // Ignore quota and private-mode failures.
    }
  }, 200)
})

onUnmounted(() => {
  if (saveTimer) clearTimeout(saveTimer)
})

const resultClass = computed(() => {
  if (!result.value) return ''
  return result.value.success ? 'is-success' : 'is-error'
})

const errorText = computed(() => {
  const error = result.value?.error
  if (!error) return ''
  return explainError(error, labels.value)
})

const returnText = computed(() => {
  const value = result.value
  if (!value?.success || value.data === undefined) return ''
  return formatValue(value.data)
})

const logText = computed(() => result.value?.log?.join('\n') ?? '')
const highlightText = computed(() => formatIds(result.value?.highlightedIds))
const createdText = computed(() => formatIds(result.value?.entityIds))
const highlightedHeading = computed(() => {
  const count = result.value?.highlightedIds?.length ?? 0
  return `${labels.value.scriptHighlighted} (${count})`
})
const createdHeading = computed(() => {
  const count = result.value?.entityIds?.length ?? 0
  return `${labels.value.scriptCreated} (${count})`
})

/**
 * Runs the editor contents against the active drawing.
 */
const runScript = async () => {
  if (running.value || code.value.trim().length === 0) return
  running.value = true
  await new Promise<void>(resolve => {
    setTimeout(resolve, 0)
  })
  try {
    result.value = executeCadScript({ code: code.value, intent: '' }, session)
  } catch (error) {
    result.value = {
      success: false,
      message: '',
      error: error instanceof Error ? error.message : String(error)
    }
  } finally {
    running.value = false
  }
}

/**
 * Inserts spaces on Tab and runs on Ctrl/Cmd+Enter.
 *
 * @param event - Key event from the script editor.
 */
const onEditorKeydown = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    void runScript()
    return
  }
  if (event.key !== 'Tab' || event.ctrlKey || event.metaKey || event.altKey) {
    return
  }
  event.preventDefault()
  const el = event.target
  if (!(el instanceof HTMLTextAreaElement)) return
  const start = el.selectionStart
  const end = el.selectionEnd
  const indent = '  '
  code.value = code.value.slice(0, start) + indent + code.value.slice(end)
  void nextTick(() => {
    el.selectionStart = start + indent.length
    el.selectionEnd = start + indent.length
  })
}

/**
 * Reads the saved draft, or the sample query when nothing is stored.
 *
 * @returns Script source for the editor.
 */
function readDraft(): string {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_CAD_SCRIPT
    const stored = localStorage.getItem(SCRIPT_DRAFT_KEY)
    if (stored != null) return stored
  } catch {
    // Ignore storage access errors.
  }
  return DEFAULT_CAD_SCRIPT
}

/**
 * Turns a script error code into a short label.
 *
 * @param error - `error` field from {@link executeCadScript}.
 * @param text - Localized panel labels.
 * @returns Text to show under the status line.
 */
function explainError(error: string, text: Record<ScriptLabelKey, string>): string {
  const named = (prefix: string, label: string) => {
    if (!error.startsWith(prefix)) return undefined
    const detail = error.slice(prefix.length)
    return detail ? `${label}: ${detail}` : label
  }
  const byCode: Record<string, string> = {
    no_document: text.scriptNoDocument,
    read_only: text.scriptReadOnly,
    no_view: text.scriptNoView,
    script_timeout: text.scriptTimeout,
    script_result_not_serializable: text.scriptNotJson,
    empty_script: text.scriptEmptyCode,
    script_too_large: text.scriptTooLarge,
    dynamic_host_access: text.scriptDynamicAccess
  }
  return (
    named('forbidden_syntax:', text.scriptForbiddenSyntax) ??
    named('forbidden_identifier:', text.scriptForbiddenIdentifier) ??
    named('forbidden_member:', text.scriptForbiddenMember) ??
    named('unknown_api:', text.scriptUnknownApi) ??
    byCode[error] ??
    error
  )
}

/**
 * Prints a JSON value for the result pane.
 *
 * @param value - Script return value.
 * @returns Pretty-printed JSON, or a string fallback.
 */
function formatValue(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? String(value)
  } catch {
    return String(value)
  }
}

/**
 * Prints entity ids, collapsing long lists.
 *
 * @param ids - Highlighted or created ids.
 * @returns One id per line, or an empty string.
 */
function formatIds(ids: string[] | undefined): string {
  if (!ids?.length) return ''
  const shown = ids.slice(0, ID_PREVIEW_LIMIT)
  const hidden = ids.length - shown.length
  if (hidden <= 0) return shown.join('\n')
  return `${shown.join('\n')}\n… +${hidden}`
}
</script>

<template>
  <div class="cad-script-root">
    <div class="cad-script-toolbar">
      <button
        type="button"
        class="cad-script-btn cad-script-btn--primary"
        :disabled="running || !code.trim()"
        @click="runScript"
      >
        {{ running ? labels.scriptRunning : labels.scriptRun }}
      </button>
      <span class="cad-script-hint">{{ labels.scriptHint }}</span>
      <button
        type="button"
        class="cad-script-btn"
        :class="{ 'is-active': showApi }"
        @click="showApi = !showApi"
      >
        {{ labels.scriptApi }}
      </button>
    </div>

    <pre v-if="showApi" class="cad-script-api">{{ CAD_SCRIPT_API_SUMMARY }}</pre>

    <textarea
      v-model="code"
      class="cad-script-editor"
      spellcheck="false"
      autocomplete="off"
      :placeholder="labels.scriptPlaceholder"
      :aria-label="labels.scriptTitle"
      @keydown="onEditorKeydown"
    />

    <div class="cad-script-result" :class="resultClass">
      <p v-if="!result" class="cad-script-result-empty">
        {{ labels.scriptEmptyResult }}
      </p>
      <template v-else>
        <p class="cad-script-status">
          {{ result.success ? labels.scriptSuccess : labels.scriptFailed }}
        </p>
        <p v-if="errorText" class="cad-script-error">{{ errorText }}</p>
        <section v-if="returnText">
          <h3>{{ labels.scriptReturnValue }}</h3>
          <pre>{{ returnText }}</pre>
        </section>
        <p v-else-if="result.success" class="cad-script-muted">
          {{ labels.scriptNoReturn }}
        </p>
        <section v-if="logText">
          <h3>{{ labels.scriptLog }}</h3>
          <pre>{{ logText }}</pre>
        </section>
        <section v-if="highlightText">
          <h3>
            {{ highlightedHeading }}
          </h3>
          <pre>{{ highlightText }}</pre>
        </section>
        <section v-if="createdText">
          <h3>{{ createdHeading }}</h3>
          <pre>{{ createdText }}</pre>
        </section>
      </template>
    </div>
  </div>
</template>
