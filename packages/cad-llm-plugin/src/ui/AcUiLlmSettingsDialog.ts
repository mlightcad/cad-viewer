import { AcUiDialog } from '@mlightcad/cad-simple-viewer'

import { type AcApLlmLabelKey, llmT } from '../i18n'
import {
  type AcApLlmDiscoveredModel,
  acapLlmFetchAvailableModels,
  AcApLlmModelListingError
} from '../model/AcApLlmModelListing'
import {
  ACAP_LLM_CUSTOM_PROVIDER_ID_PATTERN,
  type AcApLlmConfig,
  acapLlmCreateBuiltinProvider,
  acapLlmCreateCustomProvider,
  acapLlmEffectiveBaseUrl,
  acapLlmEffectiveModels,
  acapLlmLoadConfig,
  type AcApLlmProviderConfig,
  acapLlmRemoveProvider,
  acapLlmResolveVisionSettings,
  acapLlmSaveConfig,
  acapLlmUpsertProvider
} from '../storage/AcApLlmConfigStore'
import {
  ACAP_LLM_API_PROTOCOLS,
  ACAP_LLM_BUILTIN_PROVIDER_IDS,
  ACAP_LLM_BUILTIN_PROVIDERS,
  type AcApLlmApiProtocol,
  type AcApLlmBuiltinProviderId,
  acapLlmGuessModelVision,
  acapLlmIsBuiltinProviderId,
  type AcApLlmModelEntry,
  acapLlmVisionAfterIdEdit
} from '../storage/AcApLlmModelCatalog'
import { acapLlmAreProvidersEqual } from '../storage/settingsEquality'
import { acapLlmModelChoices } from './AcApLlmModelChoices'
import {
  acapLlmBuiltinProviderLabel,
  acapLlmProviderLabel
} from './AcApLlmProviderLabels'
import { LLM_SETTINGS_STYLES } from './llmSettingsStyles'

/** Options for {@link AcUiLlmSettingsDialog.open}. */
export interface AcUiLlmSettingsDialogOptions {
  /**
   * Element that receives the dialog backdrop, typically the canvas
   * container. Defaults to `document.body`.
   */
  host?: HTMLElement
}

/** Which half of the provider editor is shown. */
type SettingsMode = 'builtin' | 'custom'

const PROTOCOL_LABEL_KEYS: Record<AcApLlmApiProtocol, AcApLlmLabelKey> = {
  'openai-chat': 'protocolOpenaiChat',
  'openai-responses': 'protocolOpenaiResponses',
  'anthropic-messages': 'protocolAnthropicMessages'
}

/**
 * Separates provider id and model id in model `<option>` values. A newline
 * cannot be typed into the single-line inputs ids come from.
 */
const MODEL_VALUE_SEPARATOR = '\n'

const ICON_CHEVRON = 'M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z'
const ICON_CLOSE =
  'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'
const ICON_PLUS = 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z'

/** Deep copy so draft edits never reach the saved config. */
function cloneProvider(provider: AcApLlmProviderConfig): AcApLlmProviderConfig {
  return {
    ...provider,
    models: provider.models
      ? provider.models.map(model => ({ ...model }))
      : null
  }
}

/** Catalog with blank rows dropped and ids trimmed and de-duplicated. */
function cleanModels(
  models: readonly AcApLlmModelEntry[]
): AcApLlmModelEntry[] {
  const seen = new Set<string>()
  const result: AcApLlmModelEntry[] = []
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

/** Creates an element with a class name and optional text. */
function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text?: string
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag)
  if (className) element.className = className
  if (text !== undefined) element.textContent = text
  return element
}

function svgIcon(path: string, className = ''): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  if (className) svg.setAttribute('class', className)
  const shape = document.createElementNS(ns, 'path')
  shape.setAttribute('fill', 'currentColor')
  shape.setAttribute('d', path)
  svg.appendChild(shape)
  return svg
}

function button(
  className: string,
  text: string,
  onClick: () => void
): HTMLButtonElement {
  const element = h('button', className, text)
  element.type = 'button'
  element.addEventListener('click', onClick)
  return element
}

function textInput(
  value: string,
  onInput: (value: string) => void,
  options: { type?: string; placeholder?: string; secret?: boolean } = {}
): HTMLInputElement {
  const input = h('input')
  input.type = options.type ?? 'text'
  input.value = value
  input.spellcheck = false
  if (options.secret) input.autocomplete = 'off'
  if (options.placeholder) input.placeholder = options.placeholder
  input.addEventListener('input', () => onInput(input.value))
  return input
}

