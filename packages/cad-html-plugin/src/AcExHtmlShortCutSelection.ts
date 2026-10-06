/**
 * Selection color / text-height buttons for the HTML shortcut toolbar.
 *
 * @module AcExHtmlShortCutSelection
 * @packageDocumentation
 */

import { AcCmColor } from '@mlightcad/data-model'

import type { AcExHtmlI18n } from './AcExHtmlI18n'
import { acexScreenPxToWcs } from './AcExHtmlOverlayDom'
import {
  AcUiAciColorDialog,
  type AcUiSimpleToolbarItem,
  ICON_TEXT_HEIGHT} from './AcExHtmlSimpleViewerUi'
import { AcUiTextHeightDialog } from './AcExHtmlSimpleViewerUi'
import type { AcExDrawStyleKind } from './AcExSessionDrawStyle'

function colorFromAci(index: number): AcCmColor {
  const color = new AcCmColor()
  color.colorIndex = index
  return color
}

function createColorIcon(css: string): HTMLElement {
  const wrap = document.createElement('span')
  wrap.className = 'ml-ui-simple-toolbar__icon'
  wrap.style.cssText =
    'display:inline-flex;width:18px;height:18px;align-items:center;justify-content:center'
  const fill = document.createElement('span')
  fill.style.cssText = `display:block;width:12px;height:12px;border-radius:50%;border:1px solid #666;background:${css}`
  wrap.appendChild(fill)
  return wrap
}

/** Dependencies for HTML shortcut selection extensions. */
export interface AcExHtmlShortCutSelectionContext {
  i18n: AcExHtmlI18n
  getKind: () => AcExDrawStyleKind | undefined
  getStyle: (kind: AcExDrawStyleKind) => {
    color: string
    fontSize: number
    textHeightMode?: 'adaptive' | 'custom'
    textHeightWcs?: number
  }
  applyStyle: (
    kind: AcExDrawStyleKind,
    patch: {
      color?: string
      fontSize?: number
      textHeightMode?: 'adaptive' | 'custom'
      textHeightWcs?: number
    }
  ) => void
  hasSelection: (kind: AcExDrawStyleKind) => boolean
  wcsToScreen?: (p: { x: number; y: number }) => { x: number; y: number }
  setExtensionItems: (items: AcUiSimpleToolbarItem[]) => void
}

/**
 * Rebuilds shortcut extension items from the current markup/measure selection.
 */
export function acexSyncHtmlShortCutSelection(
  ctx: AcExHtmlShortCutSelectionContext
): void {
  const kind = ctx.getKind()
  if (kind == null || !ctx.hasSelection(kind)) {
    ctx.setExtensionItems([])
    return
  }
  const style = ctx.getStyle(kind)
  ctx.setExtensionItems([
    {
      id: 'selection-color',
      icon: () => createColorIcon(style.color),
      label: ctx.i18n.t('drawStyle.color'),
      onClick: () => {
        void openColor(ctx, kind, style.color)
      }
    },
    {
      id: 'selection-text-height',
      icon: ICON_TEXT_HEIGHT,
      label: ctx.i18n.t('drawStyle.fontSize'),
      onClick: () => {
        void openTextHeight(ctx, kind, style)
      }
    }
  ])
}

async function openColor(
  ctx: AcExHtmlShortCutSelectionContext,
  kind: AcExDrawStyleKind,
  currentCss: string
): Promise<void> {
  const theme =
    document.documentElement.getAttribute('data-mlcad-theme') === 'light'
      ? ('light' as const)
      : ('dark' as const)
  let initial: number | null = null
  try {
    const color = new AcCmColor().setRGBFromCss(currentCss)
    if (color.isByACI && color.colorIndex != null) initial = color.colorIndex
  } catch {
    /* ignore */
  }
  const index = await AcUiAciColorDialog.open({
    host: document.getElementById('mlcad-canvas-host') ?? document.body,
    theme,
    initialIndex: initial,
    labels: {
      title: ctx.i18n.t('drawStyle.pickerTitle'),
      close: ctx.i18n.t('drawStyle.close'),
      ok: ctx.i18n.t('drawStyle.ok'),
      cancel: ctx.i18n.t('drawStyle.cancel'),
      index: ctx.i18n.t('drawStyle.index'),
      rgb: ctx.i18n.t('drawStyle.rgb'),
      input: ctx.i18n.t('drawStyle.input'),
      inputPlaceholder: ctx.i18n.t('drawStyle.inputPlaceholder')
    }
  })
  if (index == null) return
  const next = colorFromAci(index)
  const css =
    next.cssColor ?? `rgb(${next.red}, ${next.green}, ${next.blue})`
  ctx.applyStyle(kind, { color: css })
  acexSyncHtmlShortCutSelection(ctx)
}

async function openTextHeight(
  ctx: AcExHtmlShortCutSelectionContext,
  kind: AcExDrawStyleKind,
  style: {
    fontSize: number
    textHeightMode?: 'adaptive' | 'custom'
    textHeightWcs?: number
  }
): Promise<void> {
  const theme =
    document.documentElement.getAttribute('data-mlcad-theme') === 'light'
      ? ('light' as const)
      : ('dark' as const)
  const result = await AcUiTextHeightDialog.open({
    host: document.getElementById('mlcad-canvas-host') ?? document.body,
    theme,
    initialMode: style.textHeightMode ?? 'adaptive',
    initialFontSizePx: style.fontSize,
    initialTextHeightWcs: style.textHeightWcs,
    screenPxToWcs: (px: number) =>
      ctx.wcsToScreen ? acexScreenPxToWcs(px, ctx.wcsToScreen) : px,
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
  if (!result) return
  if (result.mode === 'custom' && result.textHeightWcs != null) {
    let fontSize = style.fontSize
    if (ctx.wcsToScreen) {
      const perPx = acexScreenPxToWcs(1, ctx.wcsToScreen)
      if (perPx > 0) {
        fontSize = Math.max(1, Math.round(result.textHeightWcs / perPx))
      }
    }
    ctx.applyStyle(kind, {
      textHeightMode: 'custom',
      textHeightWcs: result.textHeightWcs,
      fontSize
    })
  } else {
    ctx.applyStyle(kind, {
      textHeightMode: 'adaptive',
      fontSize: style.fontSize
    })
  }
  acexSyncHtmlShortCutSelection(ctx)
}
