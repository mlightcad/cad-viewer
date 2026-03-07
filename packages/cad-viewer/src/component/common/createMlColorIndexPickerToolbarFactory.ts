import { AcCmColor } from '@mlightcad/data-model'
import { createApp, h, ref } from 'vue'

import { i18n } from '../../locale'
import MlMTextToolbarColorPicker from './MlMTextToolbarColorPicker.vue'

/**
 * Context passed to the toolbar color picker factory by MTextInputBox.
 * Matches @mlightcad/mtext-input-box MTextToolbarColorPickerContext.
 */
interface MTextToolbarColorPickerContext {
  container: HTMLElement
  initialColor: string
  theme: 'light' | 'dark'
  onChange: (hexColor: string) => void
}

/**
 * Factory type for toolbar color picker. Matches @mlightcad/mtext-input-box
 * MTextToolbarColorPickerFactory.
 */
type MTextToolbarColorPickerFactory = (
  context: MTextToolbarColorPickerContext
) => {
  setValue?: (nextColor: string) => void
  setTheme?: (nextTheme: 'light' | 'dark') => void
  dispose?: () => void
}

function normalizeHex(hex: string): string | null {
  const s = hex.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase()
  if (/^[0-9a-fA-F]{6}$/.test(s)) return `#${s.toLowerCase()}`
  return null
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHex(hex)
  if (!normalized) return null
  const n = Number.parseInt(normalized.slice(1), 16)
  return {
    r: (n >> 16) & 0xff,
    g: (n >> 8) & 0xff,
    b: n & 0xff
  }
}

/**
 * Find the ACI (1–255) whose RGB is closest to the given hex color.
 * Returns 256 (ByLayer) if hex is invalid.
 */
function hexToNearestAci(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 256

  let bestAci = 256
  let bestDist = Number.POSITIVE_INFINITY
  const color = new AcCmColor()

  for (let aci = 1; aci <= 255; aci += 1) {
    color.colorIndex = aci
    const r = color.red ?? 0
    const g = color.green ?? 0
    const b = color.blue ?? 0
    const dr = rgb.r - r
    const dg = rgb.g - g
    const db = rgb.b - b
    const dist = dr * dr + dg * dg + db * db
    if (dist < bestDist) {
      bestDist = dist
      bestAci = aci
    }
  }
  return bestAci
}

/**
 * Convert ACI to hex string (#rrggbb). ACI 0 (ByBlock) and 256 (ByLayer)
 * are treated as white for display purposes.
 */
function aciToHex(aci: number): string {
  const color = new AcCmColor()
  color.colorIndex = aci
  const r = (color.red ?? 255) & 0xff
  const g = (color.green ?? 255) & 0xff
  const b = (color.blue ?? 255) & 0xff
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Creates a toolbar color picker factory that mounts {@link MlColorIndexPicker}
 * (ACI-based) in the MTEXT toolbar. The picker converts between ACI and hex
 * so that the editor receives hex as expected by {@link MTextInputBox}.
 */
export function createMlColorIndexPickerToolbarFactory(): MTextToolbarColorPickerFactory {
  return (context) => {
    const { container, initialColor, theme, onChange } = context
    const normalizedHex = normalizeHex(initialColor) ?? '#ffffff'
    const aciRef = ref<number | null>(hexToNearestAci(normalizedHex))
    const themeRef = ref(theme)

    const Root = {
      setup() {
        return () =>
          h(MlMTextToolbarColorPicker, {
            modelValue: aciRef.value,
            'onUpdate:modelValue': (aci: number | null) => {
              if (aci == null) return
              aciRef.value = aci
              onChange(aciToHex(aci))
            }
          })
      }
    }

    const app = createApp(Root)
    app.use(i18n)
    app.mount(container)

    return {
      setValue(nextColor: string) {
        const hex = normalizeHex(nextColor)
        if (hex) aciRef.value = hexToNearestAci(hex)
      },
      setTheme(nextTheme: 'light' | 'dark') {
        themeRef.value = nextTheme
      },
      dispose() {
        app.unmount()
      }
    }
  }
}