/** Wraps a control with a field label. */
function field(label: string, control: HTMLElement): HTMLLabelElement {
  const wrapper = h('label', 'ml-llm-field')
  wrapper.append(h('span', 'ml-llm-field-label', label), control)
  return wrapper
}

/** Lays out two fields side by side. */
function fieldRow(...fields: HTMLElement[]): HTMLDivElement {
  const row = h('div', 'ml-llm-field-row')
  row.append(...fields)
  return row
}

/**
 * Framework-free dialog for the shared AI model settings.
 *
 * The top section picks the model in use (chat and, when it accepts images,
 * text recognition). Below it, a provider editor offers two modes: a built-in
 * provider that only needs an API key (with an optional base URL override),
 * and a custom OpenAI / Anthropic compatible API declared by the user. Both
 * edit the provider's model catalog, which can be filled from the provider's
 * own model listing.
 *
 * Changes are written with {@link acapLlmSaveConfig}, which notifies every
 * other view of the config (for example the agent panel).
 */
export class AcUiLlmSettingsDialog extends AcUiDialog {
  /** ID of the dialog-specific style element. */
  public static readonly settingsStyleId = 'ml-llm-settings-styles'

  private static openInstance: AcUiLlmSettingsDialog | null = null

  private config: AcApLlmConfig
  private mode: SettingsMode
  private builtinId: AcApLlmBuiltinProviderId
  private customId: string
  private builtinDraft: AcApLlmProviderConfig
  private customDraft: AcApLlmProviderConfig
  private showAdvanced: boolean

  private fetching = false
  private fetchError = ''
  private candidates: AcApLlmDiscoveredModel[] | null = null
  /** Candidate ids whose checkbox the user flipped from its default. */
  private flipped = new Set<string>()
  private candidateQuery = ''
  private fetchAbort: AbortController | undefined
  private statusMessage = ''

  /** Refreshes text and state that depend on the drafts, without rebuilding. */
  private updaters: Array<() => void> = []

  /**
   * Opens the dialog, or returns the promise of the one already open.
   *
   * @param options - Host element.
   * @returns Promise that resolves when the dialog is closed.
   */
  static async open(options: AcUiLlmSettingsDialogOptions = {}): Promise<void> {
    if (AcUiLlmSettingsDialog.openInstance) {
      return AcUiLlmSettingsDialog.openInstance.show()
    }
    const config = await acapLlmLoadConfig()
    const dialog = new AcUiLlmSettingsDialog(config, options)
    AcUiLlmSettingsDialog.openInstance = dialog
    return dialog.show()
  }

  private constructor(
    config: AcApLlmConfig,
    options: AcUiLlmSettingsDialogOptions
  ) {
    super({
      host: options.host,
      title: llmT('title'),
      closeLabel: llmT('close'),
      dialogClassName: 'ml-llm-settings-dialog'
    })
    AcUiLlmSettingsDialog.ensureSettingsStyles()

    this.config = config
    const activeId = config.activeProviderId
    this.mode = acapLlmIsBuiltinProviderId(activeId) ? 'builtin' : 'custom'
    this.builtinId = acapLlmIsBuiltinProviderId(activeId)
      ? activeId
      : 'deepseek'
    this.customId =
      this.storedProvider(activeId)?.kind === 'custom'
        ? activeId
        : (this.customProviders()[0]?.id ?? '')
    this.builtinDraft = this.loadBuiltin(this.builtinId)
    this.customDraft = this.loadCustom(this.customId)
    this.showAdvanced = this.builtinDraft.baseUrl.trim().length > 0

    this.render()
    // Start on the model picker so keyboard users land inside the dialog.
    const first = this.bodyEl.querySelector<HTMLElement>('select, input')
    if (first) this.focusAfterOpen(first)
  }

  /**
   * Closes the dialog. Asks first when the provider editor holds unsaved
   * edits.
   */
  override close(): void {
    if (
      AcUiLlmSettingsDialog.openInstance === this &&
      this.isDirty() &&
      !window.confirm(llmT('discardChangesConfirm'))
    ) {
      return
    }
    if (AcUiLlmSettingsDialog.openInstance === this) {
      AcUiLlmSettingsDialog.openInstance = null
    }
    this.fetchAbort?.abort()
    super.close()
  }

  // --- Draft state ----------------------------------------------------------

  private storedProvider(id: string): AcApLlmProviderConfig | undefined {
    return this.config.providers.find(provider => provider.id === id)
  }

  private customProviders(): AcApLlmProviderConfig[] {
    return this.config.providers.filter(provider => provider.kind === 'custom')
  }

  private loadBuiltin(id: AcApLlmBuiltinProviderId): AcApLlmProviderConfig {
    return cloneProvider(
      this.storedProvider(id) ?? acapLlmCreateBuiltinProvider(id)
    )
  }

