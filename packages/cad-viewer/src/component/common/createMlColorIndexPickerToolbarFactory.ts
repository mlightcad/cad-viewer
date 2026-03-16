import { type MTextToolbarColorPickerFactory } from '@mlightcad/cad-simple-viewer'
import { AcCmColor } from '@mlightcad/data-model'
import { AcTrMTextColorUtil } from '@mlightcad/three-renderer'
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
    const colorRef = shallowRef<AcCmColor>(
      AcTrMTextColorUtil.toAcCmColor(initialColor)
    )
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
                  onChange(AcTrMTextColorUtil.toMTextColor(color))
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
        colorRef.value = AcTrMTextColorUtil.toAcCmColor(nextColor)
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
