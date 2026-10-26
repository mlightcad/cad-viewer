import { computed, reactive } from 'vue'

export interface Dialog {
  name: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props?: Record<string, any>
  visible: boolean
}

const dialogs = reactive<Dialog[]>([])

function registerDialog(dialog: Omit<Dialog, 'visible'>) {
  const existing = dialogs.find(d => d.name === dialog.name)
  if (!existing) {
    dialogs.push({ ...dialog, visible: false })
  }
}

function toggleDialog(key: string, visible: boolean) {
  const dialog = dialogs.find(d => d.name === key)
  if (dialog) {
    dialog.visible = visible
  }
}

function getDialogByName(key: string) {
  return dialogs.find(d => d.name === key)
}

export function useDialogManager() {
  return {
    dialogs: computed(() => dialogs),
    registerDialog,
    toggleDialog,
    getDialogByName: getDialogByName
  }
}
