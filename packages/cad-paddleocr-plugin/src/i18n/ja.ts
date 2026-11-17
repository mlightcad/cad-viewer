import type { paddleOcrEn } from './en.js'

export const paddleOcrJa = {
  ocrLabel: 'PaddleOCR（ローカル）',
  ocrKeywordDisplay: 'PaddleOCR(P)',
  ocrKeywordLocal: 'PaddleOCR',
  ocrKeywordGlobal: 'PaddleOcr'
} satisfies Record<keyof typeof paddleOcrEn, string>
