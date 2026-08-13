import type { AcTrHtmlGroup } from '@mlightcad/three-renderer'

import {
  isMeasurementVisible,
  MEASUREMENT_LAYER,
  MEASUREMENT_LIVE_LAYER,
  resetMeasurementVisibility,
  setMeasurementVisible
} from '../src/command/measure/AcApMeasurementStore'
import type { AcTrView2d } from '../src/view'

function makeGroup(
  id: string,
  layoutId: string | undefined
): AcTrHtmlGroup {
  return {
    id,
    layer: MEASUREMENT_LAYER,
    layoutId,
    visible: true,
    setVisible: jest.fn(function (this: { visible: boolean }, visible: boolean) {
      this.visible = visible
    })
  } as unknown as AcTrHtmlGroup
}

function createView(groups: AcTrHtmlGroup[], layoutId: string) {
  const setVisible = jest.fn()
  const view = {
    activeLayoutBtrId: layoutId,
    isDirty: false,
    htmlTransientManager: {
      groupsOnLayer(layer: string) {
        return groups.filter(group => group.layer === layer)
      },
      setVisible
    }
  } as unknown as AcTrView2d
  return { view, setVisible }
}

describe('AcApMeasurementVisibility', () => {
  afterEach(() => {
    resetMeasurementVisibility()
  })

  it('hides only measurements on the active layout', () => {
    const current = makeGroup('current', 'layout-a')
    const other = makeGroup('other', 'layout-b')
    const unscoped = makeGroup('unscoped', undefined)
    const { view, setVisible } = createView(
      [current, other, unscoped],
      'layout-a'
    )

    setMeasurementVisible(view, false)

    expect(isMeasurementVisible()).toBe(false)
    expect(current.setVisible).toHaveBeenCalledWith(false)
    expect(unscoped.setVisible).toHaveBeenCalledWith(false)
    expect(other.setVisible).not.toHaveBeenCalled()
    expect(setVisible).toHaveBeenCalledWith(false, MEASUREMENT_LIVE_LAYER)
    expect(view.isDirty).toBe(true)
  })

  it('shows measurements on the active layout without revealing other layouts', () => {
    const current = makeGroup('current', 'layout-a')
    const other = makeGroup('other', 'layout-b')
    const { view } = createView([current, other], 'layout-a')

    setMeasurementVisible(view, false)
    setMeasurementVisible(view, true)

    expect(isMeasurementVisible()).toBe(true)
    expect(current.setVisible).toHaveBeenLastCalledWith(true)
    expect(other.setVisible).not.toHaveBeenCalled()
  })
})
