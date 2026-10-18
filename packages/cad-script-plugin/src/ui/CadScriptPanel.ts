import type { ToolResult } from '@mlightcad/cad-agent-core'
import {
  createDocManagerSession,
  executeCadScript
} from '@mlightcad/cad-agent-core'
import { acapDocsUrl, AcApI18n } from '@mlightcad/cad-simple-viewer'
import JSONFormatter from 'json-formatter-js'

import type { ScriptLabels } from '../i18n'
import { buildScriptLabels } from '../i18n'
import { createScriptEditor, type ScriptEditor } from './createScriptEditor'

/** Draft key so a refresh keeps the last script the user typed. */
const SCRIPT_DRAFT_KEY = 'mlightcad.cad-script.draft'

/** Saved result-pane height so a refresh keeps the last split. */
const RESULT_HEIGHT_KEY = 'mlightcad.cad-script.result-height'

/** Script guide page, localized by {@link acapDocsUrl}. */
const SCRIPT_DOCS_PATH = 'guide/script/overview.html'

/** How many entity ids to print before collapsing the rest. */
const ID_PREVIEW_LIMIT = 40

/** Smallest result pane, in pixels. */
const RESULT_MIN = 72

/** Smallest editor, in pixels, so the splitter cannot cover the script. */
const EDITOR_MIN = 96

/** Splitter thickness used when measuring the drag. Matches the CSS height. */
const SPLITTER_SIZE = 8

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

/**
 * Manual CAD script console.
 *
 * The editor is CodeMirror, so `cad` members complete while typing.
 * Append {@link element} to a dock or palette tab, and
 * call {@link destroy} when that tab is removed.
 */
export class CadScriptPanel {
  /** Root element that fills the host tab. */
  readonly element: HTMLDivElement

  private readonly runButton: HTMLButtonElement
  private readonly hintEl: HTMLSpanElement
  private readonly helpLink: HTMLAnchorElement
  private readonly editor: ScriptEditor
  private readonly splitter: HTMLDivElement
  private readonly resultEl: HTMLDivElement

  private readonly session = createDocManagerSession()
  private labels: ScriptLabels = buildScriptLabels()
  private result: ToolResult | null = null
  private running = false
  /** Height the user chose. Clamped only when painting, so a short dock can grow back. */
  private preferredResultHeight = readResultHeight()
  private resultHeight = this.preferredResultHeight ?? 180
  /** True after the user drags or keys the splitter, or a saved height exists. */
  private userSplit = this.preferredResultHeight != null
  private draftTimer: ReturnType<typeof setTimeout> | undefined
  private resizeObserver: ResizeObserver | undefined
  private splitPointerId: number | undefined
  private onSplitMove: ((event: PointerEvent) => void) | undefined
  private onSplitUp: ((event: PointerEvent) => void) | undefined

  private readonly onLocaleChanged = () => {
    this.labels = buildScriptLabels()
    this.applyLabels()
    this.renderResult()
  }

  constructor() {
    this.element = document.createElement('div')
    this.element.className = 'cad-script-root'

    const toolbar = document.createElement('div')
    toolbar.className = 'cad-script-toolbar'

    this.runButton = document.createElement('button')
    this.runButton.type = 'button'
    this.runButton.className = 'cad-script-btn cad-script-btn--primary'
    this.runButton.addEventListener('click', () => {
      void this.runScript()
    })

    this.hintEl = document.createElement('span')
    this.hintEl.className = 'cad-script-hint'

    this.helpLink = document.createElement('a')
    this.helpLink.className = 'cad-script-help'
    this.helpLink.target = '_blank'
    this.helpLink.rel = 'noopener noreferrer'
    this.helpLink.append(createHelpIcon())

    toolbar.append(this.runButton, this.hintEl, this.helpLink)

    const editorWrap = document.createElement('div')
    editorWrap.className = 'cad-script-editor-wrap'
    const editorHost = document.createElement('div')
    editorHost.className = 'cad-script-editor'
    this.editor = createScriptEditor(
      editorHost,
      readDraft(),
      () => {
        this.scheduleDraftSave()
        this.syncRunButton()
      },
      () => {
        void this.runScript()
      }
    )
    editorWrap.append(editorHost)

    this.splitter = document.createElement('div')
    this.splitter.className = 'cad-script-splitter'
    this.splitter.role = 'separator'
    this.splitter.tabIndex = 0
    this.splitter.setAttribute('aria-orientation', 'horizontal')
    this.splitter.setAttribute('aria-valuemin', String(RESULT_MIN))
    this.splitter.addEventListener('pointerdown', event => {
      this.onSplitterPointerDown(event)
    })
    this.splitter.addEventListener('keydown', event => {
      this.onSplitterKeydown(event)
    })

    this.resultEl = document.createElement('div')
    this.resultEl.className = 'cad-script-result'

    this.element.append(toolbar, editorWrap, this.splitter, this.resultEl)

    this.applyLabels()
    this.syncRunButton()
    this.renderResult()
    this.layoutSplit()

    this.resizeObserver = new ResizeObserver(() => this.layoutSplit())
    this.resizeObserver.observe(this.element)
    AcApI18n.events.localeChanged.addEventListener(this.onLocaleChanged)
  }

