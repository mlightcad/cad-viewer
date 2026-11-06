import {
  buildContextUsageBreakdown,
  contextUsagePercent,
  DEFAULT_CONTEXT_WINDOW,
  estimateTextTokens,
  formatTokenCount,
  resolveContextWindow
} from '../src/agent/contextUsage'

describe('resolveContextWindow', () => {
  it('returns the default for empty or unknown models', () => {
    expect(resolveContextWindow('')).toBe(DEFAULT_CONTEXT_WINDOW)
    expect(resolveContextWindow('mystery-model-xyz')).toBe(
      DEFAULT_CONTEXT_WINDOW
    )
  })

  it('resolves known provider families', () => {
    expect(resolveContextWindow('claude-sonnet-4-6')).toBe(200_000)
    expect(resolveContextWindow('gpt-5.4')).toBe(400_000)
    expect(resolveContextWindow('deepseek-v4-flash')).toBe(128_000)
    expect(resolveContextWindow('deepseek-ai/deepseek-vl2')).toBe(32_768)
  })
})

describe('contextUsagePercent', () => {
  it('clamps to 0–100 and ignores invalid windows', () => {
    expect(contextUsagePercent(64_000, 128_000)).toBe(50)
    expect(contextUsagePercent(200_000, 128_000)).toBe(100)
    expect(contextUsagePercent(-10, 128_000)).toBe(0)
    expect(contextUsagePercent(10, 0)).toBe(0)
  })
})

describe('formatTokenCount', () => {
  it('formats compact K/M labels', () => {
    expect(formatTokenCount(42)).toBe('42')
    expect(formatTokenCount(1_000)).toBe('1K')
    expect(formatTokenCount(54_200)).toBe('54.2K')
    expect(formatTokenCount(1_000_000)).toBe('1M')
    expect(formatTokenCount(1_250_000)).toBe('1.3M')
  })
})

describe('estimateTextTokens', () => {
  it('counts CJK denser than latin text', () => {
    expect(estimateTextTokens('abcd')).toBe(1)
    expect(estimateTextTokens('绘制直线')).toBe(4)
  })
})

describe('buildContextUsageBreakdown', () => {
  it('omits empty categories and sums to usedTokens', () => {
    const breakdown = buildContextUsageBreakdown({
      usedTokens: 10_000,
      systemPrompt: 'You are a CAD assistant. '.repeat(40),
      tools: [
        {
          name: 'execute_cad_script',
          description: 'Run a CAD script',
          schemaText: '{"type":"object","properties":{"script":{"type":"string"}}}'
        }
      ],
      messages: [
        {
          id: '1',
          role: 'user',
          parts: [{ type: 'text', text: 'Draw a 100x50 rectangle please.' }]
        }
      ]
    })

    const ids = breakdown.map(row => row.id)
    expect(ids).toContain('system')
    expect(ids).toContain('tools')
    expect(ids).toContain('conversation')
    expect(ids).not.toContain('images')
    expect(breakdown.reduce((sum, row) => sum + row.tokens, 0)).toBe(10_000)
  })

  it('includes images only when image parts exist', () => {
    const breakdown = buildContextUsageBreakdown({
      usedTokens: 5_000,
      systemPrompt: 'system',
      tools: [{ name: 'execute_cad_script', description: 'Run script' }],
      messages: [
        {
          id: '1',
          role: 'user',
          parts: [
            { type: 'text', text: 'Match this sketch' },
            {
              type: 'file',
              mediaType: 'image/png',
              url: 'data:image/png;base64,abc'
            }
          ]
        }
      ]
    })

    expect(breakdown.map(row => row.id)).toContain('images')
    expect(breakdown.reduce((sum, row) => sum + row.tokens, 0)).toBe(5_000)
  })
})
