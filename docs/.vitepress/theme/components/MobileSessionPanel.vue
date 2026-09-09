<template>
  <div class="msp-panel" :class="panelClasses">
    <!-- Row 1: Draw-style accessory + title actions -->
    <div class="msp-accessory">
      <div class="msp-accessory-content">
        <!-- Draw-style accessory: color swatch + text-height -->
        <div class="msp-draw-style" role="toolbar" aria-label="Draw style">
          <button
            class="msp-swatch"
            type="button"
            :title="labels.color"
            :aria-label="labels.color"
          >
            <span class="msp-swatch-fill"></span>
          </button>
          <button
            class="msp-text-height"
            type="button"
            :title="labels.fontSize"
            :aria-label="labels.fontSize"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <text
                x="2"
                y="18"
                font-family="Georgia, Times New Roman, serif"
                font-size="16"
                font-weight="600"
                fill="currentColor"
              >A</text>
              <g stroke="#2dd4bf" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="none">
                <path d="M18 4v16" />
                <path d="M15.5 6.5 18 4l2.5 2.5" />
                <path d="M15.5 17.5 18 20l2.5-2.5" />
              </g>
            </svg>
          </button>
        </div>
      </div>

      <div class="msp-title-actions">
        <button
          v-if="!collapsed"
          class="msp-help"
          type="button"
          :title="labels.help"
          :aria-label="labels.help"
        >
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 15.2a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4zm1.6-5.35c-.62.36-1 .9-1 1.55h-1.5c0-1.18.6-2.05 1.45-2.55.62-.36.95-.7.95-1.25 0-.7-.55-1.2-1.4-1.2-.9 0-1.45.5-1.55 1.3H8.9C9.1 7.95 10.35 7 12.1 7c1.85 0 3.15 1.05 3.15 2.55 0 .95-.5 1.7-1.65 2.3z"/>
          </svg>
        </button>
        <button
          class="msp-collapse"
          type="button"
          :title="collapsed ? labels.expand : labels.collapse"
          :aria-label="collapsed ? labels.expand : labels.collapse"
          @click="collapsed = !collapsed"
        >
          <svg v-if="!collapsed" viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" width="18" height="18">
            <path fill="currentColor" d="M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
          </svg>
        </button>
      </div>

      <!-- Compact actions appended to row 1 -->
      <template v-if="collapsed">
        <div class="msp-actions-compact">
          <button
            class="msp-cancel"
            type="button"
            :title="labels.cancel"
            :aria-label="labels.cancel"
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="currentColor" d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.42 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.42L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4z"/>
            </svg>
          </button>
          <button
            class="msp-confirm"
            type="button"
            :title="labels.confirm"
            :aria-label="labels.confirm"
            :class="{ 'is-disabled': !allowNone }"
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="currentColor" d="M9.55 18.2 3.8 12.45l1.4-1.4 4.35 4.36 9.25-9.26 1.4 1.41z"/>
            </svg>
          </button>
        </div>
      </template>
    </div>

    <!-- Row 2: Prompt + keyword chips (hidden in compact mode) -->
    <div v-if="!collapsed" class="msp-prompt-row">
      <div class="msp-prompt" role="status">{{ promptText }}</div>
      <div v-if="keywords.length > 0" class="msp-chips">
        <button
          v-for="(kw, i) in keywords"
          :key="i"
          class="msp-chip"
          type="button"
          :disabled="!kw.enabled"
        >
          {{ kw.label }}
        </button>
      </div>
    </div>

    <!-- Metric sections (hidden in compact mode) -->
    <template v-if="!collapsed">
      <!-- Polar group: Length + Angle -->
      <div v-if="hasBasePoint" class="msp-group msp-group-polar">
        <div class="msp-metric-stack">
          <button class="msp-metric" type="button" disabled>
            <span class="msp-metric-label">{{ labels.length }}</span>
            <span class="msp-metric-value">{{ metricTexts.length }}</span>
          </button>
          <button class="msp-metric" type="button" disabled>
            <span class="msp-metric-label">{{ labels.angle }}</span>
            <span class="msp-metric-value">{{ metricTexts.angle }}</span>
          </button>
        </div>
        <div class="msp-actions">
          <button class="msp-cancel" type="button" :title="labels.cancel" :aria-label="labels.cancel">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="currentColor" d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.42 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.42L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Delta group: dX + dY -->
      <div v-if="hasBasePoint" class="msp-group msp-group-delta">
        <div class="msp-metric-stack">
          <button class="msp-metric" type="button" disabled>
            <span class="msp-metric-label">{{ labels.dx }}</span>
            <span class="msp-metric-value">{{ metricTexts.dx }}</span>
          </button>
          <button class="msp-metric" type="button" disabled>
            <span class="msp-metric-label">{{ labels.dy }}</span>
            <span class="msp-metric-value">{{ metricTexts.dy }}</span>
          </button>
        </div>
        <div class="msp-actions">
          <button
            class="msp-confirm"
            type="button"
            :title="labels.confirm"
            :aria-label="labels.confirm"
            :class="{ 'is-disabled': !allowNone }"
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="currentColor" d="M9.55 18.2 3.8 12.45l1.4-1.4 4.35 4.36 9.25-9.26 1.4 1.41z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Absolute group: X + Y -->
      <div v-if="!hasBasePoint" class="msp-group msp-group-abs">
        <div class="msp-metric-stack">
          <button class="msp-metric" type="button" disabled>
            <span class="msp-metric-label">{{ labels.x }}</span>
            <span class="msp-metric-value">{{ metricTexts.x }}</span>
          </button>
          <button class="msp-metric" type="button" disabled>
            <span class="msp-metric-label">{{ labels.y }}</span>
            <span class="msp-metric-value">{{ metricTexts.y }}</span>
          </button>
        </div>
        <div class="msp-actions">
          <button class="msp-cancel" type="button" :title="labels.cancel" :aria-label="labels.cancel">
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="currentColor" d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7a1 1 0 0 0-1.41 1.42L10.59 12l-4.9 4.89a1 1 0 1 0 1.42 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.42L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4z"/>
            </svg>
          </button>
          <button
            class="msp-confirm"
            type="button"
            :title="labels.confirm"
            :aria-label="labels.confirm"
            :class="{ 'is-disabled': !allowNone }"
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="currentColor" d="M9.55 18.2 3.8 12.45l1.4-1.4 4.35 4.36 9.25-9.26 1.4 1.41z"/>
            </svg>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData, useRoute } from 'vitepress'

