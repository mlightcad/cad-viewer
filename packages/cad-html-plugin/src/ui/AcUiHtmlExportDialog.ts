import {
  AcApDocManager,
  AcApI18n,
  AcEdCommand,
  AcEdCommandStack,
  AcUiDialog,
  acuiFormButton,
  acuiFormChoiceCards,
  acuiFormHint,
  acuiFormNumber,
  acuiFormRadios,
  acuiFormSection,
  acuiFormSplit,
  acuiFormStack,
  acuiFormToggle,
  AcUiTabs
} from '@mlightcad/cad-simple-viewer'

import type { AcApHtmlExportOptions } from '../AcApHtmlExportOptions.js'

/**
 * Matches {@link ACEX_MIN_CHUNK_SIZE_MIB}, {@link ACEX_MAX_CHUNK_SIZE_MIB}
 * and {@link ACEX_DEFAULT_CHUNK_SIZE_MIB}. Duplicated so this dialog stays
 * off the heavy plugin graph; OK still clamps through those functions.
 */
const CHUNK_MIN = 1
const CHUNK_MAX = 64
const CHUNK_DEFAULT = 10

const PASSWORD_CHARS =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

const STYLE_ID = 'ml-html-export-dialog-styles'

type HtmlFormat = 'single' | 'multi'
type HtmlBackground = 'black' | 'white' | 'space'
type HtmlInitialView = 'fit' | 'current'
type HtmlViewerMode = 'view' | 'measure'
type HtmlExpiry = '1' | '7' | '30' | 'custom' | 'never'

function t(key: string): string {
  return AcApI18n.t(`dialog.exportHtmlDlg.${key}`)
}

function buttonLabel(key: 'ok' | 'cancel' | 'close'): string {
  if (key === 'close') return AcApI18n.t('main.about.close')
  return AcApI18n.t(`main.textHeight.${key}`)
}

function defaultCustomExpiresAt(): Date {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setSeconds(0, 0)
  return date
}

function toDatetimeLocal(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

function startOfTodayLocal(): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return toDatetimeLocal(today)
}

/** `datetime-local` has no timezone. Parse it as local time, not UTC. */
function fromDatetimeLocal(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!match) return null
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    0,
    0
  )
  return Number.isNaN(date.getTime()) ? null : date
}

