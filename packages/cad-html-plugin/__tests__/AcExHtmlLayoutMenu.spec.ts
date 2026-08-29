/** @jest-environment jsdom */

import { setupAcExHtmlLayoutMenu } from '../src/AcExHtmlLayoutMenu'

describe('setupAcExHtmlLayoutMenu', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  function mountButton() {
    document.body.innerHTML =
      '<button type="button" id="mlcad-layout-menu-btn" aria-expanded="false"></button>'
  }

  it('opens a menu of layouts and switches on click', () => {
    mountButton()
    const onSelect = jest.fn()
    let active = 'btr-model'
    setupAcExHtmlLayoutMenu({
      layouts: [
        { btrId: 'btr-model', name: 'Model' },
        { btrId: 'btr-ps1', name: 'Layout1' }
      ],
      getActiveLayoutBtrId: () => active,
      onSelect: btrId => {
        active = btrId
        onSelect(btrId)
      }
    })

    document.getElementById('mlcad-layout-menu-btn')?.click()
    const menu = document.querySelector('.mlcad-dropdown')
    expect(menu).toBeTruthy()
    expect(
      menu
        ?.querySelector('[data-layout-id="btr-model"]')
        ?.classList.contains('active')
    ).toBe(true)

    document
      .querySelector<HTMLButtonElement>('[data-layout-id="btr-ps1"]')
      ?.click()
    expect(onSelect).toHaveBeenCalledWith('btr-ps1')
    expect(document.querySelector('.mlcad-dropdown')).toBeNull()
  })

  it('does not notify when the active layout is chosen again', () => {
    mountButton()
    const onSelect = jest.fn()
    setupAcExHtmlLayoutMenu({
      layouts: [{ btrId: 'btr-model', name: 'Model' }],
      getActiveLayoutBtrId: () => 'btr-model',
      onSelect
    })

    document.getElementById('mlcad-layout-menu-btn')?.click()
    document
      .querySelector<HTMLButtonElement>('[data-layout-id="btr-model"]')
      ?.click()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('closes on outside click', () => {
    mountButton()
    setupAcExHtmlLayoutMenu({
      layouts: [{ btrId: 'btr-model', name: 'Model' }],
      getActiveLayoutBtrId: () => 'btr-model',
      onSelect: jest.fn()
    })

    document.getElementById('mlcad-layout-menu-btn')?.click()
    expect(document.querySelector('.mlcad-dropdown')).toBeTruthy()

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(document.querySelector('.mlcad-dropdown')).toBeNull()
  })

  it('closes sibling flyouts when the menu opens', () => {
    mountButton()
    const closeOtherFlyouts = jest.fn()
    setupAcExHtmlLayoutMenu({
      layouts: [{ btrId: 'btr-model', name: 'Model' }],
      getActiveLayoutBtrId: () => 'btr-model',
      onSelect: jest.fn(),
      closeOtherFlyouts
    })

    document.getElementById('mlcad-layout-menu-btn')?.click()
    expect(closeOtherFlyouts).toHaveBeenCalledTimes(1)
  })
})
