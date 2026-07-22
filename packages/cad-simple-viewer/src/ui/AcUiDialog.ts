import {
  applyUiTheme,
  type AcEdUiTheme,
  resolveUiTheme
} from '../editor/global/AcEdUiTheme'

/**
 * Options for constructing a {@link AcUiDialog}.
 */
export interface AcUiDialogOptions {
  /**
   * Host element that receives the backdrop.
   * @defaultValue `document.body`
   */
  host?: HTMLElement

  /** Dialog title shown in the header. */
  title: string

  /**
   * Accessible label for the header close button.
   * @defaultValue `"Close"`
   */
  closeLabel?: string

  /**
   * Optional `id` for the title element (used by `aria-labelledby`).
   * @defaultValue auto-generated unique id
   */
  titleId?: string

  /**
   * Extra CSS class names applied to the dialog panel.
   */
  dialogClassName?: string

  /**
   * Whether clicking the backdrop closes the dialog.
   * @defaultValue `true`
   */
  closeOnBackdrop?: boolean

  /**
   * Whether pressing Escape closes the dialog.
   * @defaultValue `true`
   */
  closeOnEscape?: boolean

  /**
   * UI theme tokens applied to the backdrop.
   * When omitted, resolved from the host / document via {@link resolveUiTheme}.
   */
  theme?: AcEdUiTheme
}

/**
 * Framework-free modal dialog base built with pure HTML and CSS.
 *
 * Subclasses fill {@link bodyEl} / {@link footerEl} and call {@link show}.
 */
export class AcUiDialog {
  /** ID of the shared base style element. */
  public static readonly styleId = 'ml-ui-dialog-styles'

  private static stylesInjected = false
  private static nextTitleId = 0

  /** Full-screen backdrop containing the dialog panel. */
  protected readonly backdrop: HTMLDivElement

  /** Dialog panel element. */
  protected readonly dialog: HTMLDivElement

  /** Scrollable / main content container below the header. */
  protected readonly bodyEl: HTMLDivElement

  /** Optional footer row (e.g. action buttons). */
  protected readonly footerEl: HTMLDivElement

  /** Title text element in the header. */
  protected readonly titleEl: HTMLDivElement

  private readonly onKeyDown: (event: KeyboardEvent) => void
  private readonly closeOnEscape: boolean
  private resolve?: () => void
  private openPromise?: Promise<void>
  private disposed = false

  /**
   * Builds backdrop, header, body, and footer shell (not yet shown as a promise).
   *
   * @param options - Title, host, and close behavior
   */
  constructor(options: AcUiDialogOptions) {
    AcUiDialog.ensureStyles()

    const host = options.host ?? document.body
    const titleId =
      options.titleId ?? `ml-ui-dialog-title-${AcUiDialog.nextTitleId++}`
    this.closeOnEscape = options.closeOnEscape ?? true

    this.backdrop = document.createElement('div')
    this.backdrop.className = 'ml-ui-dialog-backdrop'
    applyUiTheme(options.theme ?? resolveUiTheme(host), this.backdrop)
    if (options.closeOnBackdrop ?? true) {
      this.backdrop.addEventListener('mousedown', event => {
        if (event.target === this.backdrop) this.close()
      })
    }

    this.dialog = document.createElement('div')
    this.dialog.className = ['ml-ui-dialog', options.dialogClassName]
      .filter(Boolean)
      .join(' ')
    this.dialog.setAttribute('role', 'dialog')
    this.dialog.setAttribute('aria-modal', 'true')
    this.dialog.setAttribute('aria-labelledby', titleId)
    this.dialog.addEventListener('mousedown', event => event.stopPropagation())

    const header = document.createElement('div')
    header.className = 'ml-ui-dialog-header'

    this.titleEl = document.createElement('div')
    this.titleEl.id = titleId
    this.titleEl.className = 'ml-ui-dialog-title'
    this.titleEl.textContent = options.title

    const closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.className = 'ml-ui-dialog-close'
    closeBtn.setAttribute('aria-label', options.closeLabel ?? 'Close')
    closeBtn.textContent = '×'
    closeBtn.addEventListener('click', () => this.close())

    header.appendChild(this.titleEl)
    header.appendChild(closeBtn)

    this.bodyEl = document.createElement('div')
    this.bodyEl.className = 'ml-ui-dialog-body'

    this.footerEl = document.createElement('div')
    this.footerEl.className = 'ml-ui-dialog-footer'

    this.dialog.appendChild(header)
    this.dialog.appendChild(this.bodyEl)
    this.dialog.appendChild(this.footerEl)
    this.backdrop.appendChild(this.dialog)
    host.appendChild(this.backdrop)

    this.onKeyDown = (event: KeyboardEvent) => {
      if (!this.closeOnEscape) return
      if (event.key === 'Escape') {
        event.preventDefault()
        this.close()
      }
    }
    window.addEventListener('keydown', this.onKeyDown)
  }

