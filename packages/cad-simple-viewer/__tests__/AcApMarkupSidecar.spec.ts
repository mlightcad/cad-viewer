import {
  markupSidecarFileName,
  parseMarkupSidecar,
  stringifyMarkupSidecar
} from '../src/command/markup/AcApMarkupSidecar'
import type { AcApMarkupSidecarFile } from '../src/command/markup/AcApMarkupTypes'

describe('AcApMarkupSidecar', () => {
  it('round-trips a text markup', () => {
    const file: AcApMarkupSidecarFile = {
      version: 1,
      drawingName: 'demo.dwg',
      markups: [
        {
          id: 'markup-1',
          type: 'text',
          style: { color: '#ff0000' },
          text: 'Hello',
          comment: 'note',
          status: 'open',
          author: 'alice',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          geometry: { type: 'text', position: { x: 1, y: 2 } }
        }
      ]
    }
    const text = stringifyMarkupSidecar(file)
    const parsed = parseMarkupSidecar(text)
    expect(parsed.version).toBe(1)
    expect(parsed.drawingName).toBe('demo.dwg')
    expect(parsed.markups).toHaveLength(1)
    expect(parsed.markups[0].type).toBe('text')
    expect(parsed.markups[0].geometry).toEqual({
      type: 'text',
      position: { x: 1, y: 2 }
    })
  })

  it('suggests sidecar file names', () => {
    expect(markupSidecarFileName('plan.dwg')).toBe('plan.markup.json')
    expect(markupSidecarFileName('plan.DXF')).toBe('plan.markup.json')
    expect(markupSidecarFileName()).toBe('drawing.markup.json')
  })

  it('rejects invalid version', () => {
    expect(() => parseMarkupSidecar('{"version":2,"markups":[]}')).toThrow(
      /version 1/
    )
  })
})