  private loadCustom(id: string): AcApLlmProviderConfig {
    const stored = id ? this.storedProvider(id) : undefined
    return cloneProvider(stored ?? acapLlmCreateCustomProvider())
  }

  private get draft(): AcApLlmProviderConfig {
    return this.mode === 'builtin' ? this.builtinDraft : this.customDraft
  }

  private isNewCustom(): boolean {
    return this.mode === 'custom' && !this.storedProvider(this.customId)
  }

  /** Whether the provider being edited differs from its saved copy. */
  private isDirty(): boolean {
    const saved =
      this.mode === 'builtin'
        ? (this.storedProvider(this.builtinId) ??
          acapLlmCreateBuiltinProvider(this.builtinId))
        : (this.storedProvider(this.customId) ?? acapLlmCreateCustomProvider())
    return !acapLlmAreProvidersEqual(this.draft, saved)
  }

  private displayModels(): readonly AcApLlmModelEntry[] {
    return acapLlmEffectiveModels(this.draft)
  }

  /** Writes a new catalog, turning inherited defaults into an override. */
  private setModels(models: AcApLlmModelEntry[]) {
    this.draft.models = models
  }

  private fetchBlockedReason(): string {
    if (!acapLlmEffectiveBaseUrl(this.draft)) return llmT('fetchNeedsBaseUrl')
    if (!this.draft.apiKey.trim()) return llmT('fetchNeedsKey')
    return ''
  }

  private providerIdError(): string {
    if (!this.isNewCustom()) return ''
    const id = this.customDraft.id
    if (!id) return ''
    if (!ACAP_LLM_CUSTOM_PROVIDER_ID_PATTERN.test(id)) {
      return llmT('providerIdInvalid')
    }
    if (acapLlmIsBuiltinProviderId(id) || this.storedProvider(id)) {
      return llmT('providerIdTaken')
    }
    return ''
  }

  private baseUrlError(): string {
    const url = this.draft.baseUrl.trim()
    return url && !isHttpUrl(url) ? llmT('baseUrlInvalid') : ''
  }

  /** First unmet requirement, shown above the footer; empty when savable. */
  private validationMessage(): string {
    if (this.providerIdError() || this.baseUrlError()) return ''
    if (this.mode === 'custom') {
      if (!this.customDraft.id) return llmT('needsProviderId')
      if (!this.customDraft.baseUrl.trim()) return llmT('needsBaseUrl')
    }
    if (!cleanModels(this.displayModels()).length) return llmT('needsModels')
    return ''
  }

  private canSave(): boolean {
    return (
      !this.fetching &&
      !this.candidates &&
      !this.providerIdError() &&
      !this.baseUrlError() &&
      !this.validationMessage()
    )
  }

  // --- Rendering ------------------------------------------------------------

  /** Rebuilds the whole dialog content from the current state. */
  private render() {
    this.updaters = []
    // Provider fields and the model catalog sit side by side (stacked on
    // narrow screens) so the dialog fits without scrolling.
    const provider = h('div', 'ml-llm-column')
    provider.append(
      h('div', 'ml-llm-section-title', llmT('providerSettings')),
      ...this.renderEditor()
    )
    const catalog = h('div', 'ml-llm-column')
    catalog.appendChild(this.renderCatalog())
    const columns = h('div', 'ml-llm-columns')
    columns.append(provider, catalog)
    this.bodyEl.replaceChildren(
      this.renderActiveModel(),
      h('div', 'ml-llm-divider'),
      columns
    )
    this.footerEl.replaceChildren(...this.renderFooter())
    this.refresh()
  }

  /** Re-runs every updater registered by the last {@link render}. */
  private refresh() {
    for (const update of this.updaters) update()
  }

  /** Called after every draft edit: clears the saved notice and refreshes. */
  private onDraftEdited() {
    this.statusMessage = ''
    this.refresh()
  }

