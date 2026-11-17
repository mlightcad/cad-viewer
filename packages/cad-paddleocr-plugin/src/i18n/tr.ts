import type { paddleOcrEn } from './en.js'

export const paddleOcrTr = {
  ocrLabel: 'PaddleOCR (yerel)',
  ocrKeywordDisplay: 'PaddleOCR(P)',
  ocrKeywordLocal: 'PaddleOCR',
  ocrKeywordGlobal: 'PaddleOcr'
} satisfies Record<keyof typeof paddleOcrEn, string>
