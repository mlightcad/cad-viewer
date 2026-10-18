import { validateCadScript } from '../src/script/validateCadScript'

describe('validateCadScript', () => {
  test('rejects fetch, constructor, import, and unknown host members', () => {
    expect(validateCadScript('fetch("https://example.test")').error).toContain(
      'fetch'
    )
    expect(validateCadScript('cad.constructor').error).toContain('constructor')
    expect(validateCadScript('import x from "fs"').ok).toBe(false)
    expect(validateCadScript('return cad.foo()').error).toContain('unknown_api')
  })

  test('accepts the circle-count script and marks it as read-only', () => {
    const result = validateCadScript(`
      const counts = {}
      for (const e of cad.entities.where(e => e.type === 'Circle')) {
        counts[e.layer] = (counts[e.layer] || 0) + 1
      }
      return counts
    `)
    expect(result).toEqual({ ok: true, usesEdit: false })
  })

  test('marks cad.edit as a write', () => {
    const result = validateCadScript(`
      cad.edit.transaction('batch', tx => {
        tx.drawCircle({ center: { x: 0, y: 0 }, radius: 1 })
      })
    `)
    expect(result.ok).toBe(true)
    expect(result.usesEdit).toBe(true)
  })

  test('accepts symbol tables and block definitions', () => {
    const result = validateCadScript(`
      const layers = cad.tables.layerTable.records.map(record => record.name)
      const blocks = cad.blocks.filter(block => !block.isModelSpace)
      return { layers, blocks: blocks.map(block => block.name) }
    `)
    expect(result).toEqual({ ok: true, usesEdit: false })
  })
})