  /**
   * Removes listeners and the root element.
   */
  destroy(): void {
    this.flushDraft()
    this.editor.destroy()
    this.resizeObserver?.disconnect()
    this.stopSplitDrag()
    AcApI18n.events.localeChanged.removeEventListener(this.onLocaleChanged)
    this.element.remove()
  }

  private applyLabels() {
    this.helpLink.href = acapDocsUrl(SCRIPT_DOCS_PATH, AcApI18n.currentLocale)
    this.helpLink.title = this.labels.scriptHelp
    this.helpLink.setAttribute('aria-label', this.labels.scriptHelp)
    this.hintEl.textContent = this.labels.scriptHint
    this.editor.setPlaceholder(this.labels.scriptPlaceholder)
    this.editor.setAriaLabel(this.labels.scriptTitle)
    this.splitter.setAttribute('aria-label', this.labels.scriptResize)
    this.syncRunButton()
  }

  private syncRunButton() {
    this.runButton.disabled =
      this.running || this.editor.value.trim().length === 0
    this.runButton.textContent = this.running
      ? this.labels.scriptRunning
      : this.labels.scriptRun
  }

  /**
   * Runs the editor contents against the active drawing.
   */
  private async runScript() {
    if (this.running || this.editor.value.trim().length === 0) return
    this.running = true
    this.syncRunButton()
    await new Promise<void>(resolve => {
      setTimeout(resolve, 0)
    })
    try {
      this.result = executeCadScript(
        { code: this.editor.value, intent: '' },
        this.session
      )
    } catch (error) {
      this.result = {
        success: false,
        message: '',
        error: error instanceof Error ? error.message : String(error)
      }
    } finally {
      this.running = false
      this.syncRunButton()
      this.renderResult()
    }
  }

  private scheduleDraftSave() {
    if (this.draftTimer) clearTimeout(this.draftTimer)
    this.draftTimer = setTimeout(() => {
      this.flushDraft()
    }, 200)
  }

  /**
   * Writes the editor text when a save is pending.
   *
   * Palette tabs unmount on switch, so a pending timer must not be dropped.
   */
  private flushDraft() {
    if (!this.draftTimer) return
    clearTimeout(this.draftTimer)
    this.draftTimer = undefined
    try {
      localStorage.setItem(SCRIPT_DRAFT_KEY, this.editor.value)
    } catch {
      // Ignore quota and private-mode failures.
    }
  }

  /**
   * Keeps the result pane at about a third of the panel until the user chooses
   * a height. After that, only clamp so a shrinking dock cannot cover the editor.
   *
   * Hidden mounts are ignored so a collapsed tab cannot lock in a tiny height.
   */
  private layoutSplit() {
    if (this.splitPointerId != null) return
    if (
      this.element.clientHeight <
      EDITOR_MIN + RESULT_MIN + SPLITTER_SIZE
    ) {
      return
    }
    const preferred = this.userSplit
      ? (this.preferredResultHeight ?? this.resultHeight)
      : Math.round(this.element.clientHeight * 0.34)
    this.resultHeight = this.clampResultHeight(preferred)
    this.applyResultHeight()
  }

  /**
   * Remembers the result-pane height after the user moves the splitter.
   */
  private rememberResultHeight() {
    this.userSplit = true
    this.preferredResultHeight = this.resultHeight
    try {
      localStorage.setItem(
        RESULT_HEIGHT_KEY,
        String(Math.round(this.resultHeight))
      )
    } catch {
      // Ignore quota and private-mode failures.
    }
  }

