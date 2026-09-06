/**
 * Color / text-height controls for the offline HTML session accessory slot.
 *
 * @module AcExSessionDrawStyle
 * @packageDocumentation
 */

import { AcCmColor, AcCmColorUtil } from '@mlightcad/data-model'

import type { AcExSessionAccessory } from './AcExCommandSessionPanel'
import type { AcExHtmlI18n } from './AcExHtmlI18n'
import { acexScreenPxToWcs } from './AcExHtmlOverlayDom'
import {
  AcUiAciColorDialog,
  AcUiTextHeightDialog,
  type AcUiTextHeightDialogResult,
  createIconElement,
  ICON_TEXT_HEIGHT} from './AcExHtmlSimpleViewerUi'

/** Active drawing session that owns the accessory. */
export type AcExDrawStyleKind = 'measure' | 'markup'

/** Style snapshot shown in / written by the accessory. */
export interface AcExDrawStyleValues {
  /** CSS color string. */
  color: string
  /** Badge / text font size in CSS pixels. */
  fontSize: number
  /** Authoring mode. */
  textHeightMode?: 'adaptive' | 'custom'
  /** World-space text height when custom. */
  textHeightWcs?: number
}

/** Partial style update from the accessory controls. */
export interface AcExDrawStylePatch {
  color?: string
  fontSize?: number
  textHeightMode?: 'adaptive' | 'custom'
  textHeightWcs?: number
}

/** Dependencies for {@link setupAcExSessionDrawStyle}. */
export interface AcExSessionDrawStyleContext {
  i18n: AcExHtmlI18n
  /** Current kind, or `undefined` when no draw tool is active. */
  getKind: () => AcExDrawStyleKind | undefined
  /** Style to paint into the controls for the active kind. */
  getStyle: (kind: AcExDrawStyleKind) => AcExDrawStyleValues
  /** Apply a patch to session defaults and any selection for `kind`. */
  applyStyle: (kind: AcExDrawStyleKind, patch: AcExDrawStylePatch) => void
  /**
   * Optional: WCS↔screen conversion for custom height authoring.
   * Used by the text-height dialog calculator and style patches.
   */
  wcsToScreen?: (p: { x: number; y: number }) => { x: number; y: number }
}

const STYLE_ID = 'mlcad-session-style-styles'

const SESSION_STYLE_CSS = `
.mlcad-session-style {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mlcad-session-style__swatch {
  position: relative;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
}
.mlcad-session-style__swatch-fill {
  display: block;
  width: 14px;
  height: 14px;
  margin: 0 auto;
  border-radius: 50%;
  border: 1px solid #999;
}
.mlcad-session-style__text-height {
  width: 28px;
  height: 28px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  cursor: pointer;
  box-sizing: border-box;
}
.mlcad-session-style__text-height .ml-ex-ui-icon {
  display: inline-flex;
  width: 18px;
  height: 18px;
}
.mlcad-session-style__text-height .ml-ex-ui-icon svg {
  width: 18px;
  height: 18px;
}
`

function colorFromAci(index: number): AcCmColor {
  const color = new AcCmColor()
  color.colorIndex = index
  return color
}

function cssColor(color: AcCmColor): string {
  return color.cssColor ?? `rgb(${color.red}, ${color.green}, ${color.blue})`
}

function preferExactAciColor(color: AcCmColor): AcCmColor {
  if (!color.isByColor) return color
  const rgb = color.RGB
  if (rgb == null) return color
  const index = AcCmColorUtil.getIndexByColor(rgb)
  if (index == null) return color
  const aci = new AcCmColor()
  aci.colorIndex = index
  return aci
}

