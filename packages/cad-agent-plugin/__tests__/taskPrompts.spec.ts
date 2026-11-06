import { agentAr } from '../src/i18n/ar'
import { agentCs } from '../src/i18n/cs'
import { agentEn } from '../src/i18n/en'
import { agentTr } from '../src/i18n/tr'
import { agentZh } from '../src/i18n/zh'
import {
  AGENT_TASK_CATEGORY_LABEL_KEYS,
  AGENT_TASK_CATEGORY_ORDER,
  AGENT_TASKS
} from '../src/ui/taskPrompts'

const locales = {
  en: agentEn,
  zh: agentZh,
  tr: agentTr,
  cs: agentCs,
  ar: agentAr
} as const

describe('AGENT_TASKS', () => {
  test('covers every category and has unique ids', () => {
    const ids = AGENT_TASKS.map(task => task.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const category of AGENT_TASK_CATEGORY_ORDER) {
      expect(AGENT_TASKS.some(task => task.category === category)).toBe(true)
    }
  })

  test('every locale defines category, title, and prompt strings', () => {
    for (const messages of Object.values(locales)) {
      for (const category of AGENT_TASK_CATEGORY_ORDER) {
        const key = AGENT_TASK_CATEGORY_LABEL_KEYS[category]
        expect(messages[key as keyof typeof messages]).toBeTruthy()
      }
      for (const task of AGENT_TASKS) {
        const title = messages[task.titleKey as keyof typeof messages]
        const prompt = messages[task.promptKey as keyof typeof messages]
        expect(typeof title).toBe('string')
        expect((title as string).trim().length).toBeGreaterThan(0)
        expect(typeof prompt).toBe('string')
        expect((prompt as string).trim().length).toBeGreaterThan(20)
      }
    }
  })
})