// ---------------------------------------------------------------------------
// i18n translations
// ---------------------------------------------------------------------------
interface Labels {
  length: string
  angle: string
  dx: string
  dy: string
  x: string
  y: string
  confirm: string
  cancel: string
  help: string
  collapse: string
  expand: string
  color: string
  fontSize: string
  /** Default prompt shown when prop `prompt` is not provided. */
  defaultPrompt: string
}

const TRANSLATIONS: Record<string, Labels> = {
  zh: {
    length: '长度',
    angle: '角度',
    dx: 'ΔX',
    dy: 'ΔY',
    x: 'X',
    y: 'Y',
    confirm: '确定',
    cancel: '取消',
    help: '帮助',
    collapse: '收起',
    expand: '展开',
    color: '颜色',
    fontSize: '文字大小',
    defaultPrompt: '指定第一个点',
  },
  en: {
    length: 'Length',
    angle: 'Angle',
    dx: 'ΔX',
    dy: 'ΔY',
    x: 'X',
    y: 'Y',
    confirm: 'Confirm',
    cancel: 'Cancel',
    help: 'Help',
    collapse: 'Collapse',
    expand: 'Expand',
    color: 'Color',
    fontSize: 'Text height',
    defaultPrompt: 'Specify first point',
  },
  ja: {
    length: '長さ',
    angle: '角度',
    dx: 'ΔX',
    dy: 'ΔY',
    x: 'X',
    y: 'Y',
    confirm: '確定',
    cancel: 'キャンセル',
    help: 'ヘルプ',
    collapse: '折りたたむ',
    expand: '展開',
    color: '色',
    fontSize: '文字高さ',
    defaultPrompt: '最初の点を指定',
  },
  ko: {
    length: '길이',
    angle: '각도',
    dx: 'ΔX',
    dy: 'ΔY',
    x: 'X',
    y: 'Y',
    confirm: '확인',
    cancel: '취소',
    help: '도움말',
    collapse: '접기',
    expand: '펼치기',
    color: '색상',
    fontSize: '글자 높이',
    defaultPrompt: '첫 번째 점 지정',
  },
  ar: {
    length: 'الطول',
    angle: 'الزاوية',
    dx: 'ΔX',
    dy: 'ΔY',
    x: 'X',
    y: 'Y',
    confirm: 'تأكيد',
    cancel: 'إلغاء',
    help: 'مساعدة',
    collapse: 'طي',
    expand: 'توسيع',
    color: 'اللون',
    fontSize: 'ارتفاع النص',
    defaultPrompt: 'حدد النقطة الأولى',
  },
  cs: {
    length: 'Délka',
    angle: 'Úhel',
    dx: 'ΔX',
    dy: 'ΔY',
    x: 'X',
    y: 'Y',
    confirm: 'Potvrdit',
    cancel: 'Zrušit',
    help: 'Nápověda',
    collapse: 'Sbalit',
    expand: 'Rozbalit',
    color: 'Barva',
    fontSize: 'Výška textu',
    defaultPrompt: 'Zadejte první bod',
  },
  tr: {
    length: 'Uzunluk',
    angle: 'Açı',
    dx: 'ΔX',
    dy: 'ΔY',
    x: 'X',
    y: 'Y',
    confirm: 'Onayla',
    cancel: 'İptal',
    help: 'Yardım',
    collapse: 'Daralt',
    expand: 'Genişlet',
    color: 'Renk',
    fontSize: 'Metin yüksekliği',
    defaultPrompt: 'İlk noktayı belirtin',
  },
}

