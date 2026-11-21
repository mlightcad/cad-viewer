import {
  AcApI18n,
  type AcApUiPalette,
  AcApUiRegistry
} from '@mlightcad/cad-simple-viewer'
import { type Component, defineComponent, h, markRaw, ref } from 'vue'

import { i18n } from '../locale'

/** Bumped when a plugin contribution is added, removed, or asked to rebuild. */
export const pluginUiRevision = ref(0)

let bridgeStarted = false

/**
 * Copies plugin message trees into vue-i18n and bumps {@link pluginUiRevision}
 * so the ribbon and palette rebuild. Safe to call more than once.
 */
export function ensurePluginUiBridge() {
  if (bridgeStarted) return
  bridgeStarted = true
  const sync = () => {
    for (const pack of AcApUiRegistry.localeMessages()) {
      for (const [locale, messages] of Object.entries(pack.messages)) {
        i18n.global.mergeLocaleMessage(locale, messages)
      }
    }
    pluginUiRevision.value++
  }
  AcApUiRegistry.events.changed.addEventListener(sync)
  sync()
}

/** Tab label for a plugin palette, resolved from the plugin's message catalog. */
export function mlPluginPaletteTitle(palette: AcApUiPalette): string {
  return AcApI18n.t(palette.titleKey)
}

/** Header title for a plugin palette. Falls back to the tab label. */
export function mlPluginPaletteHeader(palette: AcApUiPalette): string {
  return AcApI18n.t(palette.headerTitleKey ?? palette.titleKey)
}

const svgIconCache = new Map<string, Component>()

/**
 * Wraps raw SVG markup as a component the ribbon can use as a button icon.
 *
 * @param markup - SVG document from a plugin contribution.
 */
export function mlSvgIcon(markup: string): Component {
  const cached = svgIconCache.get(markup)
  if (cached) return cached
  const icon = markRaw(
    defineComponent({
      name: 'MlSvgIcon',
      setup() {
        return () =>
          h('span', {
            class: 'ml-svg-icon',
            innerHTML: markup
          })
      }
    })
  )
  svgIconCache.set(markup, icon)
  return icon
}
