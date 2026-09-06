/**
 * Selection-driven color / text-height buttons mounted on the shortcut toolbar.
 *
 * @module AcApShortCutSelectionAccessory
 * @packageDocumentation
 */

import { AcCmColor } from '@mlightcad/data-model'

import { resolveUiTheme } from '../editor/global/AcEdUiTheme'
import { AcApI18n } from '../i18n'
import { AcUiAciColorDialog } from '../ui/AcUiAciColorDialog'
import type { AcUiDrawStyleKind } from '../ui/AcUiDrawStyle'
import type { AcUiShortCutToolbar } from '../ui/AcUiShortCutToolbar'
import type { AcUiSimpleToolbarItem } from '../ui/AcUiSimpleToolbar'
import {
  acuiOpenTextHeightDialog,
  acuiResolveTextHeightPatch
} from '../ui/AcUiTextHeightDialogHelpers'
import { ICON_TEXT_HEIGHT } from '../ui/icons'
import {
  acapGetMeasurementCustomTextHeightWcs,
  acapGetMeasurementFontSize,
  acapGetMeasurementTextHeightMode,
  acapSetMeasurementDrawColor,
  acapSetMeasurementTextHeight
} from '../util/AcApMeasurementUtil'
import type { AcTrView2d } from '../view'
import { applyMarkupStyleToSelection } from './markup/AcApMarkupPresenter'
import { getMarkupStore } from './markup/AcApMarkupStore'
import {
  cssToMarkupColor,
  getMarkupCustomTextHeightWcs,
  getMarkupFontSize,
  getMarkupTextHeightMode,
  markupColorToCss,
  setMarkupDrawColor,
  setMarkupTextHeight
} from './markup/AcApMarkupUtil'
import {
  applyMeasurementStyleToSelection,
  getActiveMeasurementStyle,
  getSelectedMeasurementId
} from './measure/AcApMeasurementStore'

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

/**
 * Builds and syncs shortcut-toolbar extension items for measure/markup selection.
 */
export function acapBindShortCutSelectionAccessory(
  view: AcTrView2d,
  shortcut: AcUiShortCutToolbar,
  getKind: () => AcUiDrawStyleKind | undefined
): () => void {
  let colorDialogOpen = false
  let textHeightDialogOpen = false

  const sync = () => {
    const kind = getKind()
    if (kind == null) {
      shortcut.setExtensionItems([])
      return
    }

    const measureSelected =
      kind === 'measure' ? getSelectedMeasurementId() != null : false
    const markupSelected =
      kind === 'markup' ? getMarkupStore().selectedId != null : false
    if (!measureSelected && !markupSelected) {
      shortcut.setExtensionItems([])
      return
    }

    let colorCss = '#7b8794'
    if (kind === 'measure') {
      const style = getActiveMeasurementStyle()
      if (style) colorCss = `rgb(${style.color.red},${style.color.green},${style.color.blue})`
    } else {
      const id = getMarkupStore().selectedId
      const record = id ? getMarkupStore().get(id) : undefined
      if (record) colorCss = record.style.color
    }

    const items: AcUiSimpleToolbarItem[] = [
      {
        id: 'selection-color',
        icon: () => createColorIcon(colorCss),
        label: AcApI18n.t('main.drawStyle.color'),
        onClick: () => {
          void openColor(kind)
        }
      },
      {
        id: 'selection-text-height',
        icon: ICON_TEXT_HEIGHT,
        label: AcApI18n.t('main.drawStyle.fontSize'),
        onClick: () => {
          void openTextHeight(kind)
        }
      }
    ]
    shortcut.setExtensionItems(items)
  }

  const openColor = async (kind: AcUiDrawStyleKind) => {
    if (colorDialogOpen) return
    colorDialogOpen = true
    try {
      let initial: number | null = null
      if (kind === 'measure') {
        const style = getActiveMeasurementStyle()
        if (style?.color.isByACI && style.color.colorIndex != null) {
          initial = style.color.colorIndex
        }
      } else {
        const id = getMarkupStore().selectedId
        const record = id ? getMarkupStore().get(id) : undefined
        if (record) {
          const color = cssToMarkupColor(record.style.color)
          if (color.isByACI && color.colorIndex != null) {
            initial = color.colorIndex
          }
        }
      }
      const index = await AcUiAciColorDialog.open({
        host: view.container,
        theme: resolveUiTheme(view.container),
        initialIndex: initial,
        labels: {
          title: AcApI18n.t('main.colorPicker.title'),
          close: AcApI18n.t('main.colorPicker.close'),
          ok: AcApI18n.t('main.colorPicker.ok'),
          cancel: AcApI18n.t('main.colorPicker.cancel'),
          index: AcApI18n.t('main.colorPicker.index'),
          rgb: AcApI18n.t('main.colorPicker.rgb'),
          input: AcApI18n.t('main.colorPicker.input'),
          inputPlaceholder: AcApI18n.t('main.colorPicker.inputPlaceholder')
        }
      })
      if (index == null) return
      const color = colorFromAci(index)
      if (kind === 'measure') {
        acapSetMeasurementDrawColor(color)
        applyMeasurementStyleToSelection(view, { color })
      } else {
        setMarkupDrawColor(color)
        applyMarkupStyleToSelection(view, { color: markupColorToCss(color) })
      }
      sync()
    } finally {
      colorDialogOpen = false
    }
  }

  const openTextHeight = async (kind: AcUiDrawStyleKind) => {
    if (textHeightDialogOpen) return
    textHeightDialogOpen = true
    try {
      const selectedMeasure =
        kind === 'measure' ? getActiveMeasurementStyle() : undefined
      const selectedMarkup =
        kind === 'markup' && getMarkupStore().selectedId
          ? getMarkupStore().get(getMarkupStore().selectedId!)
          : undefined
      const initialMode =
        kind === 'measure'
          ? selectedMeasure?.textHeightMode ??
            acapGetMeasurementTextHeightMode()
          : selectedMarkup?.style.textHeightMode ?? getMarkupTextHeightMode()
      const initialFontSizePx =
        kind === 'measure'
          ? selectedMeasure?.fontSize ?? acapGetMeasurementFontSize()
          : selectedMarkup?.style.fontSize ?? getMarkupFontSize()
      const initialTextHeightWcs =
        kind === 'measure'
          ? selectedMeasure?.textHeightWcs ??
            acapGetMeasurementCustomTextHeightWcs()
          : selectedMarkup?.style.textHeightWcs ?? getMarkupCustomTextHeightWcs()

      const result = await acuiOpenTextHeightDialog({
        view,
        initialMode,
        initialFontSizePx,
        initialTextHeightWcs
      })
      if (!result) return
      const patch = acuiResolveTextHeightPatch(
        view,
        result,
        initialFontSizePx
      )
      if (kind === 'measure') {
        acapSetMeasurementTextHeight(
          patch.textHeightMode,
          patch.textHeightMode === 'custom'
            ? (patch.textHeightWcs ?? patch.fontSize)
            : patch.fontSize
        )
        applyMeasurementStyleToSelection(view, patch)
      } else {
        setMarkupTextHeight(
          patch.textHeightMode,
          patch.textHeightMode === 'custom'
            ? (patch.textHeightWcs ?? patch.fontSize)
            : patch.fontSize
        )
        applyMarkupStyleToSelection(view, patch)
      }
      sync()
    } finally {
      textHeightDialogOpen = false
    }
  }

  return sync
}
