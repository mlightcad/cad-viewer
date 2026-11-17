import type { paddleOcrEn } from './en.js'

export const paddleOcrAr = {
  ocrLabel: 'PaddleOCR (محلي)',
  ocrKeywordDisplay: 'PaddleOCR(P)',
  ocrKeywordLocal: 'PaddleOCR',
  ocrKeywordGlobal: 'PaddleOcr'
} satisfies Record<keyof typeof paddleOcrEn, string>
