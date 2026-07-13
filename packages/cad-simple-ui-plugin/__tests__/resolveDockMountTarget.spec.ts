/** Unit tests for dock mount target resolution. */
const mockCurView: { container?: { parentElement?: HTMLElement | null } } = {}

jest.mock('@mlightcad/cad-simple-viewer', () => ({
  AcApDocManager: {
    instance: {
      get curView() {
        return mockCurView
      }
    }
  }
}))

import { resolveDockMountTarget } from '../src/config/resolveDockMountTarget'

describe('resolveDockMountTarget', () => {
  afterEach(() => {
    mockCurView.container = undefined
  })

  it('returns explicit mountTarget when provided', () => {
    const host = { contains: () => true } as unknown as HTMLElement
    const mountTarget = {} as HTMLElement

    expect(resolveDockMountTarget(host, mountTarget)).toBe(mountTarget)
  })

  it('returns canvas parent when it is inside host', () => {
    const canvasParent = {} as HTMLElement
    const canvas = { parentElement: canvasParent }
    const host = {
      contains: (node: unknown) => node === canvasParent
    } as unknown as HTMLElement

    mockCurView.container = canvas
    expect(resolveDockMountTarget(host)).toBe(canvasParent)
  })

  it('falls back to host when canvas parent is outside host', () => {
    const canvasParent = {} as HTMLElement
    const canvas = { parentElement: canvasParent }
    const host = {
      contains: () => false
    } as unknown as HTMLElement

    mockCurView.container = canvas
    expect(resolveDockMountTarget(host)).toBe(host)
  })
})
