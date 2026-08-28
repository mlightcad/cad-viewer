import { AcApReadingModeCmd } from '../src/command/AcApReadingModeCmd'

describe('AcApReadingModeCmd', () => {
  it('delegates to view.toggleReadingMode', async () => {
    const toggleReadingMode = jest.fn()
    const cmd = new AcApReadingModeCmd()

    await cmd.execute({ view: { toggleReadingMode } } as never)

    expect(toggleReadingMode).toHaveBeenCalledTimes(1)
  })
})
