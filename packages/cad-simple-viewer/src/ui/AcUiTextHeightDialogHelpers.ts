/**
 * Shared helpers for opening the text-height dialog.
 *
 * @module AcUiTextHeightDialogHelpers
 * @packageDocumentation
 */

import { acapScreenPxToWcs, acapWcsToScreenPx } from '../command/overlay/AcApOverlayDrawUtil'
import { resolveUiTheme } from '../editor/global/AcEdUiTheme'
import { AcApI18n } from '../i18n'
import type { AcTrView2d } from '../view'
import {
  AcUiTextHeightDialog,
  type AcUiTextHeightDialogResult,
  type AcUiTextHeightMode
} from './AcUiTextHeightDialog'

/** Options for {@link acuiOpenTextHeightDialog}. */
export interface AcUiOpenTextHeightDialogOptions {
  view: AcTrView2d
  initialMode: AcUiTextHeightMode
  initialFontSizePx: number
  initialTextHeightWcs?: number
}

/**
 * Opens the shared text-height dialog with i18n labels and screen→WCS conversion.
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
    screenPxToWcs: px => acapScreenPxToWcs(px, options.view),
    labels: {
      title: AcApI18n.t('main.textHeight.title'),
      close: AcApI18n.t('main.textHeight.close'),
      ok: AcApI18n.t('main.textHeight.ok'),
      cancel: AcApI18n.t('main.textHeight.cancel'),
      adaptive: AcApI18n.t('main.textHeight.adaptive'),
      custom: AcApI18n.t('main.textHeight.custom'),
      customPlaceholder: AcApI18n.t('main.textHeight.customPlaceholder'),
      fromScreen: AcApI18n.t('main.textHeight.fromScreen'),
      fromScreenHint: AcApI18n.t('main.textHeight.fromScreenHint'),
      screenPxPlaceholder: AcApI18n.t('main.textHeight.screenPxPlaceholder'),
      screenUnit: AcApI18n.t('main.textHeight.screenUnit'),
      convert: AcApI18n.t('main.textHeight.convert')
    }
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
