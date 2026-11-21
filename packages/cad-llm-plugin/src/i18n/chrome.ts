import type { AcApLocale } from '@mlightcad/cad-simple-viewer'

/** Ribbon strings for the AI model settings group. */
export interface LlmChromeStrings {
  group: string
  command: string
  tooltip: string
}

/** Ribbon copy for every locale. */
export const llmChrome: Record<AcApLocale, LlmChromeStrings> = {
  en: {
    group: 'AI Model',
    command: 'Model\nSettings',
    tooltip:
      'Configure the AI model providers and API keys used by the CAD Agent and by PDF text recognition (OCR).'
  },
  zh: {
    group: 'AI 模型',
    command: '模型设置',
    tooltip:
      '配置 CAD 智能体和 PDF 文字识别（OCR）使用的 AI 模型服务商和 API 密钥。'
  },
  ja: {
    group: 'AI モデル',
    command: 'モデル\n設定',
    tooltip:
      'CAD エージェントと PDF の文字認識（OCR）で使用する AI モデルのプロバイダと API キーを設定します。'
  },
  ko: {
    group: 'AI 모델',
    command: '모델\n설정',
    tooltip:
      'CAD 에이전트와 PDF 문자 인식(OCR)에 사용하는 AI 모델 공급자와 API 키를 설정합니다.'
  },
  tr: {
    group: 'Yapay Zekâ Modeli',
    command: 'Model\nAyarları',
    tooltip:
      'CAD Ajanı ve PDF metin tanıma (OCR) tarafından kullanılan yapay zekâ modeli sağlayıcılarını ve API anahtarlarını yapılandırın.'
  },
  cs: {
    group: 'Model AI',
    command: 'Nastavení\nmodelu',
    tooltip:
      'Nastaví poskytovatele modelů AI a klíče API, které používá CAD agent a rozpoznávání textu v PDF (OCR).'
  },
  ar: {
    group: 'نموذج الذكاء الاصطناعي',
    command: 'إعدادات\nالنموذج',
    tooltip:
      'إعداد مزودي نماذج الذكاء الاصطناعي ومفاتيح API التي يستخدمها وكيل CAD والتعرف على النص في PDF (OCR).'
  }
}
