const mockGetBox = jest.fn()
const mockOpenMTextEditor = jest.fn()

jest.mock('../src/app', () => ({
  AcApDocManager: {
    instance: {
      avaiableFonts: [],
      editor: {
        getBox: mockGetBox
      }
    }
  }
}))

jest.mock('../src/editor', () => {
  class AcEdCommand {
    mode: unknown
  }

  class AcEdMTextEditor {
    open = mockOpenMTextEditor
  }

  class AcEdPromptBoxOptions {
    useBasePoint = true
    useDashedLine = true

    constructor(
      readonly firstCornerMessage: string,
      readonly secondCornerMessage: string
    ) {}
  }

  return {
    AcEdCommand,
    AcEdMTextEditor,
    AcEdOpenMode: {
      Write: 'Write'
    },
    AcEdPromptBoxOptions,
    AcEdPromptStatus: {
      OK: 'OK',
      Cancel: 'Cancel'
    }
  }
})

jest.mock('../src/i18n', () => ({
  AcApI18n: {
    t: (key: string) => key
  }
}))

jest.mock('../src/view', () => ({
  AcTrView2d: class AcTrView2d {}
}))

import { AcApMTextCmd } from '../src/command/draw/AcApMTextCmd'

describe('AcApMTextCmd', () => {
  beforeEach(() => {
    mockGetBox.mockReset()
    mockOpenMTextEditor.mockReset()
  })

  it('persists the insertion location returned by the mtext editor', async () => {
    const appendEntity = jest.fn()
    const context = {
      view: {
        screenToWorld: ({ y }: { y: number }) => ({ x: 0, y: y * 0.5 })
      },
      doc: {
        database: {
          tables: {
            blockTable: {
              modelSpace: {
                appendEntity
              }
            }
          }
        }
      }
    }

    mockGetBox.mockResolvedValue({
      status: 'OK',
      value: {
        min: { x: 10, y: 20 },
        max: { x: 110, y: 80 }
      }
    })
    mockOpenMTextEditor.mockResolvedValue({
      contents: 'Hello',
      location: { x: 10, y: 70, z: 0 },
      width: 100,
      height: 24,
      lineSpacingFactor: 0.25,
      attachmentPoint: 1
    })

    await new AcApMTextCmd().execute(context as never)

    expect(mockOpenMTextEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        location: { x: 10, y: 80, z: 0 },
        width: 100,
        textHeight: 12
      })
    )
    expect(appendEntity).toHaveBeenCalledTimes(1)

    const entity = appendEntity.mock.calls[0][0]
    expect(entity.contents).toBe('Hello')
    expect(entity.location.x).toBe(10)
    expect(entity.location.y).toBe(70)
    expect(entity.location.z).toBe(0)
    expect(entity.width).toBe(100)
    expect(entity.height).toBe(24)
  })
})
