/**
 * @jest-environment jsdom
 */

import {
  acapPaddleOcrConfigure,
  acapPaddleOcrResolvedWasmPaths
} from '../src/AcApPaddleOcrConfig'

describe('acapPaddleOcrResolvedWasmPaths', () => {
  beforeEach(() => {
    acapPaddleOcrConfigure({ wasmPaths: undefined })
  })

  it('resolves relative paths against document.baseURI', () => {
    acapPaddleOcrConfigure({ wasmPaths: './vendor/onnxruntime/' })
    const resolved = acapPaddleOcrResolvedWasmPaths()
    expect(resolved).toBe(
      new URL('./vendor/onnxruntime/', document.baseURI).href
    )
    expect(resolved).not.toContain('/assets/vendor/')
  })

  it('keeps absolute URLs', () => {
    acapPaddleOcrConfigure({
      wasmPaths: 'https://cdn.example/ort/'
    })
    expect(acapPaddleOcrResolvedWasmPaths()).toBe('https://cdn.example/ort/')
  })
})