// VitePress locale detection — use route path for SSR safety
const route = useRoute()
const currentLang = computed(() => {
  const path = route.path || ''
  const match = path.match(/\/(zh|ja|ko|ar|cs|tr)\/guide/)
  if (match) {
    const l = match[1]
    if (l === 'zh') return 'zh'
    if (l === 'ja') return 'ja'
    if (l === 'ko') return 'ko'
    if (l === 'ar') return 'ar'
    if (l === 'cs') return 'cs'
    if (l === 'tr') return 'tr'
  }
  try {
    const data = useData()
    const dl = (data.locale as any)?.value
    if (dl) {
      const ls = String(dl).toLowerCase()
      if (ls.startsWith('zh')) return 'zh'
      if (ls.startsWith('ja')) return 'ja'
      if (ls.startsWith('ko')) return 'ko'
      if (ls.startsWith('ar')) return 'ar'
      if (ls.startsWith('cs')) return 'cs'
      if (ls.startsWith('tr')) return 'tr'
    }
  } catch {
    // ignore
  }
  return 'en'
})

const labels = computed(() => TRANSLATIONS[currentLang.value] || TRANSLATIONS.en)

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
const props = withDefaults(defineProps<{
  /** Start in compact mode? */
  initialCompact?: boolean
  /** Override the default localized prompt. */
  prompt?: string
  /** Whether a base point has been picked (shows Length/Angle/dX/dY instead of X/Y). */
  hasBasePoint?: boolean
  /** Whether the Confirm button is enabled. */
  allowNone?: boolean
  /** Keyword chips (command options). */
  keywords?: Array<{ label: string; enabled: boolean }>
  /** Live metric values. */
  metricTexts?: {
    length: string
    angle: string
    dx: string
    dy: string
    x: string
    y: string
  }
}>(), {
  initialCompact: false,
  prompt: '',
  hasBasePoint: true,
  allowNone: true,
  keywords: () => [],
  metricTexts: () => ({
    length: '3272.347',
    angle: '21',
    dx: '3050',
    dy: '1185.6453',
    x: '1234.56',
    y: '789.01',
  }),
})

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const collapsed = ref<boolean>(props.initialCompact)

// ---------------------------------------------------------------------------
// Computed
// ---------------------------------------------------------------------------
/** Prompt text — use prop override, else the locale-specific default. */
const promptText = computed(() =>
  (props.prompt || labels.value.defaultPrompt).replace(/[：:]\s*$/, '')
)

