import { AcApI18n } from '../../i18n/AcApI18n'
import { AcUiDialog } from '../../ui/AcUiDialog'
import type {
  AcApDataSource,
  AcApDataSourceAuthState,
  AcApDataSourceFile
} from './AcApDataSource'

/** Built-in URL data source id. */
export const ACAP_URL_DATA_SOURCE_ID = 'url'

/**
 * Compact dialog that asks the user for a drawing file URL.
 */
class AcApUrlOpenDialog extends AcUiDialog {
  private static openInstance: AcApUrlOpenDialog | null = null
  private resolveFn: ((url: string | null) => void) | null = null
  private readonly input: HTMLInputElement

  private constructor(host: HTMLElement) {
    super({
      host,
      title: AcApI18n.t('main.dataSource.urlDialogTitle'),
      closeLabel: AcApI18n.t('main.dataSource.cancel'),
      titleId: 'ml-ui-url-open-title',
      dialogClassName: 'ml-ui-url-open-dialog',
      layoutWidth: false
    })

    const hint = document.createElement('p')
    hint.className = 'ml-ui-url-open-hint'
    hint.textContent = AcApI18n.t('main.dataSource.urlDialogHint')
    this.bodyEl.appendChild(hint)

    this.input = document.createElement('input')
    this.input.type = 'url'
    this.input.className = 'ml-ui-url-open-input'
    this.input.placeholder = AcApI18n.t('main.dataSource.urlPlaceholder')
    this.input.autocomplete = 'off'
    this.input.spellcheck = false
    this.bodyEl.appendChild(this.input)

    const cancelBtn = document.createElement('button')
    cancelBtn.type = 'button'
    cancelBtn.className = 'ml-ui-dialog-btn ml-ui-dialog-btn-secondary'
    cancelBtn.textContent = AcApI18n.t('main.dataSource.cancel')
    cancelBtn.addEventListener('click', () => this.finish(null))

    const okBtn = document.createElement('button')
    okBtn.type = 'button'
    okBtn.className = 'ml-ui-dialog-btn'
    okBtn.textContent = AcApI18n.t('main.dataSource.open')
    okBtn.addEventListener('click', () => this.submit())

    this.footerEl.appendChild(cancelBtn)
    this.footerEl.appendChild(okBtn)

    this.input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault()
        this.submit()
      }
    })

    AcApUrlOpenDialog.ensureUrlStyles()
  }

  static open(host: HTMLElement = document.body): Promise<string | null> {
    AcApUrlOpenDialog.openInstance?.finish(null)
    const dialog = new AcApUrlOpenDialog(host)
    AcApUrlOpenDialog.openInstance = dialog
    return new Promise(resolve => {
      dialog.resolveFn = resolve
      void dialog.show().then(() => {
        dialog.input.focus()
      })
    })
  }

  override close(): void {
    this.finish(null)
  }

  private submit(): void {
    const value = this.input.value.trim()
    if (!value) {
      this.input.focus()
      return
    }
    this.finish(value)
  }

  private finish(url: string | null): void {
    if (AcApUrlOpenDialog.openInstance === this) {
      AcApUrlOpenDialog.openInstance = null
    }
    const resolve = this.resolveFn
    this.resolveFn = null
    super.close()
    resolve?.(url)
  }

  private static stylesInjected = false

  private static ensureUrlStyles(): void {
    if (AcApUrlOpenDialog.stylesInjected) return
    if (typeof document === 'undefined') return
    if (document.getElementById('ml-ui-url-open-dialog-styles')) {
      AcApUrlOpenDialog.stylesInjected = true
      return
    }
    const style = document.createElement('style')
    style.id = 'ml-ui-url-open-dialog-styles'
    style.textContent = `
.ml-ui-url-open-hint {
  margin: 0 0 12px;
  font-size: 13px;
  opacity: 0.85;
  line-height: 1.4;
}
.ml-ui-url-open-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid var(--ml-ui-border, #c0c4cc);
  border-radius: 4px;
  background: var(--ml-ui-surface, #fff);
  color: inherit;
  font-size: 14px;
}
.ml-ui-url-open-input:focus {
  outline: 2px solid var(--ml-ui-accent, #409eff);
  outline-offset: 1px;
}
`
    document.head.appendChild(style)
    AcApUrlOpenDialog.stylesInjected = true
  }
}

/**
 * Built-in data source that opens a drawing from an HTTP(S) URL.
 */
export class AcApUrlDataSource implements AcApDataSource {
  readonly id = ACAP_URL_DATA_SOURCE_ID
  readonly labelKey = 'main.dataSource.url'
  readonly requiresAuth = false
  readonly requiresUserGesture = false

  getAuthState(): AcApDataSourceAuthState {
    return 'none'
  }

  async signIn(): Promise<void> {
    // no-op
  }

  async signOut(): Promise<void> {
    // no-op
  }

  async pick(): Promise<AcApDataSourceFile | null> {
    const url = await AcApUrlOpenDialog.open()
    if (!url) return null
    const name = fileNameFromUrl(url)
    return { name, url }
  }
}

function fileNameFromUrl(url: string): string {
  try {
    const pathname = new URL(url, window.location.href).pathname
    const segment = pathname.split('/').filter(Boolean).pop()
    if (segment && /\.(dwg|dxf)$/i.test(segment)) {
      return decodeURIComponent(segment)
    }
  } catch {
    // fall through
  }
  return 'drawing.dxf'
}
