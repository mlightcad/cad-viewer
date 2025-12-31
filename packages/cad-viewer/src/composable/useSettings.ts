import { AcApSettingManager, AcApSettings } from '@mlightcad/cad-simple-viewer'
import { reactive } from 'vue'

export function useSettings() {
  const settings = reactive<AcApSettings>(AcApSettingManager.instance.settings)

  AcApSettingManager.instance.events.modified.addEventListener(args => {
    // @ts-expect-error Hard to describe its type
    settings[args.key] = args.value
  })

  return settings
}
