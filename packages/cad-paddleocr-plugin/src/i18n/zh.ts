import type { paddleOcrEn } from './en.js'

export const paddleOcrZh = {
  ocrLabel: 'PaddleOCR（本地）',
  ocrKeywordDisplay: 'PaddleOCR(P)',
  ocrKeywordLocal: 'PaddleOCR',
  ocrKeywordGlobal: 'PaddleOcr'
} satisfies Record<keyof typeof paddleOcrEn, string>
