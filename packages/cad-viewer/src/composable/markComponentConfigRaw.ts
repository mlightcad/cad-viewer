import { markRaw } from 'vue'

const COMPONENT_CONFIG_KEYS = new Set([
  'component',
  'icon',
  'onIcon',
  'offIcon',
  'activeIcon',
  'inactiveIcon',
  'leadingIcon'
])

export const markComponentConfigRaw = <T>(value: T): T => {
  if (Array.isArray(value)) {
    value.forEach(item => markComponentConfigRaw(item))
    return value
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  const record = value as Record<string, unknown>
  for (const [key, nestedValue] of Object.entries(record)) {
    if (
      COMPONENT_CONFIG_KEYS.has(key) &&
      nestedValue &&
      (typeof nestedValue === 'object' || typeof nestedValue === 'function')
    ) {
      record[key] = markRaw(nestedValue as object)
      continue
    }

    markComponentConfigRaw(nestedValue)
  }

  return value
}
