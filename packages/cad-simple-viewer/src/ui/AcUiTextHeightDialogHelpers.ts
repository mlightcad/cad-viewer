/**
 * Shared helpers for opening the text-height dialog and matching CAD text height.
 *
 * @module AcUiTextHeightDialogHelpers
 * @packageDocumentation
 */

import { AcDbMText, AcDbText } from '@mlightcad/data-model'

import { AcApDocManager } from '../app/AcApDocManager'
import { acapWcsToScreenPx } from '../command/overlay/AcApOverlayDrawUtil'
import {
  AcEdPromptEntityOptions,
  AcEdPromptStatus
} from '../editor'
import { resolveUiTheme } from '../editor/global/AcEdUiTheme'
import { AcApI18n } from '../i18n'
import type { AcTrView2d } from '../view'
import {
  AcUiTextHeightDialog,
  type AcUiTextHeightDialogResult,
  type AcUiTextHeightMode
} from './AcUiTextHeightDialog'

/** Reads WCS text height from a CAD text or mtext entity. */
export function acuiEntityTextHeightWcs(entity: unknown): number | null {
  if (entity instanceof AcDbText || entity instanceof AcDbMText) {
    const height = entity.height
    return height > 0 && Number.isFinite(height) ? height : null
  }
  const maybe = entity as { height?: number } | null
  if (maybe && typeof maybe.height === 'number' && maybe.height > 0) {
    return maybe.height
  }
  return null
}

/**
 * Prompts the user to pick a Text / MText entity and returns its WCS height.
 *
 * @param view - Active view (unused; DocManager editor is used).
 * @returns WCS height, or `null` when cancelled / invalid.
 */
export async function acuiMatchTextHeightFromEntity(
  _view: AcTrView2d
): Promise<number | null> {
  const prompt = new AcEdPromptEntityOptions(
    AcApI18n.t('main.textHeight.matchPrompt')
  )
  prompt.addAllowedClass('AcDbText')
  prompt.addAllowedClass('AcDbMText')
  prompt.addAllowedClass('Text')
  prompt.addAllowedClass('MText')
  prompt.setRejectMessage(AcApI18n.t('main.textHeight.matchReject'))

  const result = await AcApDocManager.instance.editor.getEntity(prompt)
  if (result.status !== AcEdPromptStatus.OK || !result.objectId) return null

  const entity =
    AcApDocManager.instance.curDocument.database.tables.blockTable.getEntityById(
      result.objectId
    )
  return acuiEntityTextHeightWcs(entity)
}

/** Options for {@link acuiOpenTextHeightDialogForKind}. */
export interface AcUiOpenTextHeightDialogOptions {
  view: AcTrView2d
  initialMode: AcUiTextHeightMode
  initialFontSizePx: number
  initialTextHeightWcs?: number
}

/**
 * Opens the shared text-height dialog with i18n labels and match-height wiring.
 */
export async function acuiOpenTextHeightDialog(
  options: AcUiOpenTextHeightDialogOptions
): Promise<AcUiTextHeightDialogResult | null> {
  return AcUiTextHeightDialog.open({
    host: options.view.container,
    theme: resolveUiTheme(options.view.container),
    initialMode: options.initialMode,
    initialFontSizePx: options.initialFontSizePx,
    initialTextHeightWcs: options.initialTextHeightWcs,
    labels: {
      title: AcApI18n.t('main.textHeight.title'),
      close: AcApI18n.t('main.textHeight.close'),
      ok: AcApI18n.t('main.textHeight.ok'),
      cancel: AcApI18n.t('main.textHeight.cancel'),
      adaptive: AcApI18n.t('main.textHeight.adaptive'),
      custom: AcApI18n.t('main.textHeight.custom'),
      customPlaceholder: AcApI18n.t('main.textHeight.customPlaceholder'),
      match: AcApI18n.t('main.textHeight.match'),
      matchPrompt: AcApI18n.t('main.textHeight.matchPrompt')
    },
    onMatchHeight: () => acuiMatchTextHeightFromEntity(options.view)
  })
}

/**
 * Converts a dialog result into fontSize / WCS fields for style application.
 */
export function acuiResolveTextHeightPatch(
  view: AcTrView2d,
  result: AcUiTextHeightDialogResult,
  fallbackFontSizePx: number
): {
  textHeightMode: AcUiTextHeightMode
  fontSize: number
  textHeightWcs?: number
} {
  if (result.mode === 'custom' && result.textHeightWcs != null) {
    const fontSize = Math.max(
      1,
      Math.round(acapWcsToScreenPx(result.textHeightWcs, view))
    )
    return {
      textHeightMode: 'custom',
      fontSize,
      textHeightWcs: result.textHeightWcs
    }
  }
  return {
    textHeightMode: 'adaptive',
    fontSize: fallbackFontSizePx
  }
}
