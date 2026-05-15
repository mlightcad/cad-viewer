const mockMTextInputBoxInstances: MockMTextInputBox[] = []
const mockSysVarChanged = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}

class MockMTextInputBox {
  readonly handlers = new Map<string, Set<() => void>>()
  readonly update = jest.fn()
  readonly dispose = jest.fn()
  readonly off = jest.fn((event: string, handler: () => void) => {
    this.handlers.get(event)?.delete(handler)
  })
  readonly setToolbarTheme = jest.fn()
  readonly getText = jest.fn(() => 'typed text')
  readonly getMTextInsertionPoint = jest.fn(() => ({ x: 1, y: 2, z: 3 }))
  readonly getMTextAttachmentPoint = jest.fn(() => 1)
  readonly getLineSpacingFactor = jest.fn(() => 0.3)
  readonly setCurrentFormat = jest.fn()
  readonly refreshCurrentFormatFromDocument = jest.fn()
  readonly toggleCase = jest.fn()
  readonly toggleStackSelection = jest.fn()
  readonly toggleScriptSelection = jest.fn(() => true)
  readonly focusImeInput = jest.fn()
  readonly refocusImeInputSoon = jest.fn()
  readonly getSelectionRange = jest.fn(() => ({
    start: 0,
    end: 1,
    isCollapsed: false
  }))
  readonly toDocumentIndexFromLogicalIndex = jest.fn((index: number) => index)
  readonly isScriptOnlyStack = jest.fn(() => false)
  readonly document = {
    ast: {
      nodes: [
        {
          type: 'stack',
          numerator: '1',
          denominator: '2',
          divider: '/'
        }
      ]
    }
  }

  constructor(readonly options: Record<string, unknown>) {
    mockMTextInputBoxInstances.push(this)
  }

  on(event: string, handler: () => void) {
    const handlers = this.handlers.get(event) ?? new Set<() => void>()
    handlers.add(handler)
    this.handlers.set(event, handlers)
  }

  emit(event: string) {
    this.handlers.get(event)?.forEach(handler => handler())
  }
}

interface FormatObservableInputBox {
  addCurrentFormatChangeListener: (listener: () => void) => void
  removeCurrentFormatChangeListener: (listener: () => void) => void
  focusEditor: () => void
  isStackSelectionActive: () => boolean
}

jest.mock(
  '@mlightcad/mtext-input-box',
  () => ({
    MTextInputBox: MockMTextInputBox
  }),
  { virtual: true }
)

jest.mock('@mlightcad/mtext-renderer', () => ({
  MTextColor: class MTextColor {},
  MTextAttachmentPoint: { TopLeft: 1 }
}))

jest.mock('@mlightcad/data-model', () => ({
  AcDbSystemVariables: {
    COLORTHEME: 'COLORTHEME'
  },
  AcGiMTextAttachmentPoint: {
    TopLeft: 1
  },
  AcDbSysVarManager: {
    instance: jest.fn(() => ({
      getVar: jest.fn(() => 0),
      events: {
        sysVarChanged: mockSysVarChanged
      }
    }))
  }
}))

jest.mock('../src/app', () => ({
  AcApDocManager: {
    instance: {
      curDocument: {
        database: {
          clayer: '0',
          textstyle: 'Standard',
          tables: {
            textStyleTable: {
              getAt: jest.fn(() => undefined)
            }
          }
        }
      },
      resolveColors: jest.fn(() => ({ layerColor: 0xffffff }))
    }
  }
}))

jest.mock('../src/view', () => ({
  AcTrView2d: class AcTrView2d {}
}))

import { AcEdMTextEditor } from '../src/editor/input/ui/AcEdMTextEditor'

interface FakeElement {
  ownerDocument: {
    createElement: jest.Mock
  }
  appendChild: jest.Mock
  remove: jest.Mock
  setAttribute: jest.Mock
  style: Record<string, string>
}

function createFakeElement(ownerDocument?: FakeElement['ownerDocument']) {
  const documentRef =
    ownerDocument ??
    ({
      createElement: jest.fn()
    } as FakeElement['ownerDocument'])
  const element: FakeElement = {
    ownerDocument: documentRef,
    appendChild: jest.fn(),
    remove: jest.fn(),
    setAttribute: jest.fn(),
    style: {}
  }
  if (!ownerDocument) {
    documentRef.createElement.mockImplementation(() =>
      createFakeElement(documentRef)
    )
  }
  return element
}

function createView() {
  const container = createFakeElement()
  return {
    internalScene: {},
    internalCamera: {},
    backgroundColor: 0,
    canvas: createFakeElement(),
    container,
    events: {
      renderFrame: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }
    },
    isDirty: false
  }
}

describe('AcEdMTextEditor', () => {
  beforeEach(() => {
    mockMTextInputBoxInstances.length = 0
    mockSysVarChanged.addEventListener.mockClear()
    mockSysVarChanged.removeEventListener.mockClear()
    AcEdMTextEditor.setDefaultToolbarEnabled(true)
  })

  it('keeps the input box toolbar object alive in a hidden host when disabled', async () => {
    const view = createView()
    const resultPromise = new AcEdMTextEditor().open({
      view: view as never,
      location: { x: 0, y: 0, z: 0 },
      width: 10,
      textHeight: 2,
      toolbarEnabled: false
    })

    const inputBox = mockMTextInputBoxInstances[0]
    const options = inputBox.options
    const toolbar = options.toolbar as {
      enabled: boolean
      container: FakeElement
    }

    expect(options.boundingBoxStyle).toEqual({ padding: 0 })
    expect(toolbar.enabled).toBe(true)
    expect(toolbar.container).not.toBe(view.container)
    expect(toolbar.container.style.display).toBe('none')
    expect(toolbar.container.style.pointerEvents).toBe('none')

    inputBox.emit('close')
    await expect(resultPromise).resolves.toEqual({
      contents: 'typed text',
      location: { x: 1, y: 2, z: 3 },
      width: 10,
      height: 2,
      lineSpacingFactor: 0.3,
      attachmentPoint: 1
    })
    expect(inputBox.dispose).toHaveBeenCalled()
    expect(toolbar.container.remove).toHaveBeenCalled()
  })

  it('notifies format listeners when the active input box format refreshes', async () => {
    const view = createView()
    const resultPromise = new AcEdMTextEditor().open({
      view: view as never,
      location: { x: 0, y: 0, z: 0 },
      width: 10,
      textHeight: 2
    })

    const inputBox = mockMTextInputBoxInstances[0]
    const observable = inputBox as unknown as FormatObservableInputBox
    const listener = jest.fn()

    observable.addCurrentFormatChangeListener(listener)
    expect(typeof observable.focusEditor).toBe('function')
    observable.focusEditor()
    expect(inputBox.focusImeInput).toHaveBeenCalledTimes(1)
    expect(observable.isStackSelectionActive()).toBe(true)

    inputBox.setCurrentFormat()
    inputBox.refreshCurrentFormatFromDocument()
    inputBox.toggleScriptSelection()
    expect(listener).toHaveBeenCalledTimes(3)

    observable.removeCurrentFormatChangeListener(listener)
    inputBox.toggleCase()
    expect(listener).toHaveBeenCalledTimes(3)

    observable.addCurrentFormatChangeListener(listener)
    inputBox.emit('close')
    await resultPromise

    inputBox.setCurrentFormat()
    expect(listener).toHaveBeenCalledTimes(3)
  })
})
