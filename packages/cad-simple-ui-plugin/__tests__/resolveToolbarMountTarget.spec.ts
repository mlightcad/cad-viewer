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

import { resolveToolbarMountTarget } from '../src/config/resolveToolbarMountTarget'

describe('resolveToolbarMountTarget', () => {
  afterEach(() => {
    mockCurView.container = undefined
  })

  it('returns explicit mountTarget when provided', () => {
    const host = { contains: () => true } as unknown as HTMLElement
    const mountTarget = {} as HTMLElement

    expect(resolveToolbarMountTarget(host, mountTarget)).toBe(mountTarget)
  })

  it('returns canvas container when it is inside host', () => {
    const canvasContainer = {} as HTMLElement
    const host = {
      contains: (node: unknown) => node === canvasContainer
    } as unknown as HTMLElement

    mockCurView.container = canvasContainer
    expect(resolveToolbarMountTarget(host)).toBe(canvasContainer)
  })

  it('falls back to host when canvas container is outside host', () => {
    const canvasContainer = {} as HTMLElement
    const host = {
      contains: () => false
    } as unknown as HTMLElement

    mockCurView.container = canvasContainer
    expect(resolveToolbarMountTarget(host)).toBe(host)
  })
})