function swatch(kind: 'black' | 'white' | 'space'): HTMLSpanElement {
  const el = document.createElement('span')
  el.className = `ml-html-export-swatch ml-html-export-swatch--${kind}`
  return el
}

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
.ml-html-export-swatch {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  flex: 0 0 auto;
}
.ml-html-export-swatch--black { background: #111; }
.ml-html-export-swatch--white { background: #fff; }
.ml-html-export-swatch--space {
  background: linear-gradient(90deg, #111 50%, #fff 50%);
}
.ml-html-export-password {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ml-html-export-password .ml-ui-form-text-input { flex: 1; min-width: 0; }
.ml-html-export-password-actions { display: flex; gap: 6px; flex: 0 0 auto; }
.ml-html-export-custom-expiry { max-width: 220px; }
`.trim()
  document.head.appendChild(style)
}

/**
 * Export HTML dialog (`chtml`).
 *
 * Collects {@link AcApHtmlExportOptions} and, on OK, loads the HTML plugin
 * via `-chtml` then runs {@link AcApHtmlConvertor}. Command-line export
 * without this dialog is `-chtml`.
 */
export class AcUiHtmlExportDialog extends AcUiDialog {
  /** The dialog already on screen, so a second `chtml` does not stack another. */
  private static current: AcUiHtmlExportDialog | undefined

  /**
   * Opens the dialog and returns immediately.
   *
   * The command must not stay active while the dialog is open. A running
   * command makes the next command wait in `cancelActive` until this one
   * finishes, and this dialog does not end when that cancellation arrives.
   */
  static open(): void {
    if (this.current) return
    const dialog = new AcUiHtmlExportDialog()
    this.current = dialog
    void dialog.show().finally(() => {
      if (this.current === dialog) this.current = undefined
    })
  }

  private exportFormat: HtmlFormat = 'single'
  private exportInvisibleLayers = true
  private exportLayouts = true
  private exportEmptyLayouts = false
  private background: HtmlBackground = 'black'
  private initialView: HtmlInitialView = 'fit'
  private viewerMode: HtmlViewerMode = 'measure'
  private chunkSizeMiB = CHUNK_DEFAULT
  private compressChunks = true
  private expiry: HtmlExpiry = 'never'
  private customExpiresAt: Date | null = null
  private password = ''
  private busy = false
  private passwordInput: HTMLInputElement | null = null
  private readonly passwordHost = document.createElement('div')

  constructor() {
    const view = AcApDocManager.instance.curView as
      | { container?: HTMLElement }
      | undefined
    super({
      host: view?.container,
      title: t('title'),
      closeLabel: buttonLabel('close'),
      dialogClassName: 'ml-ui-export-dialog ml-html-export-dialog',
      layoutWidth: false
    })
    ensureStyles()
    this.build()
  }

  private build(): void {
    const tabs = new AcUiTabs({
      tabs: [
        { id: 'data', label: t('tabData'), panel: this.buildData() },
        { id: 'display', label: t('tabDisplay'), panel: this.buildDisplay() },
        {
          id: 'security',
          label: t('tabSecurity'),
          panel: this.buildSecurity()
        }
      ],
      initialId: 'data',
      onChange: id => {
        if (id === 'security') this.ensurePasswordField()
      }
    })
    this.tabs = tabs
    this.bodyEl.append(tabs.root)
    this.footerEl.append(
      acuiFormButton(buttonLabel('ok'), 'primary', () => {
        void this.confirm()
      }),
      acuiFormButton(buttonLabel('cancel'), 'secondary', () => this.close())
    )
  }

  private tabs!: AcUiTabs
  private packageSection!: HTMLElement

  private buildData(): HTMLElement {
    const format = acuiFormSection(t('exportFormat'))
    format.body.append(
      acuiFormChoiceCards<HtmlFormat>(
        [
          {
            value: 'single',
            title: t('exportFormatSingle'),
            hint: t('exportFormatSingleHint')
          },
          {
            value: 'multi',
            title: t('exportFormatMulti'),
            hint: t('exportFormatMultiHint')
          }
        ],
        this.exportFormat,
        value => this.setFormat(value)
      ).root
    )

    const layers = acuiFormSection(t('layersSection'))
    layers.body.append(
      acuiFormToggle({
        label: t('exportInvisibleLayers'),
        hint: t('exportInvisibleLayersHint'),
        checked: this.exportInvisibleLayers,
        yes: t('yes'),
        no: t('no'),
        onChange: checked => {
          this.exportInvisibleLayers = checked
        }
      }).root
    )

    const layouts = acuiFormSection(t('layoutsSection'))
    const empty = acuiFormToggle({
      label: t('exportEmptyLayouts'),
      hint: t('exportEmptyLayoutsHint'),
      checked: this.exportEmptyLayouts,
      yes: t('yes'),
      no: t('no'),
      nested: true,
      onChange: checked => {
        this.exportEmptyLayouts = checked
      }
    })
    empty.root.hidden = !this.exportLayouts
    layouts.body.append(
      acuiFormToggle({
        label: t('exportLayouts'),
        hint: t('exportLayoutsHint'),
        checked: this.exportLayouts,
        yes: t('yes'),
        no: t('no'),
        onChange: checked => {
          this.exportLayouts = checked
          empty.root.hidden = !checked
        }
      }).root,
      empty.root
    )

    const pack = acuiFormSection(t('packageSection'))
    this.packageSection = pack.root
    pack.root.hidden = this.exportFormat !== 'multi'
    const chunk = acuiFormNumber({
      label: t('chunkSizeMiB'),
      hint: t('chunkSizeMiBHint'),
      value: this.chunkSizeMiB,
      min: CHUNK_MIN,
      max: CHUNK_MAX,
      onChange: value => {
        this.chunkSizeMiB = value
      }
    })
    pack.body.append(
      chunk.root,
      acuiFormToggle({
        label: t('compressChunks'),
        hint: t('compressChunksHint'),
        checked: this.compressChunks,
        yes: t('yes'),
        no: t('no'),
        onChange: checked => {
          this.compressChunks = checked
        }
      }).root
    )

    return acuiFormStack(
      format.root,
      acuiFormSplit(layers.root, layouts.root),
      pack.root
    )
  }

  private buildDisplay(): HTMLElement {
    const backgroundHint = acuiFormHint(t('backgroundBlackHint'))
    const paintHint = () => {
      if (this.background === 'white') {
        backgroundHint.textContent = t('backgroundWhiteHint')
      } else if (this.background === 'space') {
        backgroundHint.textContent = t('backgroundSpaceHint')
      } else {
        backgroundHint.textContent = t('backgroundBlackHint')
      }
    }
    const background = acuiFormSection(t('background'))
    background.body.append(
      acuiFormRadios<HtmlBackground>(
        [
          {
            value: 'black',
            label: t('backgroundBlack'),
            title: t('backgroundBlackHint'),
            leading: swatch('black')
          },
          {
            value: 'white',
            label: t('backgroundWhite'),
            title: t('backgroundWhiteHint'),
            leading: swatch('white')
          },
          {
            value: 'space',
            label: t('backgroundSpace'),
            title: t('backgroundSpaceHint'),
            leading: swatch('space')
          }
        ],
        this.background,
        value => {
          this.background = value
          paintHint()
        }
      ).root,
      backgroundHint
    )

    const initial = acuiFormSection(t('initialView'))
    initial.body.append(
      acuiFormChoiceCards<HtmlInitialView>(
        [
          {
            value: 'fit',
            title: t('initialViewExtents'),
            hint: t('initialViewExtentsHint')
          },
          {
            value: 'current',
            title: t('initialViewCurrent'),
            hint: t('initialViewCurrentHint')
          }
        ],
        this.initialView,
        value => {
          this.initialView = value
        }
      ).root
    )

    const viewer = acuiFormSection(t('viewerMode'))
    viewer.body.append(
      acuiFormChoiceCards<HtmlViewerMode>(
        [
          {
            value: 'view',
            title: t('viewerModeView'),
            hint: t('viewerModeViewHint')
          },
          {
            value: 'measure',
            title: t('viewerModeMeasure'),
            hint: t('viewerModeMeasureHint')
          }
        ],
        this.viewerMode,
        value => {
          this.viewerMode = value
        }
      ).root
    )

    return acuiFormStack(background.root, initial.root, viewer.root)
  }

  private buildSecurity(): HTMLElement {
    const expiry = acuiFormSection(t('expirySection'))
    const custom = document.createElement('input')
    custom.type = 'datetime-local'
    custom.className = 'ml-ui-form-text-input ml-html-export-custom-expiry'
    custom.placeholder = t('expiryCustomPlaceholder')
    custom.min = startOfTodayLocal()
    const initial = defaultCustomExpiresAt()
    this.customExpiresAt = initial
    custom.value = toDatetimeLocal(initial)
    custom.hidden = true
    custom.addEventListener('change', () => {
      this.customExpiresAt = fromDatetimeLocal(custom.value)
    })
    expiry.body.append(
      acuiFormRadios<HtmlExpiry>(
        [
          { value: '1', label: t('expiry1Day') },
          { value: '7', label: t('expiry7Days') },
          { value: '30', label: t('expiry30Days') },
          { value: 'custom', label: t('expiryCustom') },
          { value: 'never', label: t('expiryNever') }
        ],
        this.expiry,
        value => {
          this.expiry = value
          custom.hidden = value !== 'custom'
        },
        'grid'
      ).root,
      custom,
      acuiFormHint(t('expiryHint'))
    )

    const password = acuiFormSection(t('passwordSection'))
    // Security tab is lazy: the password input stays out of the DOM until
    // the tab is opened, and readOnly until focus, so password managers
    // cannot autofill or auto-generate into the optional field.
    this.passwordHost.className = 'ml-html-export-password-host'
    password.body.append(this.passwordHost, acuiFormHint(t('passwordHint')))

    const singleOnly = acuiFormHint(t('securitySingleOnlyHint'))
    singleOnly.hidden = true
    this.securitySingleOnly = singleOnly
    this.securityFields = acuiFormStack(expiry.root, password.root)
    return acuiFormStack(singleOnly, this.securityFields)
  }

  private securitySingleOnly!: HTMLElement
  private securityFields!: HTMLElement

  private setFormat(format: HtmlFormat): void {
    this.exportFormat = format
    const multi = format === 'multi'
    this.packageSection.hidden = !multi
    this.tabs.setEnabled('security', !multi)
    this.securityFields.hidden = multi
    this.securitySingleOnly.hidden = !multi
  }

  /**
   * Creates the optional password input the first time Security is shown.
   * `autocomplete="new-password"` plus `readOnly` until focus blocks managers.
   */
  private ensurePasswordField(): void {
    if (this.passwordInput || this.exportFormat === 'multi') return
    const input = document.createElement('input')
    input.type = 'password'
    input.className = 'ml-ui-form-text-input'
    input.autocomplete = 'new-password'
    input.name = 'mlcad-html-export-password'
    input.placeholder = t('passwordPlaceholder')
    input.readOnly = true
    let edited = false
    input.addEventListener('focus', () => {
      edited = true
      input.readOnly = false
    })
    input.addEventListener('input', () => {
      edited = true
      this.password = input.value
      this.syncPasswordActions()
    })
    const generate = acuiFormButton(t('generatePassword'), 'secondary', () => {
      edited = true
      input.readOnly = false
      const bytes = new Uint8Array(12)
      crypto.getRandomValues(bytes)
      input.value = Array.from(
        bytes,
        byte => PASSWORD_CHARS[byte % PASSWORD_CHARS.length]!
      ).join('')
      this.password = input.value
      this.syncPasswordActions()
    })
    const reveal = acuiFormButton(t('showPassword'), 'secondary', () => {
      const hidden = input.type === 'password'
      input.type = hidden ? 'text' : 'password'
      reveal.textContent = t(hidden ? 'hidePassword' : 'showPassword')
    })
    const copy = acuiFormButton(t('copyPassword'), 'secondary', () => {
      void this.copyPassword()
    })
    copy.disabled = true
    this.copyButton = copy
    const actions = document.createElement('div')
    actions.className = 'ml-html-export-password-actions'
    actions.append(generate, reveal, copy)
    const row = document.createElement('div')
    row.className = 'ml-html-export-password'
    row.append(input, actions)
    this.passwordHost.append(row)
    this.passwordInput = input
    requestAnimationFrame(() => {
      if (this.passwordInput !== input || edited) return
      if (!input.value) return
      input.value = ''
      this.password = ''
      input.readOnly = true
      this.syncPasswordActions()
    })
  }

  private syncPasswordActions(): void {
    this.copyButton.disabled = this.password.trim().length === 0
  }

  private copyButton!: HTMLButtonElement

  private async copyPassword(): Promise<void> {
    const password = this.password.trim()
    if (!password) return
    const docManager = AcApDocManager.instance
    try {
      await navigator.clipboard.writeText(password)
      docManager.editor.showMessage(t('copyPasswordSuccess'), 'success')
    } catch {
      docManager.editor.showMessage(t('copyPasswordFailed'), 'error')
    }
  }

  private notify(message: string): void {
    AcApDocManager.instance.editor.showMessage(message, 'error')
  }

  private async confirm(): Promise<void> {
    if (this.busy) return
    if (this.exportFormat === 'single' && this.expiry === 'custom') {
      const at = this.customExpiresAt?.getTime()
      if (at == null || Number.isNaN(at)) {
        this.notify(t('expiryCustomRequired'))
        return
      }
      if (at <= Date.now()) {
        this.notify(t('expiryCustomPast'))
        return
      }
    }

    this.busy = true
    const docManager = AcApDocManager.instance
    const document = docManager.curDocument
    const view = docManager.curView
    const expiryDays =
      this.exportFormat === 'multi'
        ? 'never'
        : this.expiry === '1'
          ? 1
          : this.expiry === '7'
            ? 7
            : this.expiry === '30'
              ? 30
              : this.expiry
    const options: AcApHtmlExportOptions = {
      exportFormat: this.exportFormat,
      exportInvisibleLayers: this.exportInvisibleLayers,
      exportLayouts: this.exportLayouts,
      exportEmptyLayouts: this.exportLayouts ? this.exportEmptyLayouts : false,
      background: this.background,
      initialView: this.initialView,
      viewerMode: this.viewerMode,
      expiryDays,
      expiresAt:
        this.exportFormat === 'single' && this.expiry === 'custom'
          ? (this.customExpiresAt?.getTime() ?? null)
          : null,
      password:
        this.exportFormat === 'single'
          ? this.password.trim() || undefined
          : undefined
    }

    try {
      const loaded = await docManager.pluginManager.loadByTrigger('-chtml')
      if (!loaded) {
        throw new Error(
          'HTML export plugin is not available. Install @mlightcad/cad-html-plugin.'
        )
      }
      const {
        AcApHtmlConvertor,
        acexChunkSizeMiBToBytes,
        clampAcApHtmlChunkSizeMiB,
        getHtmlPluginOptions,
        resolveAcApHtmlExportOptions
      } = await import('@mlightcad/cad-html-plugin')
      if (this.exportFormat === 'multi') {
        options.maxChunkBytes = acexChunkSizeMiBToBytes(
          clampAcApHtmlChunkSizeMiB(this.chunkSizeMiB)
        )
        options.compressChunks = this.compressChunks
      }
      const converter = new AcApHtmlConvertor(getHtmlPluginOptions())
      await converter.convert(
        document.fileName || document.docTitle,
        resolveAcApHtmlExportOptions(options),
        view
      )
      this.close()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      docManager.editor.showMessage(message, 'error')
      this.close()
    } finally {
      this.busy = false
    }
  }
}

/**
 * Opens {@link AcUiHtmlExportDialog}.
 *
 * Registered as `chtml` from the plugin `/register` module when a DOM exists,
 * so the plugin's command-line `chtml` is left for Node hosts.
 */
export class AcApExportHtmlDlgCmd extends AcEdCommand {
  /** Opening the dialog does not edit the database. */
  recordsUndoStack = false

  async execute(): Promise<void> {
    AcUiHtmlExportDialog.open()
  }
}

/**
 * Claims `chtml` for the dialog when this process has a DOM.
 *
 * A second call is a no-op. Node hosts skip this so `onLoad` can register
 * the prompt command.
 */
export function registerHtmlExportDialogCommand(): void {
  if (typeof document === 'undefined') return
  const commandManager = AcApDocManager.instance.commandManager
  if (commandManager.lookupGlobalCmd('chtml')) return
  commandManager.addCommand(
    AcEdCommandStack.SYSTEMT_COMMAND_GROUP_NAME,
    'chtml',
    'chtml',
    new AcApExportHtmlDlgCmd()
  )
}
