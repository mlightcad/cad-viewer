/**
 * Phone sub-toolbar packing for the offline HTML viewer.
 *
 * Matches cad-simple-ui-plugin wrap-pack:
 * - A single incomplete row stretches so buttons share the strip evenly.
 * - Wrapped rows use a portrait slot; a short last row stays left-aligned.
 *
 * @module AcExHtmlStripWrapPack
 * @packageDocumentation
 */

import { acExHtmlIsPhoneLayout } from './AcExHtmlDrawerSheet'

const STRIP_IDS = [
  'mlcad-snap-strip',
  'mlcad-measure-strip',
  'mlcad-markup-strip',
  'mlcad-zoom-strip',
  'mlcad-settings-strip',
  'mlcad-locale-strip'
] as const

const MIN_SLOT = 24
/** Extra inset vs button height so phone slots stay narrower than simple-ui. */
const HEIGHT_INSET = 16

/** Slot metrics used to choose CSS grid column count. */
export interface AcExHtmlWrapPackSlot {
  perRow: number
  slotWidth: number
  preferredMaxWidth: number
}

/**
 * Computes how many portrait slots fit, and whether a short strip should
 * stretch across the full row.
 */
export function acExHtmlComputeWrapPackSlot(
  containerWidth: number,
  buttonHeight: number,
  buttonCount: number = 0
): AcExHtmlWrapPackSlot {
  const preferredMaxWidth = Math.max(MIN_SLOT, buttonHeight - HEIGHT_INSET)
  if (containerWidth <= 0) {
    return { perRow: 1, slotWidth: preferredMaxWidth, preferredMaxWidth }
  }
  const perRow = Math.max(1, Math.floor(containerWidth / preferredMaxWidth))
  const count = Math.max(0, buttonCount)
  if (count > 0 && count <= perRow) {
    return {
      perRow,
      slotWidth: containerWidth / count,
      preferredMaxWidth
    }
  }
  return {
    perRow,
    slotWidth: containerWidth / perRow,
    preferredMaxWidth
  }
}

/**
 * Applies wrap-pack column counts to visible phone strips. No-ops (and
 * clears inline columns) on desktop.
 */
export function acExHtmlSyncStripWrapPack() {
  for (const id of STRIP_IDS) {
    const strip = document.getElementById(id)
    if (strip) applyStripWrapPack(strip)
  }
}

function applyStripWrapPack(strip: HTMLElement) {
  const wrap = strip.parentElement
  if (!acExHtmlIsPhoneLayout() || wrap?.hidden) {
    strip.style.removeProperty('grid-template-columns')
    return
  }

  const buttons = Array.from(
    strip.querySelectorAll<HTMLElement>(':scope > .mlcad-tool-btn')
  )
  if (buttons.length === 0) {
    strip.style.removeProperty('grid-template-columns')
    return
  }

  const containerWidth = strip.clientWidth
  if (containerWidth <= 0) {
    // Unhiding a wrap often reports width 0 on the first layout pass.
    // Leave CSS auto-fit in place until a later sync measures the strip.
    return
  }
  const height = Math.max(...buttons.map(button => button.offsetHeight), 1)
  const { perRow } = acExHtmlComputeWrapPackSlot(
    containerWidth,
    height,
    buttons.length
  )
  const columns = buttons.length <= perRow ? buttons.length : perRow
  strip.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`
}
