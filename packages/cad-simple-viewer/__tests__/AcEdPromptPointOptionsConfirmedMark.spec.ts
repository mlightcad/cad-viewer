import { AcEdPromptPointOptions } from '../src/editor/input/prompt/AcEdPromptPointOptions'

describe('AcEdPromptPointOptions.showConfirmedPointMark', () => {
  it('defaults to undefined so the input manager can apply phone/pad auto behavior', () => {
    const options = new AcEdPromptPointOptions('Specify point')
    expect(options.showConfirmedPointMark).toBeUndefined()
  })

  it('allows an explicit override', () => {
    const options = new AcEdPromptPointOptions('Specify point')
    options.showConfirmedPointMark = true
    expect(options.showConfirmedPointMark).toBe(true)
    options.showConfirmedPointMark = false
    expect(options.showConfirmedPointMark).toBe(false)
    options.showConfirmedPointMark = undefined
    expect(options.showConfirmedPointMark).toBeUndefined()
  })
})