  /**
   * Keeps the result pane inside the space left after the editor minimum.
   *
   * @param next - Requested result height in pixels.
   * @returns Clamped height.
   */
  private clampResultHeight(next: number): number {
    const toolbar =
      this.element.querySelector('.cad-script-toolbar')?.getBoundingClientRect()
        .height ?? 40
    const max = Math.max(
      RESULT_MIN,
      this.element.clientHeight - toolbar - SPLITTER_SIZE - EDITOR_MIN
    )
    return Math.min(Math.max(next, RESULT_MIN), max)
  }

  private applyResultHeight() {
    this.resultEl.style.height = `${this.resultHeight}px`
    this.splitter.setAttribute('aria-valuenow', String(Math.round(this.resultHeight)))
    this.splitter.setAttribute(
      'aria-valuemax',
      String(Math.round(this.maxResultHeight()))
    )
  }

  private maxResultHeight(): number {
    const toolbar =
      this.element.querySelector('.cad-script-toolbar')?.getBoundingClientRect()
        .height ?? 40
    return Math.max(
      RESULT_MIN,
      this.element.clientHeight - toolbar - SPLITTER_SIZE - EDITOR_MIN
    )
  }

  /**
   * Drags the splitter so the result pane grows toward the pointer.
   *
   * @param event - Pointer down on the splitter.
   */
  private onSplitterPointerDown(event: PointerEvent) {
    if (event.button !== 0) return
    event.preventDefault()
    this.stopSplitDrag()
    this.splitter.setPointerCapture(event.pointerId)
    this.splitter.classList.add('is-dragging')
    this.splitPointerId = event.pointerId

    this.onSplitMove = moveEvent => {
      const rect = this.element.getBoundingClientRect()
      this.resultHeight = this.clampResultHeight(
        rect.bottom - moveEvent.clientY - SPLITTER_SIZE / 2
      )
      this.applyResultHeight()
    }
    this.onSplitUp = () => {
      const remember = this.onSplitMove != null
      this.stopSplitDrag()
      if (remember) this.rememberResultHeight()
    }
    this.splitter.addEventListener('pointermove', this.onSplitMove)
    this.splitter.addEventListener('pointerup', this.onSplitUp)
    this.splitter.addEventListener('pointercancel', this.onSplitUp)
  }

  /**
   * Drops an in-progress splitter drag without storing the height.
   */
  private stopSplitDrag() {
    if (this.onSplitMove) {
      this.splitter.removeEventListener('pointermove', this.onSplitMove)
    }
    if (this.onSplitUp) {
      this.splitter.removeEventListener('pointerup', this.onSplitUp)
      this.splitter.removeEventListener('pointercancel', this.onSplitUp)
    }
    if (
      this.splitPointerId != null &&
      this.splitter.hasPointerCapture(this.splitPointerId)
    ) {
      this.splitter.releasePointerCapture(this.splitPointerId)
    }
    this.splitter.classList.remove('is-dragging')
    this.onSplitMove = undefined
    this.onSplitUp = undefined
    this.splitPointerId = undefined
  }

