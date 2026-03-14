import {
  MTextColor,
  type MTextToolbarColorPickerFactory
} from '@mlightcad/cad-simple-viewer'
import { AcCmColor } from '@mlightcad/data-model'
import { createApp, h, ref, shallowRef } from 'vue'

import { i18n } from '../../locale'
import MlColorPickerDropdown from './MlColorPickerDropdown.vue'

/**
 * Creates a toolbar color picker factory that mounts a unified (ACI + RGB)
 * picker in the MTEXT toolbar and syncs with {@link MTextInputBox} colors.
 */
export function createMlColorIndexPickerToolbarFactory(): MTextToolbarColorPickerFactory {
  return context => {
    const { container, initialColor, theme, onChange } = context
    const initialResolved = new AcCmColor()
    if (initialColor) {
      if (initialColor.aci != null) {
        initialResolved.colorIndex = initialColor.aci
      } else if (initialColor.isRgb) {
        initialResolved.setRGBValue(initialColor.rgbValue)
      }
    }
    const colorRef = shallowRef<AcCmColor>(initialResolved)
    const themeRef = ref(theme)

    const Root = {
      setup() {
        return () =>
          h(
            'div',
            {
              class:
                themeRef.value === 'dark' ? 'ml-theme-dark' : 'ml-theme-light'
            },
            [
              h(MlColorPickerDropdown, {
                modelValue: colorRef.value,
                popperClass: `ml-theme-${themeRef.value}`,
                'onUpdate:modelValue': (color: AcCmColor | undefined) => {
                  if (!color) return
                  colorRef.value = color
                  if (color.isByColor && typeof color.cssColor === 'string') {
                    const nextColor = MTextColor.fromCssColor(color.cssColor)
                    onChange(nextColor ?? new MTextColor())
                    return
                  }
                  const nextColor = new MTextColor()
                  if (color.isByLayer) {
                    nextColor.aci = 256
                  } else if (color.isByBlock) {
                    nextColor.aci = 0
                  } else if (color.isByACI) {
                    nextColor.aci =
                      typeof color.colorIndex === 'number'
                        ? color.colorIndex
                        : 256
                  } else if (typeof color.RGB === 'number') {
                    const rgbColor = MTextColor.fromCssColor(color.cssColor)
                    if (rgbColor) {
                      onChange(rgbColor)
                      return
                    }
                  }
                  onChange(nextColor)
                }
              })
            ]
          )
      }
    }

    const app = createApp(Root)
    app.use(i18n)
    app.mount(container)

    return {
      setValue(nextColor) {
        if (!nextColor) return
        const resolved = new AcCmColor()
        const cssColor = nextColor.toCssColor()
        if (cssColor) {
          resolved.setRGBFromCss(cssColor)
          colorRef.value = resolved
          return
        }
        if (typeof nextColor.aci === 'number') {
          if (nextColor.aci === 256) resolved.setByLayer()
          else if (nextColor.aci === 0) resolved.setByBlock()
          else resolved.colorIndex = nextColor.aci
          colorRef.value = resolved
        }
      },
      setTheme(nextTheme) {
        themeRef.value = nextTheme
      },
      dispose() {
        app.unmount()
      }
    }
  }
}
