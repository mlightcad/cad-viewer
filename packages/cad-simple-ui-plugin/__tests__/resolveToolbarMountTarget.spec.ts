/** Unit tests for toolbar mount target resolution. */
const mockCurView: { container?: HTMLElement | null } = {}

jest.mock('@mlightcad/cad-simple-viewer', () => ({
  AcApDocManager: {
    instance: {
      get curView() {
        return mockCurView.container
          ? { container: mockCurView.container }
          : undefined
      }
    }
  }
}))

import { acuiResolveToolbarMountTarget } from '../src/config/resolveToolbarMountTarget'

describe('acuiResolveToolbarMountTarget', () => {
  afterEach(() => {
    mockCurView.container = undefined
  })

  it('returns explicit mountTarget when provided', () => {
    const host = { contains: () => true } as unknown as HTMLElement
    const mountTarget = {} as HTMLElement

    expect(acuiResolveToolbarMountTarget(host, mountTarget)).toBe(mountTarget)
  })

  it('returns canvas parent when it is inside host', () => {
    const canvasParent = {} as HTMLElement
    const canvasContainer = { parentElement: canvasParent } as HTMLElement
    const host = {
      contains: (node: unknown) => node === canvasParent
    } as unknown as HTMLElement

    mockCurView.container = canvasContainer
    expect(acuiResolveToolbarMountTarget(host)).toBe(canvasParent)
  })

  it('returns canvas container when parent is outside host', () => {
    const canvasParent = {} as HTMLElement
    const canvasContainer = { parentElement: canvasParent } as HTMLElement
    const host = {
      contains: (node: unknown) => node === canvasContainer
    } as unknown as HTMLElement

    mockCurView.container = canvasContainer
    expect(acuiResolveToolbarMountTarget(host)).toBe(canvasContainer)
  })

  it('falls back to host when canvas container is outside host', () => {
    const canvasContainer = {} as HTMLElement
    const host = {
      contains: () => false
    } as unknown as HTMLElement

    mockCurView.container = canvasContainer
    expect(acuiResolveToolbarMountTarget(host)).toBe(host)
  })
})