const panelClasses = computed(() => ({
  'is-collapsed': collapsed.value,
  'is-relative': props.hasBasePoint && !collapsed.value,
  'is-absolute': !props.hasBasePoint && !collapsed.value,
}))
</script>

<style>
/* ==========================================================================
   Mobile Session Panel — documentation demo component
   ========================================================================== */

.msp-panel {
  color-scheme: dark;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(28, 30, 34, 0.96);
  color: #e8eaed;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.35);
  box-sizing: border-box;
  margin: 0 auto;
  transition: all 0.25s ease;
}

/* ---- Row 1: Accessory + title actions ---- */
.msp-accessory {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}
.msp-panel.is-collapsed .msp-accessory {
  flex-wrap: nowrap;
  padding-bottom: 0;
  border-bottom: 0;
  gap: 6px;
  min-height: unset;
}

.msp-accessory-content {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.msp-panel.is-collapsed .msp-accessory-content {
  flex: 0 0 auto;
  overflow: hidden;
}

/* ---- Draw-style controls ---- */
.msp-draw-style {
  display: flex;
  align-items: center;
  gap: 8px;
}
.msp-swatch,
.msp-text-height {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: #e8eaed;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  line-height: 0;
}
.msp-swatch:hover,
.msp-text-height:hover {
  border-color: rgba(255, 255, 255, 0.35);
  background: rgba(255, 255, 255, 0.1);
}
.msp-swatch {
  position: relative;
}
.msp-swatch-fill {
  display: block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.4);
  background: #1a8cff;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.3);
}
.msp-text-height svg {
  display: block;
  width: 18px;
  height: 18px;
}

/* ---- Title actions ---- */
.msp-title-actions {
  display: flex;
  align-items: center;
  gap: 0;
  margin-left: auto;
  flex: 0 0 auto;
}
.msp-panel.is-collapsed .msp-title-actions {
  margin-left: auto;
}

.msp-help,
.msp-collapse {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #9aa0a6;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
}
.msp-help:hover,
.msp-collapse:hover {
  color: #08e8de;
}
.msp-help svg,
.msp-collapse svg {
  display: block;
  width: 18px;
  height: 18px;
}

/* ---- Row 2: Prompt ---- */
.msp-prompt-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  padding-top: 2px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  box-sizing: border-box;
}
.msp-prompt {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: #e8eaed;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  text-align: left;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

/* ---- Keyword chips ---- */
.msp-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.msp-chip {
  min-height: 28px;
  padding: 3px 10px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: #08e8de;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}
.msp-chip:disabled {
  opacity: 0.45;
  cursor: default;
}

/* ---- Compact mode ---- */
.msp-panel.is-collapsed {
  flex-direction: row;
  align-items: center;
  gap: 6px;
  height: 56px;
  padding: 0 10px;
  border-radius: 12px;
}
.msp-panel.is-collapsed .msp-accessory {
  flex: 1;
}

.msp-actions-compact {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  margin-left: 0;
  flex: 0 0 auto;
}

/* ---- Metric groups ---- */
.msp-group {
  display: flex;
  align-items: stretch;
  gap: 8px;
  min-width: 0;
}
.msp-metric-stack {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}

.msp-metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 2px 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  min-height: 28px;
  width: 100%;
  font-family: inherit;
  cursor: default;
}
.msp-metric-label {
  flex: 0 0 auto;
  color: #9aa0a6;
  font-size: 12px;
}
.msp-metric-value {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-size: 13px;
}

/* ---- Actions (confirm / cancel buttons) ---- */
.msp-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex: 0 0 auto;
  align-self: stretch;
  padding-left: 12px;
  border-left: 1px solid rgba(255, 255, 255, 0.12);
}

/* ---- Confirm / Cancel buttons ---- */
.msp-cancel,
.msp-confirm {
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 50%;
  border: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  cursor: pointer;
  color: #fff;
  box-sizing: border-box;
  flex: 0 0 36px;
}
.msp-cancel svg,
.msp-confirm svg {
  display: block;
  width: 18px;
  height: 18px;
}
.msp-cancel {
  background: #5c6370;
}
.msp-confirm {
  background: #1a8cff;
}
.msp-confirm.is-disabled {
  opacity: 0.35;
  cursor: default;
}
</style>
