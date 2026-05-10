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

jest.mock(
  '@mlightcad/mtext-input-box',
  () => ({
    MTextInputBox: MockMTextInputBox
  }),
  { virtual: true }
)

jest.mock('@mlightcad/mtext-renderer', () => ({
  MTextColor: class MTextColor {}
}))

jest.mock('@mlightcad/data-model', () => ({
  AcDbSystemVariables: {
    COLORTHEME: 'COLORTHEME'
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
      lineSpacingFactor: 0.3
    })
    expect(inputBox.dispose).toHaveBeenCalled()
    expect(toolbar.container.remove).toHaveBeenCalled()
  })
})
