/** @jest-environment jsdom */

import {
  setAcExHtmlParentChildIcon,
  setupAcExHtmlToolbarFlyouts
} from '../src/AcExHtmlToolbarFlyout'

function mountFixture(html: string) {
  document.body.innerHTML = html
}

function stripHtml(id: string, children: string) {
  return `<div id="${id}-wrap" hidden><div id="${id}">${children}</div></div>`
}

describe('setupAcExHtmlToolbarFlyouts', () => {
  afterEach(() => {
    document.body.replaceChildren()
  })

  function mountAllStrips() {
    mountFixture(`
      <button type="button" id="mlcad-measure-menu-btn"></button>
      <button type="button" id="mlcad-markup-menu-btn"></button>
      <button type="button" id="mlcad-snap-menu-btn"></button>
      <button type="button" id="mlcad-zoom-menu-btn"></button>
      <button type="button" id="mlcad-lang-btn"></button>
      ${stripHtml('mlcad-measure-strip', '<button type="button" data-action="measure" data-measure-mode="distance"></button>')}
      ${stripHtml('mlcad-markup-strip', '<button type="button" data-action="markup" data-markup-mode="cloud"></button>')}
      ${stripHtml('mlcad-snap-strip', '<button type="button" id="mlcad-ortho-btn"></button>')}
      ${stripHtml(
        'mlcad-zoom-strip',
        '<button type="button" data-action="fit"></button><button type="button" data-action="zoom-original"></button>'
      )}
      ${stripHtml(
        'mlcad-locale-strip',
        '<button type="button" data-locale="en"></button><button type="button" data-locale="zh"></button>'
      )}
    `)
  }

  it('toggles a sticky strip and keeps it open on canvas click', () => {
    mountAllStrips()
    const onItemClick = jest.fn()
    const flyouts = setupAcExHtmlToolbarFlyouts({ onItemClick })
    const parent = document.getElementById('mlcad-measure-menu-btn')
    const wrap = document.getElementById('mlcad-measure-strip-wrap')

    parent?.click()
    expect(wrap?.hidden).toBe(false)
    expect(parent?.classList.contains('is-menu-open')).toBe(true)

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(wrap?.hidden).toBe(false)

    document
      .querySelector<HTMLButtonElement>('[data-measure-mode="distance"]')
      ?.click()
    expect(onItemClick).toHaveBeenCalled()
    expect(wrap?.hidden).toBe(false)

    parent?.click()
    expect(wrap?.hidden).toBe(true)
    flyouts.close()
  })

  it('closes a sticky strip when another strip parent is clicked', () => {
    mountAllStrips()
    setupAcExHtmlToolbarFlyouts({ onItemClick: jest.fn() })

    document.getElementById('mlcad-measure-menu-btn')?.click()
    expect(document.getElementById('mlcad-measure-strip-wrap')?.hidden).toBe(
      false
    )

    document.getElementById('mlcad-snap-menu-btn')?.click()
    expect(document.getElementById('mlcad-measure-strip-wrap')?.hidden).toBe(
      true
    )
    expect(document.getElementById('mlcad-snap-strip-wrap')?.hidden).toBe(false)
  })

  it('closes a dismissible language strip on canvas click and locale select', () => {
    mountAllStrips()
    const onLocaleSelect = jest.fn()
    setupAcExHtmlToolbarFlyouts({
      onItemClick: jest.fn(),
      onLocaleSelect,
      getLocale: () => 'en'
    })
    const wrap = document.getElementById('mlcad-locale-strip-wrap')

    document.getElementById('mlcad-lang-btn')?.click()
    expect(wrap?.hidden).toBe(false)
    expect(
      document
        .querySelector('[data-locale="en"]')
        ?.classList.contains('active')
    ).toBe(true)

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(wrap?.hidden).toBe(true)

    document.getElementById('mlcad-lang-btn')?.click()
    document.querySelector<HTMLButtonElement>('[data-locale="zh"]')?.click()
    expect(onLocaleSelect).toHaveBeenCalledWith('zh')
    expect(wrap?.hidden).toBe(true)
  })

  it('closes a dismissible zoom strip on canvas click and tool select', () => {
    mountAllStrips()
    const onItemClick = jest.fn()
    setupAcExHtmlToolbarFlyouts({ onItemClick })
    const wrap = document.getElementById('mlcad-zoom-strip-wrap')

    document.getElementById('mlcad-zoom-menu-btn')?.click()
    expect(wrap?.hidden).toBe(false)

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(wrap?.hidden).toBe(true)

    document.getElementById('mlcad-zoom-menu-btn')?.click()
    document.querySelector<HTMLButtonElement>('[data-action="fit"]')?.click()
    expect(onItemClick).toHaveBeenCalled()
    expect(wrap?.hidden).toBe(true)
  })

  it('copies a child icon onto the parent button', () => {
    mountFixture(
      '<button id="mlcad-zoom-menu-btn">parent</button><button id="child"><span>icon</span></button>'
    )
    setAcExHtmlParentChildIcon(
      'mlcad-zoom-menu-btn',
      document.getElementById('child') as HTMLElement
    )
    expect(document.getElementById('mlcad-zoom-menu-btn')?.innerHTML).toBe(
      '<span>icon</span>'
    )
  })
})
