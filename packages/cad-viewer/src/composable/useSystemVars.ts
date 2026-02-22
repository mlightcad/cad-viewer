import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { AcDbDatabase, AcDbSysVarManager } from '@mlightcad/data-model'
import { reactive } from 'vue'

export interface SystemVariables {
  pdmode?: number
  pdsize?: number
}

export function useSystemVars(editor: AcApDocManager) {
  const reactiveSystemVars = reactive<SystemVariables>({})
  const doc = editor.curDocument

  const reset = (doc: AcDbDatabase) => {
    reactiveSystemVars.pdmode = doc.pdmode
    reactiveSystemVars.pdmode = doc.pdsize
  }
  reset(doc.database)

  AcDbSysVarManager.instance().events.sysVarChanged.addEventListener(args => {
    // @ts-expect-error no good way to fix type errors here
    reactiveSystemVars[args.name] = args.database[args.name]
  })

  editor.events.documentActivated.addEventListener(args => {
    reset(args.doc.database)
  })

  return reactiveSystemVars
}