  /**
   * Returns a promise that resolves when the dialog is closed.
   * Safe to call multiple times; subsequent calls return the same promise.
   */
  show(): Promise<void> {
    if (!this.openPromise) {
      this.openPromise = new Promise(resolve => {
        this.resolve = resolve
      })
    }
    return this.openPromise
  }

  /**
   * Closes the dialog, removes DOM, and resolves the {@link show} promise.
   * Safe to call multiple times.
   */
  close(): void {
    if (this.disposed) return
    this.disposed = true

    window.removeEventListener('keydown', this.onKeyDown)
    if (this.backdrop.parentNode) {
      this.backdrop.parentNode.removeChild(this.backdrop)
    }
    this.resolve?.()
    this.resolve = undefined
  }

  /**
   * Focuses an element after the current microtask (once the dialog is in the DOM).
   *
   * @param element - Element to focus
   */
  protected focusAfterOpen(element: HTMLElement): void {
    queueMicrotask(() => element.focus())
  }

  /**
   * Injects shared dialog chrome CSS once per document.
   */
  static ensureStyles(): void {
    if (AcUiDialog.stylesInjected) return
    if (document.getElementById(AcUiDialog.styleId)) {
      AcUiDialog.stylesInjected = true
      return
    }

    const style = document.createElement('style')
    style.id = AcUiDialog.styleId
    style.textContent = `
.ml-ui-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10050;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ml-ui-overlay, rgba(0, 0, 0, 0.45));
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.ml-ui-dialog {
  width: min(360px, calc(100vw - 32px));
  box-sizing: border-box;
  padding: 16px 18px 14px;
  border-radius: 10px;
  border: 1px solid var(--ml-ui-border, #dcdfe6);
  background: var(--ml-ui-bg, #ffffff);
  color: var(--ml-ui-text, #303133);
  box-shadow: var(--ml-ui-shadow, 0 8px 28px rgba(0, 0, 0, 0.28));
}

.ml-ui-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.ml-ui-dialog-title {
  font-size: 14px;
  font-weight: 600;
}

.ml-ui-dialog-close {
  border: none;
  background: transparent;
  color: var(--ml-ui-text-muted, #606266);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 2px 6px;
}

.ml-ui-dialog-body {
  min-width: 0;
}

.ml-ui-dialog-footer:empty {
  display: none;
}

.ml-ui-dialog-footer:not(:empty) {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  gap: 8px;
}

.ml-ui-dialog-btn {
  min-width: 72px;
  padding: 6px 14px;
  border-radius: 4px;
  border: 1px solid var(--ml-ui-accent, #0b84ff);
  background: var(--ml-ui-accent, #0b84ff);
  color: #fff;
  cursor: pointer;
  font-size: 12px;
}

.ml-ui-dialog-btn:hover {
  filter: brightness(1.05);
}
`.trim()
    document.head.appendChild(style)
    AcUiDialog.stylesInjected = true
  }
}
