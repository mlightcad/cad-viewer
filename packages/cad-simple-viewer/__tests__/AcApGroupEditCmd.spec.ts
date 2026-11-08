jest.mock('../src/app', () => ({
  AcApDocManager: {
    instance: {
      editor: {
        getEntity: jest.fn(),
        getKeywords: jest.fn(),
        getSelection: jest.fn(),
        getString: jest.fn(),
        showMessage: jest.fn()
      }
    }
  }
}))

jest.mock('../src/editor', () => {
  class AcEdCommand {
    mode: unknown
  }

  class MockKeywordCollection {
    add(display: string, global: string, local: string) {
      return { display, global, local }
    }
  }

  class AcEdPromptEntityOptions {
    constructor(readonly message: string) {}
  }

  class AcEdPromptKeywordOptions {
    keywords = new MockKeywordCollection()

    constructor(readonly message: string) {}
  }

  class AcEdPromptSelectionOptions {
    allowGroupSelection = true

    constructor(readonly message: string) {}
  }

  class AcEdPromptStringOptions {
    constructor(readonly message: string) {}
  }

  return {
    AcEdCommand,
    AcEdOpenMode: {
      Write: 'Write'
    },
    AcEdPromptEntityOptions,
    AcEdPromptKeywordOptions,
    AcEdPromptSelectionOptions,
    AcEdPromptStringOptions,
    AcEdPromptStatus: {
      OK: 'OK',
      Keyword: 'Keyword',
      Cancel: 'Cancel'
    }
  }
})

jest.mock('../src/i18n', () => ({
  AcApI18n: {
    t: (key: string) => key
  }
}))

jest.mock('../src/service/AcApGroup', () => ({
  acapFindGroupsContaining: jest.fn(),
  acapGetGroupByName: jest.fn(),
  acapValidateGroupName: jest.fn((name: string) => name)
}))

import { AcApDocManager } from '../src/app'
import { AcApGroupEditCmd } from '../src/command/group/AcApGroupEditCmd'
import { AcEdPromptStatus } from '../src/editor'
import { acapFindGroupsContaining } from '../src/service/AcApGroup'

