/**
 * @jest-environment jsdom
 */
jest.mock('@mlightcad/cad-simple-viewer', () => ({
  AcUiDialog: jest.requireActual('../../cad-simple-viewer/src/ui/AcUiDialog')
    .AcUiDialog
}))
jest.mock('../src/acapPdfI18n', () => ({
  acapPdfT: (key: string, vars: Record<string, string | number> = {}) =>
    Object.keys(vars).length ? `${key} ${JSON.stringify(vars)}` : key
}))

import {
  AcUiPdfImportDialog,
  type AcUiPdfImportDialogOptions,
  type AcUiPdfImportDialogResult,
  type AcUiPdfImportSource
} from '../src/ui/AcUiPdfImportDialog'

/** A PDF of `numPages` US-letter pages whose renders resolve at once. */
function fakeSource(numPages: number, fileName = 'plan.pdf') {
  const renders: number[] = []
  const source: AcUiPdfImportSource = {
    fileName,
    document: {
      numPages,
      getPage: async pageNumber => ({
        getSize: scale => ({ width: 612 * scale, height: 792 * scale }),
        render: () => {
          renders.push(pageNumber)
          return { promise: Promise.resolve(), cancel: () => {} }
        }
      })
    }
  }
  return { source, renders }
}

function open(options: Partial<AcUiPdfImportDialogOptions> = {}) {
  const promise = AcUiPdfImportDialog.open({
    source: fakeSource(3).source,
    ...options
  })
  const root = document.querySelector('.ml-pdf-import-dialog') as HTMLElement
  const q = <T extends Element>(selector: string) =>
    root.querySelector(selector) as T
  const inputs = root.querySelectorAll<HTMLInputElement>(
    '.ml-pdf-import-number'
  )
  return {
    promise,
    root,
    page: q<HTMLInputElement>('.ml-pdf-import-page'),
    onScreen: q<HTMLInputElement>('.ml-pdf-import-check input'),
    x: inputs[1],
    y: inputs[2],
    scale: inputs[3],
    radios: root.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
    ok: q<HTMLButtonElement>('.ml-pdf-import-ok'),
    cancel: q<HTMLButtonElement>(
      '.ml-ui-dialog-btn-secondary:not(.ml-pdf-import-browse)'
    ),
    browse: q<HTMLButtonElement>('.ml-pdf-import-browse'),
    file: q<HTMLInputElement>('.ml-pdf-import-file input')
  }
}

function type(input: HTMLInputElement, value: string, event = 'input') {
  input.value = value
  input.dispatchEvent(new Event(event))
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

afterEach(() => {
  document.body.innerHTML = ''
})

describe('AcUiPdfImportDialog', () => {
  it('returns the default options on OK', async () => {
    const dialog = open()
    expect(dialog.file.value).toBe('plan.pdf')
    expect(dialog.root.textContent).toContain(
      'jig.pdfimport.dialog.total {"count":3}'
    )
    dialog.ok.click()
    const result = (await dialog.promise) as AcUiPdfImportDialogResult
    expect(result).toMatchObject({
      pageNumber: 1,
      mode: 'recover',
      scale: 1,
      specifyOnScreen: false,
      insertionPoint: { x: 0, y: 0 }
    })
    expect(result.source.fileName).toBe('plan.pdf')
  })

  it('returns the edited page, point, scale and mode', async () => {
    const dialog = open()
    type(dialog.page, '2', 'change')
    type(dialog.x, '10')
    type(dialog.y, '-5.5')
    type(dialog.scale, '2')
    dialog.radios[1].checked = true
    dialog.ok.click()
    expect(await dialog.promise).toMatchObject({
      pageNumber: 2,
      mode: 'visual',
      scale: 2,
      insertionPoint: { x: 10, y: -5.5 }
    })
  })

  it('clamps the page number to the page count', async () => {
    const dialog = open()
    type(dialog.page, '99', 'change')
    expect(dialog.page.value).toBe('3')
    type(dialog.page, '0', 'change')
    expect(dialog.page.value).toBe('1')
  })

  it('disables the page field for a one-page PDF', () => {
    const dialog = open({ source: fakeSource(1).source })
    expect(dialog.page.disabled).toBe(true)
  })

  it('disables OK while the scale is not positive', async () => {
    const dialog = open()
    type(dialog.scale, '0')
    expect(dialog.ok.disabled).toBe(true)
    type(dialog.scale, 'abc')
    expect(dialog.ok.disabled).toBe(true)
    type(dialog.scale, '0.5')
    expect(dialog.ok.disabled).toBe(false)
  })

  it('turns off X/Y when the point is picked on screen', async () => {
    const dialog = open()
    type(dialog.x, '')
    expect(dialog.ok.disabled).toBe(true)
    dialog.onScreen.checked = true
    dialog.onScreen.dispatchEvent(new Event('change'))
    expect(dialog.x.disabled).toBe(true)
    expect(dialog.ok.disabled).toBe(false)
    dialog.ok.click()
    expect(await dialog.promise).toMatchObject({ specifyOnScreen: true })
  })

  it('resolves undefined on Cancel and Escape', async () => {
    const first = open()
    first.cancel.click()
    expect(await first.promise).toBeUndefined()

    const second = open()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(await second.promise).toBeUndefined()
  })

  it('starts from the initial values', async () => {
    const dialog = open({
      initial: {
        mode: 'visual',
        scale: 4,
        specifyOnScreen: true,
        insertionPoint: { x: 1, y: 2 }
      }
    })
    expect(dialog.radios[1].checked).toBe(true)
    expect(dialog.scale.value).toBe('4')
    expect(dialog.onScreen.checked).toBe(true)
    expect(dialog.x.value).toBe('1')
    dialog.ok.click()
    expect(await dialog.promise).toMatchObject({ mode: 'visual', scale: 4 })
  })

  it('swaps the PDF after Browse', async () => {
    const other = fakeSource(5, 'other.pdf')
    const dialog = open({ browse: async () => other.source })
    type(dialog.page, '3', 'change')
    dialog.browse.click()
    await flush()
    expect(dialog.file.value).toBe('other.pdf')
    expect(dialog.page.value).toBe('1')
    expect(dialog.page.max).toBe('5')
    dialog.ok.click()
    const result = await dialog.promise
    expect(result?.source).toBe(other.source)
  })

  it('hides Browse without a browse callback', () => {
    expect(open().browse.hidden).toBe(true)
  })

  it('renders the preview and the thumbnail grid', async () => {
    const { source, renders } = fakeSource(3)
    const dialog = open({ source })
    await flush()
    expect(renders).toEqual([1])
    const [, grid] = Array.from(
      dialog.root.querySelectorAll<HTMLButtonElement>('.ml-pdf-import-view')
    )
    grid.click()
    await flush()
    await flush()
    expect(renders.slice(1).sort()).toEqual([1, 2, 3])
    const thumbs = dialog.root.querySelectorAll<HTMLButtonElement>(
      '.ml-pdf-import-thumb'
    )
    thumbs[2].click()
    expect(dialog.page.value).toBe('3')
    expect(thumbs[2].classList.contains('is-selected')).toBe(true)
  })
})
