import type { AcApLocale } from '@mlightcad/cad-simple-viewer'

/** Ribbon strings for the CAD Agent group. */
export interface AgentChromeStrings {
  group: string
  command: string
  tooltip: string
}

/** Ribbon copy for every locale. Kept apart from the chat-panel catalog. */
export const agentChrome: Record<AcApLocale, AgentChromeStrings> = {
  en: {
    group: 'Agent',
    command: 'Agent',
    tooltip:
      'Open the CAD Agent palette tab to draw geometry using natural language.'
  },
  zh: {
    group: '智能体',
    command: '智能体',
    tooltip: '打开 CAD Agent 工具面板，使用自然语言描述并绘制图形。'
  },
  ja: {
    group: 'エージェント',
    command: 'エージェント',
    tooltip:
      'CAD エージェント パレット タブを開き、自然言語で図形を作成します。'
  },
  ko: {
    group: '에이전트',
    command: '에이전트',
    tooltip: 'CAD 에이전트 팔레트 탭을 열어 자연어로 형상을 그립니다.'
  },
  tr: {
    group: 'Ajan',
    command: 'Ajan',
    tooltip:
      'Doğal dil kullanarak geometri çizmek için CAD Ajanı panel sekmesini açın.'
  },
  cs: {
    group: 'Agent AI',
    command: 'Agent AI',
    tooltip:
      'Otevře kartu palety CAD Agent pro kreslení geometrie přirozeným jazykem.'
  },
  ar: {
    group: 'الوكيل',
    command: 'الوكيل',
    tooltip: 'افتح لوحة CAD Agent لإنشاء هندسة باستخدام اللغة الطبيعية.'
  }
}