  /** Creates an element whose text follows `text`, hidden while empty. */
  private watchedText<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className: string,
    text: () => string
  ): HTMLElementTagNameMap[K] {
    const element = h(tag, className)
    this.updaters.push(() => {
      const value = text()
      element.textContent = value
      element.hidden = !value
    })
    return element
  }

  /**
   * Creates an error line that replaces a hint while `error` is non-empty.
   */
  private errorOrHint(error: () => string, hint: string): HTMLElement[] {
    const errorEl = this.watchedText('p', 'ml-llm-error', error)
    const hintEl = h('p', 'ml-llm-hint', hint)
    this.updaters.push(() => {
      hintEl.hidden = !!error()
    })
    return [errorEl, hintEl]
  }

  private renderActiveModel(): HTMLElement {
    const section = h('section', 'ml-llm-section')
    const select = h('select')
    const groups = acapLlmModelChoices(this.config)
    for (const group of groups) {
      const optgroup = h('optgroup')
      optgroup.label = group.label
      for (const choice of group.options) {
        const option = h('option', '', choice.label)
        option.value = `${choice.providerId}${MODEL_VALUE_SEPARATOR}${choice.modelId}`
        optgroup.appendChild(option)
      }
      select.appendChild(optgroup)
    }
    select.value = `${this.config.activeProviderId}${MODEL_VALUE_SEPARATOR}${this.config.activeModel}`
    select.addEventListener('change', () => {
      void this.selectActiveModel(select.value)
    })
    section.appendChild(field(llmT('activeModel'), select))

    const hasKey = this.config.providers.some(provider =>
      provider.apiKey.trim()
    )
    if (!hasKey) {
      section.appendChild(h('p', 'ml-llm-warning', llmT('activeModelNone')))
    } else if (!acapLlmResolveVisionSettings(this.config)) {
      section.appendChild(h('p', 'ml-llm-warning', llmT('visionMissing')))
    }
    section.appendChild(h('p', 'ml-llm-hint', llmT('activeModelHint')))
    return section
  }

  private renderEditor(): HTMLElement[] {
    const tabs = h('div', 'ml-llm-segmented')
    tabs.setAttribute('role', 'tablist')
    for (const [mode, key] of [
      ['builtin', 'tabBuiltin'],
      ['custom', 'tabCustom']
    ] as const) {
      const tab = button('ml-llm-segmented-item', llmT(key), () =>
        this.switchMode(mode)
      )
      tab.setAttribute('role', 'tab')
      tab.setAttribute('aria-selected', String(this.mode === mode))
      if (this.mode === mode) tab.classList.add('is-active')
      tabs.appendChild(tab)
    }
    const intro = h(
      'p',
      'ml-llm-hint',
      llmT(this.mode === 'builtin' ? 'builtinIntro' : 'customIntro')
    )
    return [
      tabs,
      intro,
      ...(this.mode === 'builtin'
        ? this.renderBuiltinFields()
        : this.renderCustomFields())
    ]
  }

  private renderBuiltinFields(): HTMLElement[] {
    const draft = this.builtinDraft
    const providerSelect = h('select')
    for (const id of ACAP_LLM_BUILTIN_PROVIDER_IDS) {
      const label = acapLlmBuiltinProviderLabel(id)
      const option = h(
        'option',
        '',
        this.storedProvider(id)?.apiKey.trim()
          ? `${label} · ${llmT('providerConfigured')}`
          : label
      )
      option.value = id
      providerSelect.appendChild(option)
    }
    providerSelect.value = this.builtinId
    providerSelect.addEventListener('change', () => {
      const id = providerSelect.value
      if (!acapLlmIsBuiltinProviderId(id)) return
      this.resetFetch()
      this.builtinId = id
      this.builtinDraft = this.loadBuiltin(id)
      this.showAdvanced = this.builtinDraft.baseUrl.trim().length > 0
      this.statusMessage = ''
      this.render()
    })

    const apiKey = textInput(
      draft.apiKey,
      value => {
        draft.apiKey = value
        this.onDraftEdited()
      },
      {
        type: 'password',
        secret: true,
        placeholder: llmT('apiKeyPlaceholder')
      }
    )
    const keyWarning = this.watchedText('p', 'ml-llm-warning', () =>
      draft.apiKey.trim() ? '' : llmT('apiKeyRequired')
    )

    const disclosure = button('ml-llm-disclosure', '', () => {
      this.showAdvanced = !this.showAdvanced
      this.render()
    })
    disclosure.setAttribute('aria-expanded', String(this.showAdvanced))
    disclosure.append(
      svgIcon(
        ICON_CHEVRON,
        `ml-llm-disclosure-icon${this.showAdvanced ? ' is-open' : ''}`
      ),
      document.createTextNode(llmT('advancedSettings'))
    )

    const elements: HTMLElement[] = [
      field(llmT('provider'), providerSelect),
      field(llmT('apiKey'), apiKey),
      keyWarning,
      disclosure
    ]
    if (this.showAdvanced) {
      const defaultUrl = ACAP_LLM_BUILTIN_PROVIDERS[this.builtinId].baseUrl
      const group = h('div', 'ml-llm-group')
      group.append(
        field(
          llmT('baseUrl'),
          textInput(
            draft.baseUrl,
            value => {
              draft.baseUrl = value
              this.onDraftEdited()
            },
            { placeholder: defaultUrl }
          )
        ),
        ...this.errorOrHint(
          () => this.baseUrlError(),
          llmT('baseUrlDefault', { url: defaultUrl })
        )
      )
      if (this.builtinId === 'deepseek-vl') {
        group.appendChild(h('p', 'ml-llm-hint', llmT('providerDeepseekVlHint')))
      }
      elements.push(group)
    }
    return elements
  }

  private renderCustomFields(): HTMLElement[] {
    const draft = this.customDraft
    const elements: HTMLElement[] = []

    const customProviders = this.customProviders()
    if (customProviders.length) {
      const select = h('select')
      for (const provider of customProviders) {
        const option = h('option', '', acapLlmProviderLabel(provider))
        option.value = provider.id
        select.appendChild(option)
      }
      const newOption = h('option', '', llmT('newCustomProvider'))
      newOption.value = ''
      select.appendChild(newOption)
      select.value = this.customId
      select.addEventListener('change', () => {
        this.resetFetch()
        this.customId = select.value
        this.customDraft = this.loadCustom(this.customId)
        this.statusMessage = ''
        this.render()
      })
      elements.push(field(llmT('customProvider'), select))
    }

    const idInput = textInput(
      draft.id,
      value => {
        draft.id = value.trim()
        this.onDraftEdited()
      },
      { placeholder: 'acme-gateway', secret: true }
    )
    idInput.disabled = !this.isNewCustom()
    const displayName = textInput(
      draft.displayName ?? '',
      value => {
        draft.displayName = value
        this.onDraftEdited()
      },
      { placeholder: llmT('displayName') }
    )

    const protocol = h('select')
    for (const value of ACAP_LLM_API_PROTOCOLS) {
      const option = h('option', '', llmT(PROTOCOL_LABEL_KEYS[value]))
      option.value = value
      protocol.appendChild(option)
    }
    protocol.value = draft.protocol
    protocol.addEventListener('change', () => {
      draft.protocol = protocol.value as AcApLlmApiProtocol
      this.onDraftEdited()
    })

    const apiKey = textInput(
      draft.apiKey,
      value => {
        draft.apiKey = value
        this.onDraftEdited()
      },
      {
        type: 'password',
        secret: true,
        placeholder: llmT('apiKeyPlaceholder')
      }
    )

    // Short fields share a row to keep the dialog within the screen height.
    elements.push(
      fieldRow(
        field(llmT('providerId'), idInput),
        field(llmT('displayName'), displayName)
      ),
      ...this.errorOrHint(() => this.providerIdError(), llmT('providerIdHint')),
      field(
        llmT('baseUrl'),
        textInput(
          draft.baseUrl,
          value => {
            draft.baseUrl = value
            this.onDraftEdited()
          },
          { placeholder: 'https://gateway.example/v1' }
        )
      ),
      ...this.errorOrHint(() => this.baseUrlError(), llmT('baseUrlHint')),
      fieldRow(field(llmT('protocol'), protocol), field(llmT('apiKey'), apiKey))
    )
    return elements
  }

  private renderCatalog(): HTMLElement {
    const section = h('section', 'ml-llm-catalog')
    section.setAttribute('aria-label', llmT('models'))

    const head = h('div', 'ml-llm-catalog-head')
    const heading = h('div', 'ml-llm-catalog-heading')
    heading.appendChild(h('span', 'ml-llm-field-label', llmT('models')))
    if (this.mode === 'builtin') {
      heading.appendChild(
        this.watchedText('span', 'ml-llm-meta', () =>
          llmT(
            this.builtinDraft.models === null
              ? 'modelsDefault'
              : 'modelsCustomized'
          )
        )
      )
    }
    const actions = h('div', 'ml-llm-catalog-actions')
    if (this.mode === 'builtin') {
      const reset = button('ml-llm-link-btn', llmT('resetModels'), () => {
        this.closePicker()
        this.builtinDraft.models = null
        this.statusMessage = ''
        this.render()
      })
      this.updaters.push(() => {
        reset.hidden = this.builtinDraft.models === null
        reset.disabled = this.fetching
      })
      actions.appendChild(reset)
    }
    const fetchButton = button('ml-llm-link-btn', '', () => {
      void this.fetchModels()
    })
    this.updaters.push(() => {
      const blocked = this.fetchBlockedReason()
      fetchButton.textContent = llmT(this.fetching ? 'fetching' : 'fetchModels')
      fetchButton.disabled = this.fetching || !!blocked || !!this.candidates
      fetchButton.title = blocked
    })
    actions.appendChild(fetchButton)
    head.append(heading, actions)
    section.appendChild(head)

    section.append(
      ...(this.candidates ? this.renderPicker() : this.renderModelRows()),
      this.watchedText('p', 'ml-llm-error', () => this.fetchError)
    )
    return section
  }

  private renderModelRows(): HTMLElement[] {
    const models = this.displayModels()
    if (!models.length) {
      return [h('div', 'ml-llm-empty', llmT('modelsEmpty'))]
    }
    const list = h('ul', 'ml-llm-model-rows')
    models.forEach((model, index) => {
      const row = h('li', 'ml-llm-model-row')
      const vision = h('input')
      vision.type = 'checkbox'
      vision.checked = model.vision

      const id = textInput(model.id, value => {
        const previous = this.displayModels()[index]
        const nextVision = acapLlmVisionAfterIdEdit(previous, value)
        vision.checked = nextVision
        this.updateModel(index, { id: value, vision: nextVision })
      })
      id.className = 'ml-llm-model-id'
      id.title = model.name ?? model.id
      id.placeholder = llmT('modelId')
      id.setAttribute('aria-label', `${llmT('modelId')} ${index + 1}`)

      vision.addEventListener('change', () =>
        this.updateModel(index, { vision: vision.checked })
      )
      const visionLabel = h('label', 'ml-llm-model-vision')
      visionLabel.title = llmT('modelVisionHint')
      visionLabel.append(vision, document.createTextNode(llmT('modelVision')))

      const remove = button('ml-llm-model-remove', '', () => {
        this.setModels(
          this.displayModels()
            .filter((_, at) => at !== index)
            .map(entry => ({ ...entry }))
        )
        this.statusMessage = ''
        this.render()
      })
      remove.title = llmT('removeModel')
      remove.setAttribute('aria-label', `${llmT('removeModel')} ${index + 1}`)
      remove.appendChild(svgIcon(ICON_CLOSE))

      row.append(id, visionLabel, remove)
      list.appendChild(row)
    })
    return [list, this.renderAddModelButton()]
  }

  private renderAddModelButton(): HTMLElement {
    const add = button(
      'ml-ui-dialog-btn ml-ui-dialog-btn-secondary ml-llm-add-model',
      '',
      () => {
        this.setModels([
          ...this.displayModels().map(model => ({ ...model })),
          { id: '', vision: false }
        ])
        this.statusMessage = ''
        this.render()
        const inputs =
          this.bodyEl.querySelectorAll<HTMLInputElement>('.ml-llm-model-id')
        inputs[inputs.length - 1]?.focus()
      }
    )
    add.append(svgIcon(ICON_PLUS), document.createTextNode(llmT('addModel')))
    return add
  }

  private updateModel(index: number, patch: Partial<AcApLlmModelEntry>) {
    this.setModels(
      this.displayModels().map((model, at) =>
        at === index ? { ...model, ...patch } : { ...model }
      )
    )
    this.onDraftEdited()
  }

  // --- Model listing picker ------------------------------------------------

  private renderPicker(): HTMLElement[] {
    const picker = h('div', 'ml-llm-picker')

    const title = h('div', 'ml-llm-picker-title', llmT('fetchTitle'))
    title.appendChild(
      this.watchedText('span', 'ml-llm-meta', () => this.pickedSummary())
    )

    const toolbar = h('div', 'ml-llm-picker-toolbar')
    const list = h('div')
    const search = textInput(
      this.candidateQuery,
      value => {
        this.candidateQuery = value
        this.renderPickerList(list)
        this.refresh()
      },
      { type: 'search', placeholder: llmT('fetchSearch') }
    )
    search.setAttribute('aria-label', llmT('fetchSearch'))
    const toggleAll = button('ml-llm-link-btn', '', () => {
      this.toggleVisibleCandidates()
      this.renderPickerList(list)
      this.refresh()
    })
    this.updaters.push(() => {
      toggleAll.textContent = llmT(
        this.allVisiblePicked() ? 'fetchDeselectAll' : 'fetchSelectAll'
      )
      toggleAll.disabled = !this.visibleCandidates().length
    })
    toolbar.append(search, toggleAll)
    this.renderPickerList(list)

    const footer = h('div', 'ml-llm-picker-footer')
    const adopt = button('ml-ui-dialog-btn', llmT('fetchAdopt'), () => {
      const picked = this.pickedModels()
      if (!picked.length) return
      this.setModels(picked)
      this.closePicker()
      this.statusMessage = ''
      this.render()
    })
    this.updaters.push(() => {
      const empty = !this.pickedModels().length
      adopt.disabled = empty
      adopt.title = empty ? llmT('fetchKeepOne') : ''
    })
    footer.append(
      button(
        'ml-ui-dialog-btn ml-ui-dialog-btn-secondary',
        llmT('cancel'),
        () => {
          this.closePicker()
          this.render()
        }
      ),
      adopt
    )

    picker.append(title, toolbar, list, footer)
    return [picker]
  }

  private renderPickerList(container: HTMLElement) {
    const visible = this.visibleCandidates()
    if (!visible.length) {
      container.replaceChildren(h('p', 'ml-llm-empty', llmT('fetchNoMatches')))
      return
    }
    const list = h('ul', 'ml-llm-picker-list')
    for (const candidate of visible) {
      const item = h('li')
      const label = h('label', 'ml-llm-picker-item')
      const checkbox = h('input')
      checkbox.type = 'checkbox'
      checkbox.checked = this.isPicked(candidate.id)
      checkbox.addEventListener('change', () => {
        if (!this.flipped.delete(candidate.id)) this.flipped.add(candidate.id)
        this.refresh()
      })
      const id = h('span', 'ml-llm-picker-id', candidate.id)
      id.title = candidate.name ?? candidate.id
      label.append(checkbox, id)
      item.appendChild(label)
      list.appendChild(item)
    }
    container.replaceChildren(list)
  }

  private configuredIds(): Set<string> {
    return new Set(
      this.displayModels()
        .map(model => model.id)
        .filter(Boolean)
    )
  }

  // The picker opens with the current catalog checked, so confirming adds the
  // newly checked candidates and drops the unchecked ones in one step. With an
  // empty catalog every candidate starts checked.
  private pickedByDefault(id: string, configured = this.configuredIds()) {
    return configured.size === 0 || configured.has(id)
  }

  private isPicked(id: string, configured = this.configuredIds()): boolean {
    return this.pickedByDefault(id, configured) !== this.flipped.has(id)
  }

  private visibleCandidates(): AcApLlmDiscoveredModel[] {
    const query = this.candidateQuery.trim().toLowerCase()
    const all = this.candidates ?? []
    if (!query) return all
    return all.filter(
      candidate =>
        candidate.id.toLowerCase().includes(query) ||
        !!candidate.name?.toLowerCase().includes(query)
    )
  }

  private allVisiblePicked(): boolean {
    const visible = this.visibleCandidates()
    const configured = this.configuredIds()
    return (
      visible.length > 0 &&
      visible.every(candidate => this.isPicked(candidate.id, configured))
    )
  }

  /** "checked / listed" counter shown next to the picker title. */
  private pickedSummary(): string {
    const all = this.candidates ?? []
    const configured = this.configuredIds()
    const picked = all.filter(candidate =>
      this.isPicked(candidate.id, configured)
    ).length
    return `${picked} / ${all.length}`
  }

  /** Checks or clears only the visible candidates, never hidden ones. */
  private toggleVisibleCandidates() {
    const target = !this.allVisiblePicked()
    const configured = this.configuredIds()
    for (const candidate of this.visibleCandidates()) {
      if (this.pickedByDefault(candidate.id, configured) === target) {
        this.flipped.delete(candidate.id)
      } else {
        this.flipped.add(candidate.id)
      }
    }
  }

  /** Catalog that confirming the picker would produce. */
  private pickedModels(): AcApLlmModelEntry[] {
    const candidates = this.candidates ?? []
    const configured = this.configuredIds()
    const listed = new Set(candidates.map(candidate => candidate.id))
    // Rows the listing does not name (typed by hand) are outside the picker and stay.
    const kept = this.displayModels()
      .filter(
        model => !listed.has(model.id) || this.isPicked(model.id, configured)
      )
      .map(model => ({ ...model }))
    const keptIds = new Set(kept.map(model => model.id))
    const added = candidates
      .filter(
        candidate =>
          this.isPicked(candidate.id, configured) && !keptIds.has(candidate.id)
      )
      .map(candidate => ({
        id: candidate.id,
        ...(candidate.name ? { name: candidate.name } : {}),
        vision: acapLlmGuessModelVision(candidate.id)
      }))
    return [...kept, ...added]
  }

  private closePicker() {
    this.candidates = null
    this.flipped = new Set()
    this.candidateQuery = ''
  }

  /**
   * Drops an in-flight fetch, its error and the picker, so a listing requested
   * for one provider never lands in another provider's catalog.
   */
  private resetFetch() {
    this.fetchAbort?.abort()
    this.fetchAbort = undefined
    this.fetching = false
    this.fetchError = ''
    this.closePicker()
  }

  private listingErrorMessage(error: unknown): string {
    if (!(error instanceof AcApLlmModelListingError)) {
      return llmT('fetchFailedFormat')
    }
    if (error.code === 'network') {
      return llmT('fetchFailedNetwork', { url: error.url })
    }
    if (error.code === 'http') {
      return llmT('fetchFailedHttp', { status: String(error.status ?? '') })
    }
    return llmT('fetchFailedFormat')
  }

  private async fetchModels() {
    if (this.fetching || this.fetchBlockedReason()) return
    this.fetchAbort?.abort()
    const abort = new AbortController()
    this.fetchAbort = abort
    this.fetching = true
    this.fetchError = ''
    this.refresh()
    try {
      const found = await acapLlmFetchAvailableModels(
        {
          protocol: this.draft.protocol,
          baseUrl: acapLlmEffectiveBaseUrl(this.draft),
          apiKey: this.draft.apiKey
        },
        undefined,
        abort.signal
      )
      if (abort.signal.aborted) return
      if (!found.length) {
        this.fetchError = llmT('fetchEmpty')
        return
      }
      this.flipped = new Set()
      this.candidateQuery = ''
      this.candidates = found
    } catch (error) {
      if (!abort.signal.aborted)
        this.fetchError = this.listingErrorMessage(error)
    } finally {
      if (this.fetchAbort === abort) {
        this.fetching = false
        this.fetchAbort = undefined
        this.render()
      }
    }
  }

  // --- Mode, save and delete -----------------------------------------------

  private switchMode(next: SettingsMode) {
    if (next === this.mode) return
    this.resetFetch()
    this.mode = next
    this.statusMessage = ''
    this.render()
  }

  private renderFooter(): HTMLElement[] {
    const elements: HTMLElement[] = []
    if (this.mode === 'custom' && !this.isNewCustom()) {
      elements.push(
        button(
          'ml-ui-dialog-btn ml-ui-dialog-btn-secondary ml-llm-danger',
          llmT('deleteProvider'),
          () => void this.deleteProvider()
        )
      )
    }
    // Validation and "saved" notices share the footer row with the buttons.
    const message = h('div', 'ml-llm-footer-message')
    message.append(
      this.watchedText('span', 'ml-llm-validation', () =>
        this.validationMessage()
      ),
      this.watchedText('span', 'ml-llm-status', () => this.statusMessage)
    )
    elements.push(message)
    elements.push(
      button('ml-ui-dialog-btn ml-ui-dialog-btn-secondary', llmT('close'), () =>
        this.close()
      )
    )
    const save = button(
      'ml-ui-dialog-btn',
      llmT(this.isNewCustom() ? 'createProvider' : 'save'),
      () => void this.save()
    )
    this.updaters.push(() => {
      save.disabled = !this.canSave()
    })
    elements.push(save)
    return elements
  }

  /** Persists a new config, reloads the drafts from it and re-renders. */
  private async commit(next: AcApLlmConfig) {
    this.config = next
    await acapLlmSaveConfig(next)
    this.builtinDraft = this.loadBuiltin(this.builtinId)
    this.customDraft = this.loadCustom(this.customId)
    this.statusMessage = llmT('saved')
    this.render()
  }

  private async save() {
    if (!this.canSave()) return
    const draft = this.draft
    const provider: AcApLlmProviderConfig = {
      ...draft,
      id: draft.id.trim(),
      displayName: draft.displayName?.trim(),
      baseUrl: draft.baseUrl.trim(),
      apiKey: draft.apiKey.trim(),
      models: draft.models ? cleanModels(draft.models) : null
    }
    if (provider.kind === 'builtin') delete provider.displayName
    if (provider.kind === 'custom') this.customId = provider.id
    await this.commit(acapLlmUpsertProvider(this.config, provider))
  }

  private async deleteProvider() {
    const id = this.customId
    if (!this.storedProvider(id)) return
    if (!window.confirm(llmT('deleteProviderConfirm', { id }))) return
    const next = acapLlmRemoveProvider(this.config, id)
    this.customId =
      next.providers.find(provider => provider.kind === 'custom')?.id ?? ''
    await this.commit(next)
  }

  private async selectActiveModel(value: string) {
    const separator = value.indexOf(MODEL_VALUE_SEPARATOR)
    if (separator < 0) return
    const activeProviderId = value.slice(0, separator)
    const activeModel = value.slice(separator + MODEL_VALUE_SEPARATOR.length)
    if (
      activeProviderId === this.config.activeProviderId &&
      activeModel === this.config.activeModel
    ) {
      return
    }
    this.config = { ...this.config, activeProviderId, activeModel }
    await acapLlmSaveConfig(this.config)
    this.statusMessage = llmT('saved')
    this.render()
  }

  /** Injects the dialog styles once per document. */
  private static ensureSettingsStyles(): void {
    if (document.getElementById(AcUiLlmSettingsDialog.settingsStyleId)) return
    const style = document.createElement('style')
    style.id = AcUiLlmSettingsDialog.settingsStyleId
    style.textContent = LLM_SETTINGS_STYLES
    document.head.appendChild(style)
  }
}
