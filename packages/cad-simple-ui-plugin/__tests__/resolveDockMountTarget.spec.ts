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

import { acuiResolveDockMountTarget } from '../src/config/resolveDockMountTarget'

describe('acuiResolveDockMountTarget', () => {
  afterEach(() => {
    mockCurView.container = undefined
  })

  it('returns explicit mountTarget when provided', () => {
    const host = { contains: () => true } as unknown as HTMLElement
    const mountTarget = {} as HTMLElement

    expect(acuiResolveDockMountTarget(host, mountTarget)).toBe(mountTarget)
  })

  it('returns canvas parent when it is inside host', () => {
    const canvasParent = {} as HTMLElement
    const canvas = { parentElement: canvasParent }
    const host = {
      contains: (node: unknown) => node === canvasParent
    } as unknown as HTMLElement

    mockCurView.container = canvas
    expect(acuiResolveDockMountTarget(host)).toBe(canvasParent)
  })

  it('falls back to host when canvas parent is outside host', () => {
    const canvasParent = {} as HTMLElement
    const canvas = { parentElement: canvasParent }
    const host = {
      contains: () => false
    } as unknown as HTMLElement

    mockCurView.container = canvas
    expect(acuiResolveDockMountTarget(host)).toBe(host)
  })

  it('skips dock-main when it has become the canvas parent', () => {
    const canvasParent = { classList: { contains: () => false } } as unknown as HTMLElement
    const dockMain = {
      classList: { contains: (name: string) => name === 'ml-ex-ui-dock-main' },
      parentElement: canvasParent
    } as unknown as HTMLElement
    const host = {
      contains: (node: unknown) => node === dockMain || node === canvasParent
    } as unknown as HTMLElement

    mockCurView.container = { parentElement: dockMain }
    expect(acuiResolveDockMountTarget(host)).toBe(canvasParent)
  })

  it('skips toolbar-main when it has become the canvas parent', () => {
    const canvasParent = {
      classList: { contains: () => false }
    } as unknown as HTMLElement
    const toolbarMain = {
      classList: {
        contains: (name: string) => name === 'ml-ex-ui-toolbar-main'
      },
      parentElement: canvasParent
    } as unknown as HTMLElement
    const host = {
      contains: (node: unknown) =>
        node === toolbarMain || node === canvasParent
    } as unknown as HTMLElement

    mockCurView.container = { parentElement: toolbarMain }
    expect(acuiResolveDockMountTarget(host)).toBe(canvasParent)
  })
})
