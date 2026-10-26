import { AcDbDatabaseConverterManager } from '@mlightcad/data-model'
import { ref } from 'vue'

export function useFileTypes() {
  const fileTypes = ref<Set<string>>(new Set())
  const register = AcDbDatabaseConverterManager.instance
  for (const item of register.fileTypes) {
    fileTypes.value.add(item)
  }
  register.events.registered.addEventListener(args => {
    fileTypes.value.add(args.fileType)
  })
  return fileTypes
}
