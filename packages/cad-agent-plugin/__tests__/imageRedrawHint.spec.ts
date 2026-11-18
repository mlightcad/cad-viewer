import type { ModelMessage } from 'ai'

import {
  appendImageRedrawHint,
  IMAGE_REDRAW_HINT
} from '../src/agent/imageRedrawHint'

const image = { type: 'image' as const, image: 'AAAA', mediaType: 'image/png' }

describe('appendImageRedrawHint', () => {
  test('adds the redraw hint to the latest user turn with an image', () => {
    const messages: ModelMessage[] = [
      {
        role: 'user',
        content: [{ type: 'text', text: '按照图片中的内容绘制图纸' }, image]
      }
    ]
    const result = appendImageRedrawHint(messages)
    const content = result[0].content as Array<{ type: string; text?: string }>
    expect(content[content.length - 1]).toEqual({
      type: 'text',
      text: IMAGE_REDRAW_HINT
    })
    expect(IMAGE_REDRAW_HINT).toContain('cad.redraw.compare')
    expect(IMAGE_REDRAW_HINT).toMatch(/sheet border \/ title block/)
    expect(IMAGE_REDRAW_HINT).toMatch(/do NOT call execute_cad_script/)
    expect(IMAGE_REDRAW_HINT).toMatch(/do not silently omit the frame/)
    // Input stays untouched (the UI transcript must not show the hint).
    expect((messages[0].content as unknown[]).length).toBe(2)
  })

  test('hints again after a text-only frame-gate question', () => {
    const messages: ModelMessage[] = [
      {
        role: 'user',
        content: [{ type: 'text', text: '按照图片绘制' }, image]
      },
      {
        role: 'assistant',
        content: [{ type: 'text', text: '也要重绘图框和标题栏吗？' }]
      },
      { role: 'user', content: [{ type: 'text', text: '要，一起画' }] }
    ]
    const result = appendImageRedrawHint(messages)
    const content = result[2].content as Array<{ type: string; text?: string }>
    expect(content[content.length - 1]).toEqual({
      type: 'text',
      text: IMAGE_REDRAW_HINT
    })
  })

  test('leaves text-only turns after a completed redraw alone', () => {
    const messages: ModelMessage[] = [
      { role: 'user', content: [{ type: 'text', text: 'draw' }, image] },
      {
        role: 'assistant',
        content: [
          {
            type: 'tool-call',
            toolCallId: '1',
            toolName: 'execute_cad_script',
            input: { script: 'return 1' }
          }
        ]
      },
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: '1',
            toolName: 'execute_cad_script',
            output: { type: 'text', value: 'ok' }
          }
        ]
      },
      { role: 'assistant', content: [{ type: 'text', text: 'done' }] },
      { role: 'user', content: [{ type: 'text', text: 'make it bigger' }] }
    ]
    expect(appendImageRedrawHint(messages)).toBe(messages)
  })

  test('recognizes image file parts', () => {
    const messages: ModelMessage[] = [
      {
        role: 'user',
        content: [{ type: 'file', data: 'AAAA', mediaType: 'image/jpeg' }]
      }
    ]
    const content = appendImageRedrawHint(messages)[0].content as unknown[]
    expect(content).toHaveLength(2)
  })
})