function cssToColor(css: string): AcCmColor {
  const trimmed = css.trim()
  const skipFromString =
    trimmed.startsWith('#') || /^(rgb|rgba|hsl|hsla)\(/i.test(trimmed)
  if (!skipFromString) {
    try {
      const fromString = AcCmColor.fromString(trimmed)
      if (fromString) return preferExactAciColor(fromString)
    } catch {
      // Fall through to setRGBFromCss.
    }
  }
  try {
    return preferExactAciColor(new AcCmColor().setRGBFromCss(trimmed))
  } catch {
    const fallback = new AcCmColor()
    fallback.setRGB(8, 232, 222)
    return fallback
  }
}

function aciIndexOf(color: AcCmColor): number | undefined {
  if (color.isByACI && color.colorIndex != null && color.colorIndex >= 1) {
    return color.colorIndex
  }
  return undefined
}

function ensureStyles(): void {
  if (typeof document === 'undefined') return
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = STYLE_ID
    document.head.appendChild(style)
  }
  style.textContent = SESSION_STYLE_CSS
}

function resolvePatchFromDialog(
  result: AcUiTextHeightDialogResult,
  fallbackFontSize: number,
  wcsToScreen?: (p: { x: number; y: number }) => { x: number; y: number }
): AcExDrawStylePatch {
  if (result.mode === 'custom' && result.textHeightWcs != null) {
    let fontSize = fallbackFontSize
    if (wcsToScreen) {
      const px = acexScreenPxToWcs(1, wcsToScreen)
      if (px > 0) fontSize = Math.max(1, Math.round(result.textHeightWcs / px))
    }
    return {
      textHeightMode: 'custom',
      textHeightWcs: result.textHeightWcs,
      fontSize
    }
  }
  return {
    textHeightMode: 'adaptive',
    fontSize: fallbackFontSize
  }
}

/** Controller returned by {@link setupAcExSessionDrawStyle}. */
export interface AcExSessionDrawStyleController {
  /** Sync controls from the active tool. */
  refresh: () => void
  /** Reapply i18n titles after locale change. */
  refreshLabels: () => void
  /** Color / text-height widgets for the session panel accessory slot. */
  createSessionAccessory: () => AcExSessionAccessory
  /** Tear down DOM listeners. */
  dispose: () => void
}

/**
 * Builds color / text-height controls that mount into the session accessory.
 */
