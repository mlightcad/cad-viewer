import type { AcDbParsingTaskStats, AcDbProgressdEventArgs } from '@mlightcad/data-model'

import { eventBus } from '../../editor/global/eventBus'
import { AcApFontUtil } from '../../util/AcApFontUtil'
import { acapAnalyzeUnsupportedDrawing } from '../../util/AcApAnalyzeUnsupportedDrawing'
import { acapFormatFontsMissedReplacement } from '../../util/AcApFormatFontMissedMessage'
import {
  acapFormatUnsupportedEntitiesMessage,
  acapI18nTranslate
} from '../../util/AcApFormatUnsupportedEntitiesMessage'
import {
  acapFormatOpenFileErrorMessage,
  acapFormatOpenFileErrorTitle
} from '../../util/AcApOpenFileErrorMessage'
import type {
  AcApDocManager,
  AcDbDocumentEventArgs
} from '../AcApDocManager'
import type { AcApNotificationCenter } from './AcApNotificationTypes'

/**
 * Subscribes to engine events and forwards user-visible alerts into the active
 * {@link AcApNotificationCenter}.
 *
 * Shared by the built-in DOM center and host overrides (e.g. cad-viewer).
 * Notifications are tagged with the current {@link AcApDocSession.id}.
 */
export class AcApNotificationEventBridge {
  private readonly _docManager: AcApDocManager
  private _getCenter: () => AcApNotificationCenter
  /** Parser unknown-entity counts keyed by {@link AcApDocSession.id}. */
  private readonly _pendingUnknownBySession = new Map<string, number>()
  /**
   * Sessions that already received an unsupported-entity pass for the current
   * open. Prevents tab switches from clearing and re-scanning (and from
   * dropping warnings that depended solely on the one-shot PARSE stats).
   */
  private readonly _unsupportedNotifiedSessions = new Set<string>()
  private _installed = false

  private sessionOptions(): { sessionId: string } | Record<string, never> {
    const sessionId = this._docManager.activeSessionId
    return sessionId ? { sessionId } : {}
  }

  private syncActiveSession() {
    this._getCenter().setActiveSession(this._docManager.activeSessionId)
  }

  private forgetSession(sessionId: string) {
    this._pendingUnknownBySession.delete(sessionId)
    this._unsupportedNotifiedSessions.delete(sessionId)
  }

  private readonly _onMessage = (params: {
    message: string
    type: 'info' | 'warning' | 'error' | 'success'
  }) => {
    const center = this._getCenter()
    const title =
      params.type === 'error'
        ? acapI18nTranslate('main.notification.title.systemError')
        : params.type === 'warning'
          ? acapI18nTranslate('main.notification.title.systemWarning')
          : params.type === 'success'
            ? acapI18nTranslate('main.notification.title.systemMessage')
            : acapI18nTranslate('main.notification.title.systemInfo')
    const options = this.sessionOptions()
    switch (params.type) {
      case 'error':
        center.error(title, params.message, options)
        break
      case 'warning':
        center.warning(title, params.message, options)
        break
      case 'success':
        center.success(title, params.message, options)
        break
      default:
        center.info(title, params.message, options)
        break
    }
  }

  private readonly _onFontsNotLoaded = (params: {
    fonts: { fontName: string; url: string }[]
  }) => {
    const fontNames = params.fonts.map(font => font.fontName)
    this._getCenter().error(
      acapI18nTranslate('main.notification.title.fontNotLoaded'),
      acapI18nTranslate('main.message.fontsNotLoaded', {
        fonts: acapFormatFontsMissedReplacement(fontNames)
      }),
      { source: 'font-missed', fontNames, persistent: true, ...this.sessionOptions() }
    )
  }

  private readonly _onFontsNotFound = (params: { fonts: string[] }) => {
    this._getCenter().warning(
      acapI18nTranslate('main.notification.title.fontNotFound'),
      acapI18nTranslate('main.message.fontsNotFound', {
        fonts: acapFormatFontsMissedReplacement(params.fonts)
      }),
      { source: 'font-missed', fontNames: params.fonts, ...this.sessionOptions() }
    )
  }

  private readonly _onFontNotFound = (params: {
    fontName: string
    count: number
  }) => {
    const fontName = params.fontName.trim()
    if (!fontName) return
    const center = this._getCenter()
    center.removeWhere(
      notification =>
        notification.source === 'font-missed' &&
        notification.fontNames?.includes(fontName) === true
    )
    center.warning(
      acapI18nTranslate('main.notification.title.fontNotFound'),
      acapI18nTranslate('main.message.fontMissedInDrawing', {
        font: fontName,
        count: params.count,
        replacementFont: AcApFontUtil.getReplacementFontName(fontName)
      }),
      { source: 'font-missed', fontNames: [fontName], ...this.sessionOptions() }
    )
  }

  private readonly _onMissedDataChanged = () => {
    const missedFonts = Object.keys(
      this._docManager.curView.missedData.fonts
    )
    this._getCenter().removeResolvedFontMissedNotifications(missedFonts)
  }

  private readonly _onFailedToGetFonts = (params: { url: string }) => {
    this._getCenter().error(
      acapI18nTranslate('main.notification.title.systemError'),
      acapI18nTranslate('main.message.failedToGetAvaiableFonts', {
        url: params.url
      }),
      this.sessionOptions()
    )
  }

