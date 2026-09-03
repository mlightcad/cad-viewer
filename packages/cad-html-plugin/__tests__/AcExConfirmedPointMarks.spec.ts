/**
 * @jest-environment jsdom
 */

const isMobileNavUi = jest.fn(() => true)

jest.mock('../src/AcExHtmlDrawerSheet', () => ({
  acExHtmlIsMobileNavUi: () => isMobileNavUi()
}))

import { AcExConfirmedPointMarks } from '../src/AcExConfirmedPointMarks'

describe('AcExConfirmedPointMarks', () => {
  afterEach(() => {
    document.body.replaceChildren()
    isMobileNavUi.mockReturnValue(true)
  })

  it('renders plus marks on phone/pad and clears them on desktop', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const marks = new AcExConfirmedPointMarks(host, pos => ({
      x: pos.x * 10,
      y: pos.y * 10
    }))

    marks.setWorldPoints([
      { x: 1, y: 2 },
      { x: 3, y: 4 }
    ])
    const els = [...host.querySelectorAll('.mlcad-confirmed-point-mark')]
    expect(els).toHaveLength(2)
    expect((els[0] as HTMLElement).style.left).toBe('10px')
    expect((els[0] as HTMLElement).style.top).toBe('20px')

    isMobileNavUi.mockReturnValue(false)
    marks.setWorldPoints([{ x: 5, y: 6 }])
    expect(host.querySelectorAll('.mlcad-confirmed-point-mark')).toHaveLength(0)
  })

  it('shows marks when mobile nav UI is on from a coarse pointer, not only compact width', () => {
    isMobileNavUi.mockReturnValue(true)
    const host = document.createElement('div')
    document.body.appendChild(host)
    const marks = new AcExConfirmedPointMarks(host, pos => ({
      x: pos.x,
      y: pos.y
    }))
    marks.setWorldPoints([{ x: 8, y: 12 }])
    expect(host.querySelectorAll('.mlcad-confirmed-point-mark')).toHaveLength(1)
  })

  it('repositions existing marks on sync', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    let scale = 1
    const marks = new AcExConfirmedPointMarks(host, pos => ({
      x: pos.x * scale,
      y: pos.y * scale
    }))
    marks.setWorldPoints([{ x: 2, y: 4 }])
    const el = host.querySelector(
      '.mlcad-confirmed-point-mark'
    ) as HTMLElement
    expect(el.style.left).toBe('2px')

    scale = 5
    marks.sync()
    expect(el.style.left).toBe('10px')
    expect(el.style.top).toBe('20px')
  })
})
