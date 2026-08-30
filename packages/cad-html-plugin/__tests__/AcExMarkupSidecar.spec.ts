import {
  acExMarkupSidecarFileName,
  parseAcExMarkupSidecar,
  stringifyAcExMarkupSidecar
} from '../src/AcExMarkupSidecar'
import type { AcExMarkupSidecarFile } from '../src/AcExMarkupTypes'

describe('AcExMarkupSidecar', () => {
  const sample: AcExMarkupSidecarFile = {
    version: 1,
    drawingName: 'plan.dwg',
    markups: [
      {
        id: 'm1',
        type: 'arrow',
        style: { color: '#e53935', lineWeight: 70 },
        comment: '',
        status: 'open',
        author: '',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        geometry: {
          type: 'arrow',
          start: { x: 0, y: 0 },
          end: { x: 10, y: 5 }
        }
      },
      {
        id: 'm2',
        type: 'text',
        style: { color: '#e53935', fontSize: 12 },
        text: 'Note',
        comment: 'hello',
        status: 'question',
        author: 'reviewer',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        geometry: { type: 'text', position: { x: 1, y: 2 } }
      }
    ]
  }

  it('round-trips sidecar JSON as hairline', () => {
    const text = stringifyAcExMarkupSidecar(sample)
    expect(text).not.toMatch(/"strokeWidthWcs"\s*:/)
    const parsed = parseAcExMarkupSidecar(text)
    expect(parsed.version).toBe(1)
    expect(parsed.drawingName).toBe('plan.dwg')
    expect(parsed.markups).toHaveLength(2)
    expect(parsed.markups[0]?.type).toBe('arrow')
    expect(parsed.markups[0]?.style.lineWeight).toBe(0)
    expect(parsed.markups[1]?.text).toBe('Note')
  })

  it('keeps textHeightWcs and ignores legacy strokeWidthWcs', () => {
    const withWcs: AcExMarkupSidecarFile = {
      version: 1,
      markups: [
        {
          id: 'wcs',
          type: 'arrow',
          style: {
            color: '#e53935',
            lineWeight: 70,
            textHeightWcs: 0.6,
            strokeWidthWcs: 0.1
          },
          comment: '',
          status: 'open',
          author: '',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          geometry: {
            type: 'arrow',
            start: { x: 0, y: 0 },
            end: { x: 10, y: 5 }
          }
        }
      ]
    }
    const text = stringifyAcExMarkupSidecar(withWcs)
    expect(text).not.toMatch(/"strokeWidthWcs"\s*:/)
    const parsed = parseAcExMarkupSidecar(text)
    expect(parsed.markups[0]?.style.textHeightWcs).toBe(0.6)
    expect(parsed.markups[0]?.style.lineWeight).toBe(0)
    expect(parsed.markups[0]?.style.strokeWidthWcs).toBeUndefined()
  })

  it('rejects invalid payloads', () => {
    expect(() => parseAcExMarkupSidecar('not-json')).toThrow(/not JSON/)
    expect(() => parseAcExMarkupSidecar('{"version":2,"markups":[]}')).toThrow(
      /version 1/
    )
  })

  it('ignores legacy strokeWidthWcs and non-finite textHeightWcs', () => {
    const parsed = parseAcExMarkupSidecar(
      JSON.stringify({
        version: 1,
        markups: [
          {
            id: 'm1',
            type: 'text',
            style: {
              color: '#ff0000',
              fontSize: 12,
              textHeightWcs: Number.POSITIVE_INFINITY,
              strokeWidthWcs: 0.5
            },
            comment: '',
            status: 'open',
            author: '',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            geometry: { type: 'text', position: { x: 1, y: 2 } }
          }
        ]
      })
    )
    expect(parsed.markups[0]?.style.lineWeight).toBe(0)
    expect(parsed.markups[0]?.style.textHeightWcs).toBeUndefined()
    expect(parsed.markups[0]?.style.strokeWidthWcs).toBeUndefined()
  })

  it('suggests sidecar file names', () => {
    expect(acExMarkupSidecarFileName('plan.dwg')).toBe('plan.markup.json')
    expect(acExMarkupSidecarFileName('plan.html')).toBe('plan.markup.json')
    expect(acExMarkupSidecarFileName()).toBe('drawing.markup.json')
  })
})
