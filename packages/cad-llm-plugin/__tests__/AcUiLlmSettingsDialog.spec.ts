/** @jest-environment jsdom */

import { TextDecoder, TextEncoder } from 'util'
import { webcrypto } from 'crypto'

Object.assign(globalThis, { TextDecoder, TextEncoder })
Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  configurable: true
})

// The dialog only needs the dialog shell and i18n from the viewer; the full
// package pulls in the renderer and text editor stacks.
jest.mock('@mlightcad/cad-simple-viewer', () => ({
  AcUiDialog: jest.requireActual('../../cad-simple-viewer/src/ui/AcUiDialog')
    .AcUiDialog,
  AcApI18n: {
    t: (key: string, options?: { fallback?: string }) =>
      options?.fallback ?? key,
    mergeLocaleMessage: () => undefined
  }
}))

import {
  acapLlmLoadConfig,
  acapLlmOnConfigChange,
  acapLlmSaveConfig,
  type AcApLlmConfig
} from '../src/storage/AcApLlmConfigStore'
import { AcUiLlmSettingsDialog } from '../src/ui/AcUiLlmSettingsDialog'

function dialogEl(): HTMLElement {
  const dialog = document.querySelector<HTMLElement>('.ml-llm-settings-dialog')
  if (!dialog) throw new Error('dialog is not open')
  return dialog
}

function type(input: HTMLInputElement, value: string) {
  input.value = value
  input.dispatchEvent(new Event('input'))
}

function select(element: HTMLSelectElement, value: string) {
  element.value = value
  element.dispatchEvent(new Event('change'))
}

/** The primary footer button: Save, or Create provider. */
function saveButton(): HTMLButtonElement {
  const buttons = dialogEl().querySelectorAll<HTMLButtonElement>(
    '.ml-ui-dialog-footer button'
  )
  return buttons[buttons.length - 1]
}

/**
 * Waits until `check` returns a truthy value. Loading and saving derive the
 * API key encryption key with PBKDF2 (100k iterations), which takes real time
 * on a slow CI runner, so a fixed number of event-loop ticks is not enough.
 */
async function waitFor<T>(check: () => T, timeout = 10_000): Promise<T> {
  const deadline = Date.now() + timeout
  for (;;) {
    let value: T | undefined
    try {
      value = check()
    } catch {
      // Not ready yet (e.g. the dialog is still loading).
    }
    if (value) return value
    if (Date.now() > deadline) throw new Error('waitFor timed out')
    await new Promise(r => setTimeout(r, 10))
  }
}

/** Opens the dialog and waits until it is shown (its config is loaded). */
async function openDialog() {
  void AcUiLlmSettingsDialog.open()
  await waitFor(() => document.querySelector('.ml-llm-settings-dialog'))
}

/** Waits until a save finished and the dialog shows its status message. */
async function waitForSaved() {
  await waitFor(() => dialogEl().querySelector('.ml-llm-status')?.textContent)
}

describe('AcUiLlmSettingsDialog', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    // Close (and so release) the open instance, discarding any draft.
    jest.spyOn(window, 'confirm').mockReturnValue(true)
    document
      .querySelectorAll('.ml-ui-dialog-close')
      .forEach(button => (button as HTMLButtonElement).click())
    jest.restoreAllMocks()
  })

  it('saves a built-in provider key and offers its models as the model in use', async () => {
    const saved: AcApLlmConfig[] = []
    const stop = acapLlmOnConfigChange(config => saved.push(config))
    await openDialog()

    const selects = dialogEl().querySelectorAll<HTMLSelectElement>('select')
    // [0] = model in use, [1] = built-in provider
    select(selects[1], 'deepseek-vl')

    const save = saveButton()
    const apiKey = dialogEl().querySelector<HTMLInputElement>(
      'input[type="password"]'
    )!
    type(apiKey, '  sk-vl  ')
    expect(save.disabled).toBe(false)
    save.click()
    await waitForSaved()

    const config = await acapLlmLoadConfig()
    expect(config.activeProviderId).toBe('deepseek-vl')
    expect(config.providers).toEqual([
      expect.objectContaining({ id: 'deepseek-vl', apiKey: 'sk-vl' })
    ])
    expect(saved[saved.length - 1]?.activeProviderId).toBe('deepseek-vl')
    expect(dialogEl().querySelector('.ml-llm-status')?.textContent).not.toBe('')

    const activeModel = dialogEl().querySelector<HTMLSelectElement>('select')!
    const providers = Array.from(activeModel.querySelectorAll('optgroup')).map(
      group => group.label
    )
    expect(providers).toHaveLength(1)
    // A vision model is now configured, so the OCR warning is gone.
    expect(dialogEl().querySelector('.ml-llm-section .ml-llm-warning')).toBe(
      null
    )
    stop()
  })

  it('switches the model in use without touching the provider editor', async () => {
    await acapLlmSaveConfig({
      providers: [
        {
          id: 'openai',
          kind: 'builtin',
          protocol: 'openai-chat',
          baseUrl: '',
          apiKey: 'sk-openai',
          models: [
            { id: 'gpt-a', vision: true },
            { id: 'gpt-b', vision: true }
          ]
        }
      ],
      activeProviderId: 'openai',
      activeModel: 'gpt-a'
    })
    await openDialog()

    const activeModel = dialogEl().querySelector<HTMLSelectElement>('select')!
    select(activeModel, 'openai\ngpt-b')
    await waitForSaved()

    expect((await acapLlmLoadConfig()).activeModel).toBe('gpt-b')
  })

  it('validates a new custom provider before it can be created', async () => {
    await openDialog()

    const tabs = dialogEl().querySelectorAll<HTMLButtonElement>(
      '.ml-llm-segmented-item'
    )
    tabs[1].click()

    const [idInput] = Array.from(
      dialogEl().querySelectorAll<HTMLInputElement>('input[type="text"]')
    )
    type(idInput, 'Bad Id')
    expect(dialogEl().querySelector('.ml-llm-error:not([hidden])')).not.toBe(
      null
    )
    expect(saveButton().disabled).toBe(true)

    type(idInput, 'acme-gateway')
    expect(
      dialogEl().querySelector('.ml-llm-validation')?.textContent
    ).not.toBe('')
    expect(saveButton().disabled).toBe(true)
  })

  it('asks before discarding unsaved edits on close', async () => {
    await openDialog()
    type(
      dialogEl().querySelector<HTMLInputElement>('input[type="password"]')!,
      'sk-draft'
    )

    const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false)
    dialogEl().querySelector<HTMLButtonElement>('.ml-ui-dialog-close')!.click()
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.ml-llm-settings-dialog')).not.toBe(null)

    confirm.mockReturnValue(true)
    dialogEl().querySelector<HTMLButtonElement>('.ml-ui-dialog-close')!.click()
    expect(document.querySelector('.ml-llm-settings-dialog')).toBe(null)
  })
})