export function setupAcExSessionDrawStyle(
  ctx: AcExSessionDrawStyleContext
): AcExSessionDrawStyleController {
  ensureStyles()

  const controlsRow = document.createElement('div')
  controlsRow.className = 'mlcad-session-style'
  controlsRow.setAttribute('role', 'toolbar')

  const swatch = document.createElement('button')
  swatch.type = 'button'
  swatch.className = 'mlcad-session-style__swatch'
  const swatchFill = document.createElement('span')
  swatchFill.className = 'mlcad-session-style__swatch-fill'
  swatch.appendChild(swatchFill)

  const textHeightButton = document.createElement('button')
  textHeightButton.type = 'button'
  textHeightButton.className = 'mlcad-session-style__text-height'
  textHeightButton.appendChild(createIconElement(ICON_TEXT_HEIGHT))

  let colorDialogOpen = false
  let textHeightDialogOpen = false
  let currentKind: AcExDrawStyleKind | undefined
  let sessionMounted = false
  let currentStyle: AcExDrawStyleValues = { color: '#08e8de', fontSize: 12 }

  controlsRow.append(swatch, textHeightButton)

  const paint = (style: AcExDrawStyleValues) => {
    currentStyle = style
    const color = cssToColor(style.color)
    swatchFill.style.background = cssColor(color)
  }

  const relabel = () => {
    swatch.title = ctx.i18n.t('drawStyle.color')
    textHeightButton.title = ctx.i18n.t('drawStyle.fontSize')
    textHeightButton.setAttribute('aria-label', ctx.i18n.t('drawStyle.fontSize'))
  }

  const refresh = () => {
    currentKind = ctx.getKind()
    if (!currentKind) return
    paint(ctx.getStyle(currentKind))
    relabel()
  }

  const mountSession = (host: HTMLElement) => {
    sessionMounted = true
    host.appendChild(controlsRow)
    refresh()
  }

  const unmountSession = () => {
    if (!sessionMounted) return
    sessionMounted = false
    controlsRow.remove()
  }

  const colorDialogLabels = () => ({
    title: ctx.i18n.t('drawStyle.pickerTitle'),
    close: ctx.i18n.t('drawStyle.close'),
    ok: ctx.i18n.t('drawStyle.ok'),
    cancel: ctx.i18n.t('drawStyle.cancel'),
    index: ctx.i18n.t('drawStyle.index'),
    rgb: ctx.i18n.t('drawStyle.rgb'),
    input: ctx.i18n.t('drawStyle.input'),
    inputPlaceholder: ctx.i18n.t('drawStyle.inputPlaceholder')
  })

  const htmlUiTheme = () =>
    document.documentElement.getAttribute('data-mlcad-theme') === 'light'
      ? ('light' as const)
      : ('dark' as const)

  const openSessionColorDialog = async () => {
    if (colorDialogOpen || !currentKind) return
    colorDialogOpen = true
    try {
      const initial = aciIndexOf(cssToColor(currentStyle.color))
      const index = await AcUiAciColorDialog.open({
        host:
          document.getElementById('mlcad-canvas-host') ?? document.body,
        theme: htmlUiTheme(),
        initialIndex: initial ?? null,
        labels: colorDialogLabels()
      })
      if (index == null || !currentKind) return
      const css = cssColor(colorFromAci(index))
      swatchFill.style.background = css
      ctx.applyStyle(currentKind, { color: css })
    } finally {
      colorDialogOpen = false
    }
  }

  const openTextHeightDialog = async () => {
    if (textHeightDialogOpen || !currentKind) return
    textHeightDialogOpen = true
    try {
      const result = await AcUiTextHeightDialog.open({
        host:
          document.getElementById('mlcad-canvas-host') ?? document.body,
        theme: htmlUiTheme(),
        initialMode: currentStyle.textHeightMode ?? 'adaptive',
        initialFontSizePx: currentStyle.fontSize,
        initialTextHeightWcs: currentStyle.textHeightWcs,
        screenPxToWcs: (px: number) =>
          ctx.wcsToScreen
            ? acexScreenPxToWcs(px, ctx.wcsToScreen)
            : px,
        labels: {
          title: ctx.i18n.t('textHeight.title'),
          close: ctx.i18n.t('textHeight.close'),
          ok: ctx.i18n.t('textHeight.ok'),
          cancel: ctx.i18n.t('textHeight.cancel'),
          adaptive: ctx.i18n.t('textHeight.adaptive'),
          custom: ctx.i18n.t('textHeight.custom'),
          customPlaceholder: ctx.i18n.t('textHeight.customPlaceholder'),
          fromScreen: ctx.i18n.t('textHeight.fromScreen'),
          fromScreenHint: ctx.i18n.t('textHeight.fromScreenHint'),
          screenPxPlaceholder: ctx.i18n.t('textHeight.screenPxPlaceholder'),
          screenUnit: ctx.i18n.t('textHeight.screenUnit'),
          convert: ctx.i18n.t('textHeight.convert')
        }
      })
      if (!result || !currentKind) return
      const patch = resolvePatchFromDialog(
        result,
        currentStyle.fontSize,
        ctx.wcsToScreen
      )
      ctx.applyStyle(currentKind, patch)
      paint({ ...currentStyle, ...patch })
    } finally {
      textHeightDialogOpen = false
    }
  }

  swatch.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    void openSessionColorDialog()
  })
  textHeightButton.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    void openTextHeightDialog()
  })
  controlsRow.addEventListener('pointerdown', event => event.stopPropagation())
  controlsRow.addEventListener('mousedown', event => event.stopPropagation())

  relabel()

  return {
    refresh,
    refreshLabels: () => {
      relabel()
    },
    createSessionAccessory: () => ({
      id: 'draw-style',
      mount: mountSession,
      unmount: unmountSession
    }),
    dispose: () => {
      unmountSession()
    }
  }
}
