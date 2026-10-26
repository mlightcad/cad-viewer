import { MLIGHTCAD_ICON_SVG } from '@mlightcad/cad-simple-viewer'
import { defineComponent, h } from 'vue'

/**
 * Vue icon component backed by {@link MLIGHTCAD_ICON_SVG} from cad-simple-viewer.
 *
 * Drop-in replacement for the former `mlightcad.svg` vite-svg-loader import.
 */
export default defineComponent({
  name: 'MlightcadIcon',
  inheritAttrs: false,
  setup(_, { attrs }) {
    return () =>
      h('span', {
        ...attrs,
        class: ['ml-mlightcad-icon', attrs.class],
        style: {
          display: 'inline-flex',
          lineHeight: 0,
          ...(typeof attrs.style === 'object' && attrs.style != null
            ? attrs.style
            : {})
        },
        innerHTML: MLIGHTCAD_ICON_SVG
      })
  }
})
