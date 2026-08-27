/** Unit tests for the drawing-layout toolbar button and submenu. */

const mockSetCurrentLayoutBtrId = jest.fn()

const mockLayouts = [
  {
    layoutName: 'Model',
    tabOrder: 0,
    blockTableRecordId: 'btr-model'
  },
  {
    layoutName: 'Layout1',
    tabOrder: 2,
    blockTableRecordId: 'btr-layout1'
  },
  {
    layoutName: 'Layout2',
    tabOrder: 1,
    blockTableRecordId: 'btr-layout2'
  }
]

let currentSpaceId = 'btr-model'

jest.mock('@mlightcad/cad-simple-viewer', () => ({
  AcApDocManager: {
    instance: {
      get curDocument() {
        return {
          database: {
            currentSpaceId,
            objects: {
              layout: {
                newIterator: () => mockLayouts
              }
            }
          }
        }
      }
    }
  }
}))

jest.mock('@mlightcad/data-model', () => ({
  acdbHostApplicationServices: () => ({
    layoutManager: {
      setCurrentLayoutBtrId: mockSetCurrentLayoutBtrId
    }
  })
}))

import {
  acuiCreateLayoutToolbarChildren,
  acuiCreateLayoutToolbarItem,
  acuiListDocumentLayouts,
  acuiSwitchCurrentLayout
} from '../src/config/createLayoutToolbarItem'
import { acuiIsDynamicToolbarChildren } from '../src/config/toolbarItemUtils'

describe('acuiCreateLayoutToolbarItem', () => {
  beforeEach(() => {
    currentSpaceId = 'btr-model'
    mockSetCurrentLayoutBtrId.mockReset()
  })

  it('lists layouts including model space ordered by tabOrder', () => {
    expect(acuiListDocumentLayouts().map(layout => layout.name)).toEqual([
      'Model',
      'Layout2',
      'Layout1'
    ])
  })

  it('marks the current space as active', () => {
    currentSpaceId = 'btr-layout2'
    const active = acuiListDocumentLayouts().filter(layout => layout.isActive)
    expect(active).toEqual([
      expect.objectContaining({
        name: 'Layout2',
        blockTableRecordId: 'btr-layout2'
      })
    ])
  })

  it('creates a menu parent with a live children getter', () => {
    const item = acuiCreateLayoutToolbarItem()
    expect(item.id).toBe('layout')
    expect(item.childrenUi).toBe('menu')
    expect(acuiIsDynamicToolbarChildren(item)).toBe(true)
    expect(item.children?.map(child => child.label)).toEqual([
      'Model',
      'Layout2',
      'Layout1'
    ])
  })

  it('switches the current layout when a submenu item is chosen', () => {
    const children = acuiCreateLayoutToolbarChildren()
    const layout1 = children.find(child => child.label === 'Layout1')
    layout1?.action?.()
    expect(mockSetCurrentLayoutBtrId).toHaveBeenCalledWith('btr-layout1')
  })

  it('highlights the active layout in the submenu', () => {
    currentSpaceId = 'btr-layout1'
    const children = acuiCreateLayoutToolbarChildren()
    expect(
      children.find(child => child.label === 'Layout1')?.toggle?.getValue()
    ).toBe(true)
    expect(
      children.find(child => child.label === 'Model')?.toggle?.getValue()
    ).toBe(false)
  })

  it('forwards acuiSwitchCurrentLayout to the layout manager', () => {
    acuiSwitchCurrentLayout('btr-layout2')
    expect(mockSetCurrentLayoutBtrId).toHaveBeenCalledWith('btr-layout2')
  })
})
