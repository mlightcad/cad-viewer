import type { Component } from 'vue'
import { defineComponent, h } from 'vue'

/**
 * Wraps an inline SVG string as a Vue component for ribbon / toolbar `icon` slots.
 *
 * @param markup - Complete `<svg>…</svg>` string from `@mlightcad/cad-simple-viewer/icons`.
 * @param name - Component name used in Vue DevTools.
 */
export function acapSvgIcon(markup: string, name: string): Component {
  return defineComponent({
    name,
    inheritAttrs: false,
    setup(_, { attrs }) {
      return () =>
        h('span', {
          ...attrs,
          class: ['acap-svg-icon', attrs.class],
          innerHTML: markup,
          'aria-hidden': 'true'
        })
    }
  })
}
