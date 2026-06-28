import { AcApI18n } from '@mlightcad/cad-simple-viewer'

/**
 * Modal textarea prompt for annotation text input.
 */
export function promptAnnotationText(message: string): Promise<string | undefined> {
  return new Promise(resolve => {
    const overlay = document.createElement('div')
    overlay.className = 'ml-ann-prompt-overlay'
    const box = document.createElement('div')
    box.className = 'ml-ann-prompt-box'
    const label = document.createElement('label')
    label.textContent = message
    const input = document.createElement('textarea')
    input.rows = 3
    const actions = document.createElement('div')
    actions.className = 'ml-ann-prompt-actions'
    const ok = document.createElement('button')
    ok.type = 'button'
    ok.textContent = AcApI18n.t('annotation.dialog.ok')
    const cancel = document.createElement('button')
    cancel.type = 'button'
    cancel.textContent = AcApI18n.t('annotation.dialog.cancel')
    const cleanup = (value?: string) => {
      overlay.remove()
      resolve(value)
    }
    ok.onclick = () => cleanup(input.value.trim() || undefined)
    cancel.onclick = () => cleanup()
    actions.append(ok, cancel)
    box.append(label, input, actions)
    overlay.append(box)
    document.body.append(overlay)
    input.focus()
  })
}