  private readonly _onFailedToOpenFile = (params: {
    fileName: string
    errorCode?: Parameters<typeof acapFormatOpenFileErrorTitle>[0]
    errorMessage?: string
  }) => {
    this._getCenter().error(
      acapFormatOpenFileErrorTitle(params.errorCode),
      acapFormatOpenFileErrorMessage(params),
      this.sessionOptions()
    )
  }

  private readonly _onOpenFileProgress = (data: AcDbProgressdEventArgs) => {
    if (
      data.stage === 'CONVERSION' &&
      data.subStage === 'PARSE' &&
      data.subStageStatus === 'END' &&
      data.data
    ) {
      const stats = data.data as AcDbParsingTaskStats
      const sessionId = this._docManager.activeSessionId
      if (sessionId) {
        this._pendingUnknownBySession.set(
          sessionId,
          stats.unknownEntityCount ?? 0
        )
      }
    }
  }

  private readonly _onDocumentToBeOpened = () => {
    this.syncActiveSession()
    const sessionId = this._docManager.activeSessionId
    if (sessionId) {
      this.forgetSession(sessionId)
      this._pendingUnknownBySession.set(sessionId, 0)
    }
    this._getCenter().removeBySource('unsupported-entities')
  }

  private readonly _onDocumentCreated = () => {
    this.syncActiveSession()
  }

  private readonly _onDocumentActivated = () => {
    this.syncActiveSession()
    const sessionId = this._docManager.activeSessionId
    // Tab switch / re-activate: keep the existing unsupported warning and skip
    // another full-database proxy scan.
    if (sessionId && this._unsupportedNotifiedSessions.has(sessionId)) {
      return
    }
    this.notifyUnsupportedEntities()
  }

  private readonly _onDocumentToBeDestroyed = (args: AcDbDocumentEventArgs) => {
    const session = this._docManager.sessionFor(args.doc)
    if (session) {
      this.forgetSession(session.id)
      this._getCenter().clearSession(session.id)
    }
  }

  constructor(
    docManager: AcApDocManager,
    getCenter: () => AcApNotificationCenter
  ) {
    this._docManager = docManager
    this._getCenter = getCenter
  }

  install() {
    if (this._installed) return
    this._installed = true

    this.syncActiveSession()

    eventBus.on('message', this._onMessage)
    eventBus.on('fonts-not-loaded', this._onFontsNotLoaded)
    eventBus.on('fonts-not-found', this._onFontsNotFound)
    eventBus.on('font-not-found', this._onFontNotFound)
    eventBus.on('missed-data-changed', this._onMissedDataChanged)
    eventBus.on('failed-to-get-avaiable-fonts', this._onFailedToGetFonts)
    eventBus.on('failed-to-open-file', this._onFailedToOpenFile)
    eventBus.on('open-file-progress', this._onOpenFileProgress)

    this._docManager.events.documentToBeOpened.addEventListener(
      this._onDocumentToBeOpened
    )
    this._docManager.events.documentCreated.addEventListener(
      this._onDocumentCreated
    )
    this._docManager.events.documentActivated.addEventListener(
      this._onDocumentActivated
    )
    this._docManager.events.documentToBeDestroyed.addEventListener(
      this._onDocumentToBeDestroyed
    )
  }

  uninstall() {
    if (!this._installed) return
    this._installed = false

    eventBus.off('message', this._onMessage)
    eventBus.off('fonts-not-loaded', this._onFontsNotLoaded)
    eventBus.off('fonts-not-found', this._onFontsNotFound)
    eventBus.off('font-not-found', this._onFontNotFound)
    eventBus.off('missed-data-changed', this._onMissedDataChanged)
    eventBus.off('failed-to-get-avaiable-fonts', this._onFailedToGetFonts)
    eventBus.off('failed-to-open-file', this._onFailedToOpenFile)
    eventBus.off('open-file-progress', this._onOpenFileProgress)

    this._docManager.events.documentToBeOpened.removeEventListener(
      this._onDocumentToBeOpened
    )
    this._docManager.events.documentCreated.removeEventListener(
      this._onDocumentCreated
    )
    this._docManager.events.documentActivated.removeEventListener(
      this._onDocumentActivated
    )
    this._docManager.events.documentToBeDestroyed.removeEventListener(
      this._onDocumentToBeDestroyed
    )

    this._pendingUnknownBySession.clear()
    this._unsupportedNotifiedSessions.clear()
  }

  private notifyUnsupportedEntities() {
    const doc = this._docManager.curDocument
    if (!doc) return

    const sessionId = this._docManager.activeSessionId
    const unknownCount = sessionId
      ? (this._pendingUnknownBySession.get(sessionId) ?? 0)
      : 0

    const classOnly = acapAnalyzeUnsupportedDrawing(doc.database, unknownCount, {
      scanProxies: false
    })
    const analysis =
      classOnly.isTianzhengDrawing || classOnly.unknownEntityCount > 0
        ? classOnly
        : acapAnalyzeUnsupportedDrawing(doc.database, unknownCount, {
            scanProxies: true
          })

    if (sessionId) {
      this._unsupportedNotifiedSessions.add(sessionId)
    }

    const center = this._getCenter()
    center.removeBySource('unsupported-entities')
    if (!analysis.shouldWarn) return

    center.warning(
      acapI18nTranslate('main.notification.title.parsingWarning'),
      acapFormatUnsupportedEntitiesMessage(analysis),
      {
        source: 'unsupported-entities',
        persistent: true,
        ...this.sessionOptions()
      }
    )
  }
}
