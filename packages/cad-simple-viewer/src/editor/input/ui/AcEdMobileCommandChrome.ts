import {
  ACAP_DOCS_PATH_MAGNIFIER,
  acapDocsUrl
} from '../../../app/AcApDocsUrl'
import { AcApI18n } from '../../../i18n/AcApI18n'
import {
  type AcUiMobileSessionMetricTexts,
  AcUiMobileSessionPanel,
  type AcUiMobileSessionPanelLabels
} from '../../../ui/AcUiMobileSessionPanel'
import {
  acedIsMobileUiLayout,
  acedSubscribeUiLayout
} from '../../global/AcEdUiLayout'
import { acedInteractionStrategy } from './AcEdInteractionStrategy'
import type { AcEdMobileSessionMetrics } from './AcEdMobileSessionMetrics'

/** Keyword chip shown on the mobile session panel. */
export interface AcEdMobileKeywordChip {
  /** Text shown on the chip. */
  displayName: string
  /** Canonical keyword token passed to {@link AcEdMobileCommandChromeCallbacks.onKeyword}. */
  globalName: string
  /** When false the chip is visible but not tappable. */
  enabled: boolean
}

/** Formatted metric strings ready to display. */
export type AcEdMobileMetricTexts = AcUiMobileSessionMetricTexts

/**
 * Callbacks for the mobile command chrome.
 *
 * `onConfirm` is empty-Enter / `allowNone` (panel ✓). Typed coordinate commit
 * is a separate future path (numeric keypad) and must not use `onConfirm`.
 */
export interface AcEdMobileCommandChromeCallbacks {
  /** Panel ✓ — empty Enter / None. */
  onConfirm: () => void
  /** Panel × — Escape. */
  onCancel: () => void
  /** Keyword chip tap. */
  onKeyword: (globalName: string) => void
}

/** Session content pushed into {@link AcEdMobileCommandChrome.show}. */
export interface AcEdMobileCommandChromeState {
  /** Prompt text (without `[keywords]`). */
  prompt: string
  /** Visible keyword chips. */
  keywords: AcEdMobileKeywordChip[]
  /** Enables the ✓ button (maps to empty Enter). */
  allowNone: boolean
  /** When false, the metric row is hidden (typed-only numeric prompts). */
  showMetrics: boolean
}

/**
 * Phone/pad replacement for the desktop command line and Dynamic Input.
 *
 * Thin editor-facing wrapper around {@link AcUiMobileSessionPanel}.
 */
export class AcEdMobileCommandChrome {
  private readonly panel: AcUiMobileSessionPanel
  private localeUnsub?: () => void

  /**
   * @param host - View container that receives the overlay (and CSS variables).
   */
  constructor(host: HTMLElement) {
    this.panel = new AcUiMobileSessionPanel({
      host,
      isPhoneLayout: acedIsMobileUiLayout,
      subscribeLayout: acedSubscribeUiLayout,
      helpDocsUrl: () =>
        acapDocsUrl(ACAP_DOCS_PATH_MAGNIFIER, AcApI18n.currentLocale),
      labels: () => chromeLabels()
    })
    AcApI18n.events.localeChanged.addEventListener(this.boundRelabel)
    this.localeUnsub = () => {
      AcApI18n.events.localeChanged.removeEventListener(this.boundRelabel)
    }
  }

  private readonly boundRelabel = () => this.panel.refreshLabels()

  /** Whether the chrome is currently shown. */
  get isOpen(): boolean {
    return this.panel.isOpen
  }

  /**
   * Shows the chrome for an input session. No-op on desktop layouts.
   *
   * @param state - Prompt, keywords, and metric visibility for the session.
   * @param callbacks - Confirm / cancel / keyword handlers.
   */
  show(
    state: AcEdMobileCommandChromeState,
    callbacks: AcEdMobileCommandChromeCallbacks
  ): void {
    if (!acedInteractionStrategy().point.usesSessionChrome) {
      this.hide()
      return
    }
    this.panel.show(
      {
        prompt: state.prompt,
        allowNone: state.allowNone,
        showMetrics: state.showMetrics,
        keywords: state.keywords.map(kw => ({
          displayName: kw.displayName,
          id: kw.globalName,
          enabled: kw.enabled
        }))
      },
      {
        onConfirm: callbacks.onConfirm,
        onCancel: callbacks.onCancel,
        onKeyword: callbacks.onKeyword
      }
    )
  }

  /**
   * Updates prompt / keywords / ✓ without tearing down the session.
   *
   * @param partial - Fields to update; omitted fields keep their current values.
   */
  update(partial: Partial<AcEdMobileCommandChromeState>): void {
    this.panel.update({
      prompt: partial.prompt,
      allowNone: partial.allowNone,
      showMetrics: partial.showMetrics,
      keywords: partial.keywords?.map(kw => ({
        displayName: kw.displayName,
        id: kw.globalName,
        enabled: kw.enabled
      }))
    })
  }

  /**
   * Pushes live metric values. Phase 1 displays them read-only; the metric
   * buttons stay disabled as a hook for the numeric keypad.
   *
   * @param metrics - Live numeric metrics including base-point state.
   * @param texts - Formatted strings for display.
   */
  setMetrics(metrics: AcEdMobileSessionMetrics, texts: AcEdMobileMetricTexts) {
    this.panel.setMetrics(metrics.hasBasePoint, texts)
  }

  /** Hides the chrome and clears session callbacks. */
  hide(): void {
    this.panel.hide()
  }

  /** Removes DOM and locale listeners. */
  dispose(): void {
    this.localeUnsub?.()
    this.panel.dispose()
  }

  /** Mount slot for custom session accessories (left of the help icon). */
  get accessoryHost(): HTMLElement {
    return this.panel.accessoryHost
  }

  /** Shows the mobile accessory row (custom content slot + help). */
  prepareAccessory(): void {
    this.panel.prepareAccessory()
  }

  /**
   * Clears custom session accessory content without removing the help icon.
   * The row stays visible while the panel is open.
   */
  clearAccessory(): void {
    this.panel.clearAccessory()
  }
}

function chromeLabels(): AcUiMobileSessionPanelLabels {
  const t = (key: string) => AcApI18n.t(key)
  return {
    length: t('main.mobileCommand.length'),
    angle: t('main.mobileCommand.angle'),
    dx: t('main.mobileCommand.dx'),
    dy: t('main.mobileCommand.dy'),
    x: t('main.mobileCommand.x'),
    y: t('main.mobileCommand.y'),
    confirm: t('main.mobileCommand.confirm'),
    cancel: t('main.mobileCommand.cancel'),
    help: t('main.mobileCommand.help'),
    back: t('main.mobileCommand.back'),
    collapse: t('main.mobileCommand.collapse'),
    expand: t('main.mobileCommand.expand')
  }
}