describe('AcApGroupEditCmd', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('continues after Add when getKeywords returns OK (not Keyword)', async () => {
    const group = {
      name: 'G1',
      append: jest.fn(),
      remove: jest.fn(),
      setName: jest.fn(),
      anonymous: false
    }
    jest.mocked(acapFindGroupsContaining).mockReturnValue([group as never])

    jest.mocked(AcApDocManager.instance.editor.getEntity).mockResolvedValue({
      status: AcEdPromptStatus.OK,
      objectId: 'ent-1'
    } as never)
    // Matches AcEdInputManager.getKeywords: dedicated keyword prompts resolve as OK.
    jest.mocked(AcApDocManager.instance.editor.getKeywords).mockResolvedValue({
      status: AcEdPromptStatus.OK,
      stringResult: 'Add'
    } as never)
    jest
      .mocked(AcApDocManager.instance.editor.getSelection)
      .mockResolvedValue({
        status: AcEdPromptStatus.OK,
        value: { ids: ['ent-2', 'ent-3'] }
      } as never)

    const cmd = new AcApGroupEditCmd()
    await cmd.execute({
      doc: { database: {} }
    } as never)

    expect(AcApDocManager.instance.editor.getSelection).toHaveBeenCalled()
    expect(group.append).toHaveBeenCalledWith(['ent-2', 'ent-3'])
  })

  it('disables group selection when removing members', async () => {
    const group = {
      name: 'G1',
      has: jest.fn((id: string) => id === 'ent-1' || id === 'ent-2'),
      append: jest.fn(),
      remove: jest.fn(),
      setName: jest.fn(),
      anonymous: false
    }
    jest.mocked(acapFindGroupsContaining).mockReturnValue([group as never])

    jest.mocked(AcApDocManager.instance.editor.getEntity).mockResolvedValue({
      status: AcEdPromptStatus.OK,
      objectId: 'ent-1'
    } as never)
    jest.mocked(AcApDocManager.instance.editor.getKeywords).mockResolvedValue({
      status: AcEdPromptStatus.OK,
      stringResult: 'Remove'
    } as never)
    jest
      .mocked(AcApDocManager.instance.editor.getSelection)
      .mockResolvedValue({
        status: AcEdPromptStatus.OK,
        value: { ids: ['ent-2', 'ent-outside'] }
      } as never)

    const selectionSet = { clear: jest.fn() }
    const cmd = new AcApGroupEditCmd()
    await cmd.execute({
      doc: { database: {} },
      view: { selectionSet }
    } as never)

    const prompt = jest.mocked(AcApDocManager.instance.editor.getSelection).mock
      .calls[0][0] as { allowGroupSelection: boolean }
    expect(selectionSet.clear).toHaveBeenCalled()
    expect(prompt.allowGroupSelection).toBe(false)
    expect(group.remove).toHaveBeenCalledWith(['ent-2'])
  })

  it('continues after Rename when getKeywords returns OK', async () => {
    const group = {
      name: 'G1',
      append: jest.fn(),
      remove: jest.fn(),
      setName: jest.fn(),
      anonymous: true
    }
    jest.mocked(acapFindGroupsContaining).mockReturnValue([group as never])

    jest.mocked(AcApDocManager.instance.editor.getEntity).mockResolvedValue({
      status: AcEdPromptStatus.OK,
      objectId: 'ent-1'
    } as never)
    jest.mocked(AcApDocManager.instance.editor.getKeywords).mockResolvedValue({
      status: AcEdPromptStatus.OK,
      stringResult: 'Rename'
    } as never)
    jest.mocked(AcApDocManager.instance.editor.getString).mockResolvedValue({
      status: AcEdPromptStatus.OK,
      stringResult: 'NewName'
    } as never)

    const cmd = new AcApGroupEditCmd()
    await cmd.execute({
      doc: {
        database: {
          objects: {
            group: {
              getAt: jest.fn().mockReturnValue(undefined)
            }
          }
        }
      }
    } as never)

    expect(AcApDocManager.instance.editor.getString).toHaveBeenCalled()
    expect(group.setName).toHaveBeenCalledWith('NewName')
    expect(group.anonymous).toBe(false)
  })

  it('prompts Accept/Next when the pick belongs to multiple groups', async () => {
    const groupA = {
      name: 'A',
      append: jest.fn(),
      remove: jest.fn(),
      setName: jest.fn(),
      anonymous: false
    }
    const groupB = {
      name: 'B',
      append: jest.fn(),
      remove: jest.fn(),
      setName: jest.fn(),
      anonymous: false
    }
    jest
      .mocked(acapFindGroupsContaining)
      .mockReturnValue([groupA, groupB] as never)

    jest.mocked(AcApDocManager.instance.editor.getEntity).mockResolvedValue({
      status: AcEdPromptStatus.OK,
      objectId: 'ent-1'
    } as never)
    jest
      .mocked(AcApDocManager.instance.editor.getKeywords)
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        stringResult: 'Next'
      } as never)
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        stringResult: 'Accept'
      } as never)
      .mockResolvedValueOnce({
        status: AcEdPromptStatus.OK,
        stringResult: 'Add'
      } as never)
    jest
      .mocked(AcApDocManager.instance.editor.getSelection)
      .mockResolvedValue({
        status: AcEdPromptStatus.OK,
        value: { ids: ['ent-2'] }
      } as never)

    const cmd = new AcApGroupEditCmd()
    await cmd.execute({
      doc: { database: {} }
    } as never)

    expect(groupB.append).toHaveBeenCalledWith(['ent-2'])
    expect(groupA.append).not.toHaveBeenCalled()
  })
})
