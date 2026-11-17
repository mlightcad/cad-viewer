import type { ModelMessage } from 'ai'

import {
  appendImageRedrawHint,
  IMAGE_REDRAW_HINT
} from '../src/agent/imageRedrawHint'

const image = { type: 'image' as const, image: 'AAAA', mediaType: 'image/png' }

describe('appendImageRedrawHint', () => {
  test('adds the redraw hint to the latest user turn with an image', () => {
    const messages: ModelMessage[] = [
      { role: 'user', content: [{ type: 'text', text: '按照图片中的内容绘制图纸' }, image] }
    ]
    const result = appendImageRedrawHint(messages)
    const content = result[0].content as Array<{ type: string; text?: string }>
    expect(content.at(-1)).toEqual({ type: 'text', text: IMAGE_REDRAW_HINT })
    // Input stays untouched (the UI transcript must not show the hint).
    expect((messages[0].content as unknown[]).length).toBe(2)
  })

  test('leaves text-only turns and older image turns alone', () => {
    const messages: ModelMessage[] = [
      { role: 'user', content: [{ type: 'text', text: 'draw' }, image] },
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
