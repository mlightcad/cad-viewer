jest.mock('../src/app', () => ({}))

jest.mock('../src/editor', () => {
  class AcEdCommand {}

  return {
    AcEdCommand
  }
})

const setVar = jest.fn()
const getVar = jest.fn(() => ({ red: 0, green: 0, blue: 0 }))
const getDescriptor = jest.fn(() => ({}))

jest.mock('@mlightcad/data-model', () => ({
  AcCmColor: class {},
  AcDbSysVarManager: {
    instance: () => ({
      getDescriptor,
      getVar,
      setVar
    })
  }
}))

jest.mock('../src/editor/global/AcEdUiColor', () => ({
  layoutBackgroundSysVar: jest.fn(() => 'MODELBKCOLOR'),
  toggleBlackWhiteBackgroundColor: jest.fn(color => ({
    ...color,
    toggled: true
  }))
}))

import { AcApSwitchBgCmd } from '../src/command/AcApSwitchBgCmd'

describe('AcApSwitchBgCmd', () => {
  beforeEach(() => {
    setVar.mockClear()
    getVar.mockClear()
    getDescriptor.mockClear()
  })

  it('no-ops when reading mode is enabled', async () => {
    const cmd = new AcApSwitchBgCmd()
    await cmd.execute({
      doc: { database: {} },
      view: {
        readingModeEnabled: true,
        activeLayoutBtrId: 'model',
        modelSpaceBtrId: 'model'
      }
    } as never)

    expect(setVar).not.toHaveBeenCalled()
  })

  it('toggles the layout background sysvar when reading mode is off', async () => {
    const cmd = new AcApSwitchBgCmd()
    const database = {}
    await cmd.execute({
      doc: { database },
      view: {
        readingModeEnabled: false,
        activeLayoutBtrId: 'model',
        modelSpaceBtrId: 'model'
      }
    } as never)

    expect(getDescriptor).toHaveBeenCalledWith('MODELBKCOLOR')
    expect(setVar).toHaveBeenCalledTimes(1)
  })
})