  /**
   * Moves the splitter with the arrow keys.
   *
   * @param event - Key event from the splitter.
   */
  private onSplitterKeydown(event: KeyboardEvent) {
    const step = event.shiftKey ? 48 : 16
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      this.resultHeight = this.clampResultHeight(this.resultHeight + step)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      this.resultHeight = this.clampResultHeight(this.resultHeight - step)
    } else {
      return
    }
    this.applyResultHeight()
    this.rememberResultHeight()
  }

  private renderResult() {
    const labels = this.labels
    this.resultEl.classList.remove('is-success', 'is-error')
    this.resultEl.replaceChildren()

    if (!this.result) {
      const empty = document.createElement('p')
      empty.className = 'cad-script-result-empty'
      empty.textContent = labels.scriptEmptyResult
      this.resultEl.append(empty)
      return
    }

    this.resultEl.classList.add(this.result.success ? 'is-success' : 'is-error')

    const status = document.createElement('p')
    status.className = 'cad-script-status'
    status.textContent = this.result.success
      ? labels.scriptSuccess
      : labels.scriptFailed
    this.resultEl.append(status)

    const errorText = this.result.error
      ? explainError(this.result.error, labels)
      : ''
    if (errorText) {
      const error = document.createElement('p')
      error.className = 'cad-script-error'
      error.textContent = errorText
      this.resultEl.append(error)
    }

    const returnValue =
      this.result.success && this.result.data !== undefined
        ? this.result.data
        : undefined
    if (returnValue !== undefined) {
      const section = createSection(labels.scriptReturnValue)
      section.append(createJsonView(returnValue))
      this.resultEl.append(section)
    } else if (this.result.success) {
      const muted = document.createElement('p')
      muted.className = 'cad-script-muted'
      muted.textContent = labels.scriptNoReturn
      this.resultEl.append(muted)
    }

    const logEntries = (this.result.log ?? []).map(line => parseLogLine(line))
    if (logEntries.length) {
      const section = createSection(labels.scriptLog)
      for (const entry of logEntries) {
        if (entry.kind === 'json') {
          section.append(createJsonView(entry.value))
        } else {
          section.append(createPre(entry.text))
        }
      }
      this.resultEl.append(section)
    }

    const highlightText = formatIds(this.result.highlightedIds)
    if (highlightText) {
      const count = this.result.highlightedIds?.length ?? 0
      const section = createSection(`${labels.scriptHighlighted} (${count})`)
      section.append(createPre(highlightText))
      this.resultEl.append(section)
    }

    const createdText = formatIds(this.result.entityIds)
    if (createdText) {
      const count = this.result.entityIds?.length ?? 0
      const section = createSection(`${labels.scriptCreated} (${count})`)
      section.append(createPre(createdText))
      this.resultEl.append(section)
    }
  }
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
 * Reads the saved result-pane height.
 *
 * @returns Pixel height, or `null` when nothing valid is stored.
 */
function readResultHeight(): number | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(RESULT_HEIGHT_KEY)
    if (raw == null) return null
    const height = Number(raw)
    return Number.isFinite(height) ? height : null
  } catch {
    return null
  }
}

/**
 * Turns a script error code into a short label.
 *
 * @param error - `error` field from {@link executeCadScript}.
 * @param text - Localized panel labels.
 * @returns Text to show under the status line.
 */
function explainError(error: string, text: ScriptLabels): string {
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
 * Shows a log line in the JSON viewer when the whole line is a JSON object or array.
 *
 * `cad.log(JSON.stringify(value))` otherwise stays one long string.
 *
 * @param line - One `cad.log` line.
 * @returns Viewer data, or the original text.
 */
function parseLogLine(
  line: string
): { kind: 'json'; value: unknown } | { kind: 'text'; text: string } {
  const trimmed = line.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return { kind: 'text', text: line }
  }
  try {
    const value: unknown = JSON.parse(trimmed)
    if (value !== null && typeof value === 'object') {
      return { kind: 'json', value }
    }
  } catch {
    // Keep lines that only look like JSON.
  }
  return { kind: 'text', text: line }
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

function createSection(title: string): HTMLElement {
  const section = document.createElement('section')
  const heading = document.createElement('h3')
  heading.textContent = title
  section.append(heading)
  return section
}

function createPre(text: string): HTMLPreElement {
  const pre = document.createElement('pre')
  pre.textContent = text
  return pre
}

function createJsonView(value: unknown): HTMLDivElement {
  const host = document.createElement('div')
  host.className = 'cad-script-json'
  const formatter = new JSONFormatter(value, 3, {
    hoverPreviewEnabled: true,
    theme: 'dark'
  })
  host.append(formatter.render())
  return host
}

function createHelpIcon(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 16 16')
  svg.setAttribute('width', '16')
  svg.setAttribute('height', '16')
  svg.setAttribute('aria-hidden', 'true')

  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  circle.setAttribute('cx', '8')
  circle.setAttribute('cy', '8')
  circle.setAttribute('r', '6.25')
  circle.setAttribute('fill', 'none')
  circle.setAttribute('stroke', 'currentColor')
  circle.setAttribute('stroke-width', '1.25')

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute(
    'd',
    'M6.15 6.15a1.85 1.85 0 1 1 2.55 1.72c-.45.22-.7.52-.7.98V9.2'
  )
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', 'currentColor')
  path.setAttribute('stroke-width', '1.25')
  path.setAttribute('stroke-linecap', 'round')

  const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  dot.setAttribute('cx', '8')
  dot.setAttribute('cy', '11.15')
  dot.setAttribute('r', '0.7')
  dot.setAttribute('fill', 'currentColor')

  svg.append(circle, path, dot)
  return svg
}
