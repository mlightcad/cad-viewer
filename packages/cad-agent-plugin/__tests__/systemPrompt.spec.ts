import { buildCadAgentSystemPrompt } from '../src/agent/systemPrompt'

jest.mock('@mlightcad/cad-agent-core', () => ({
  CAD_SCRIPT_API_SUMMARY: '<<script api>>',
  CAD_REDRAW_SPEC_SUMMARY: '<<redraw spec>>'
}))

describe('buildCadAgentSystemPrompt', () => {
  test.each(['simple', 'high-inference'] as const)(
    'embeds the script API and the image redraw spec (%s)',
    mode => {
      const prompt = buildCadAgentSystemPrompt(mode)
      expect(prompt).toContain('<<script api>>')
      expect(prompt).toContain('IMAGE REDRAW (EVIDENCE-TRACKED)')
      expect(prompt).toContain('<<redraw spec>>')
      expect(prompt).toContain('cad.redraw.draw(spec)')
      expect(prompt).toContain('cad.redraw.compare(spec')
      expect(prompt).not.toContain('{{AGENT_MODE_POLICY}}')
    }
  )

  test('lets an annotated redraw override the ignore-annotation defaults', () => {
    const prompt = buildCadAgentSystemPrompt('simple')
    expect(prompt).toMatch(/OVERRIDES the "ignore dimensions \/ ignore text"/)
    expect(prompt).toMatch(/Never\s+assume millimeters/)
  })

  test('requires pixel compare and gates title-block frames before draw', () => {
    const prompt = buildCadAgentSystemPrompt('simple')
    expect(prompt).toMatch(/required before finishing an image\s+redraw/)
    expect(prompt).toContain('cad.redraw.compare(spec')
    expect(prompt).toContain('compareQueued: cmp')
    expect(prompt).toContain('FRAME GATE')
    expect(prompt).toMatch(/FIRST reply must be a short text question only/)
    expect(prompt).toMatch(/Do not silently default to omitting the frame/)
  })
})
