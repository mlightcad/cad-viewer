<template>
  <div class="umt-wrap">
    <!-- Phone frame -->
    <div class="umt-phone">
      <!-- Notch -->
      <div class="umt-notch"></div>

      <!-- Screen (canvas area) -->
      <div class="umt-screen">
        <svg class="umt-grid" viewBox="0 0 100 160" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <pattern id="umt-grid" width="6" height="6" patternUnits="userSpaceOnUse">
              <path d="M 6 0 L 0 0 0 6" fill="none" stroke="var(--uml-grid)" stroke-width="0.3"/>
            </pattern>
          </defs>
          <rect width="100" height="160" fill="url(#umt-grid)"/>
        </svg>
        <svg class="umt-shapes" viewBox="0 0 100 160" preserveAspectRatio="none" aria-hidden="true">
          <rect x="14" y="22" width="34" height="26" fill="none" stroke="var(--uml-shape)" stroke-width="0.55"/>
          <circle cx="72" cy="36" r="11" fill="none" stroke="var(--uml-shape)" stroke-width="0.55"/>
          <polyline points="22,64 48,64 58,74 82,74" fill="none" stroke="var(--uml-shape)" stroke-width="0.55"/>
          <g stroke="var(--uml-shape)" fill="none" stroke-width="0.55">
            <rect x="20" y="92" width="60" height="40" rx="2"/>
            <circle cx="50" cy="112" r="4"/>
            <path d="M20 112 h60 M50 92 v40"/>
          </g>
        </svg>
        <!-- Measurement badge sample -->
        <div class="umt-badge" v-if="showBadge">3.25 m</div>
      </div>

      <!-- Bottom Tab Bar -->
      <div class="umt-tabbar" role="tablist" aria-label="Mobile bottom tabs">
        <button
          v-for="t in tabs"
          :key="t.key"
          class="umt-tab"
          :class="{
            'is-disabled': disabledKeys.includes(t.key),
            'is-active': activeKey === t.key,
          }"
          :disabled="disabledKeys.includes(t.key)"
          :title="t.title"
        >
          <span class="umt-tab__icon" v-html="t.icon" aria-hidden="true"></span>
          <span class="umt-tab__label">{{ t.label }}</span>
        </button>

        <!-- Home indicator (iOS-style) -->
        <div class="umt-home" aria-hidden="true"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type Mode = 'readonly' | 'review'
const props = withDefaults(defineProps<{
  /** Viewer mode; in review mode the Review tab is enabled (active), otherwise disabled (grayed). */
  mode?: Mode
  /** Show the "3.25 m" measurement badge on the canvas (default true). */
  showBadge?: boolean
}>(), {
  mode: 'readonly',
  showBadge: true,
})

// Icons — same inline-SVG snippets used by @mlightcad/cad-simple-viewer/icons and cad-viewer
const ICON_ZOOM_EXTENT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M9.3333 14.125 5.875 10.6667V14.125H9.3333Zm4.7917-3.4583-3.4583 3.4583H14.125V10.6667ZM10.6667 5.875 14.125 9.3333V5.875H10.6667ZM5.875 9.3333 9.3333 5.875H5.875V9.3333Zm9.2083 5.475c1.2333-1.3 1.9083-3.0333 1.9083-4.825-.0083-3.325-2.35-6.1833-5.6083-6.8417C8.125 2.4833 4.85 4.2 3.55 7.2583c-1.3 3.0583-.275 6.6083 2.4583 8.5 2.725 1.8917 6.4167 1.6 8.8167-.6917.0917-.0833.175-.175.2583-.2583Zm1.2583.5917 2.575 2.575c-.3167.3167-.625.625-.9417.9417-.8583-.8583-1.7167-1.7167-2.575-2.575-3.4083 2.9-8.4917 2.5917-11.525-.6917S.9417 7.275 4.1083 4.1083C7.2667.9417 12.3667.8417 15.65 3.875s3.5917 8.1167.6917 11.525Z"/></svg>'

const ICON_MEASURE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" fill-rule="evenodd" d="M1.5 7h17v6h-17ZM4.25 7h1v2.5h-1ZM7.5 7h.75v1.5H7.5ZM10.25 7h1v2.5h-1ZM13.5 7h.75v1.5H13.5ZM16.25 7h1v2.5h-1Z"/></svg>'

const ICON_ANNOTATION =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20" fill="none"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12.4 3.25H5.5A2.25 2.25 0 0 0 3.25 5.5v9A2.25 2.25 0 0 0 5.5 16.75h9A2.25 2.25 0 0 0 16.75 14.5V8.6"/><g transform="rotate(45 13.2 6.7)"><rect x="11.7" y="1.55" width="3" height="7.45" rx="1.45"/><path d="M11.7 3.2h3"/><path d="M11.7 9 13.2 12.15 14.7 9"/><rect x="12.8" y="7.05" width="0.8" height="1.2" rx="0.4"/></g></g></svg>'

const ICON_LAYER =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m434.8 137.65l-149.36-68.1c-16.19-7.4-42.69-7.4-58.88 0L77.3 137.65c-17.6 8-17.6 21.09 0 29.09l148 67.5c16.89 7.7 44.69 7.7 61.58 0l148-67.5c17.52-8 17.52-21.1-.08-29.09M160 308.52l-82.7 37.11c-17.6 8-17.6 21.1 0 29.1l148 67.5c16.89 7.69 44.69 7.69 61.58 0l148-67.5c17.6-8 17.6-21.1 0-29.1l-79.94-38.47"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m160 204.48l-82.8 37.16c-17.6 8-17.6 21.1 0 29.1l148 67.49c16.89 7.7 44.69 7.7 61.58 0l148-67.49c17.7-8 17.7-21.1.1-29.1L352 204.48"/></svg>'

const ICON_LAYOUT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><rect x="2" y="2" width="8.2" height="5" rx="1.2" fill="currentColor"/><rect x="2" y="8.5" width="8.2" height="9.5" rx="1.2" fill="currentColor"/><rect x="11.7" y="2" width="6.3" height="10" rx="1.2" fill="currentColor"/><rect x="11.7" y="13.5" width="6.3" height="4.5" rx="1.2" fill="currentColor"/></svg>'

const ICON_SETTINGS =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M8.08 2.1h3.84l.32 1.52a6.4 6.4 0 0 1 1.36.78l1.48-.64 1.92 1.92-.64 1.48c.3.42.54.88.78 1.36l1.52.32v3.84l-1.52.32a6.4 6.4 0 0 1-.78 1.36l.64 1.48-1.92 1.92-1.48-.64a6.4 6.4 0 0 1-1.36.78l-.32 1.52H8.08l-.32-1.52a6.4 6.4 0 0 1-1.36-.78l-1.48.64-1.92-1.92.64-1.48a6.4 6.4 0 0 1-.78-1.36L1.34 11.92V8.08l1.52-.32c.24-.48.48-.94.78-1.36l-.64-1.48 1.92-1.92 1.48.64c.42-.3.88-.54 1.36-.78L8.08 2.1ZM10 7.2A2.8 2.8 0 1 0 10 12.8 2.8 2.8 0 0 0 10 7.2Z"/></svg>'

const tabs = [
  { key: 'zoom',   label: 'Zoom',    title: 'Zoom tools', icon: ICON_ZOOM_EXTENT },
  { key: 'measure',label: 'Measure', title: 'Measure tools', icon: ICON_MEASURE },
  { key: 'review', label: 'Review',  title: 'Markup (Review) tools', icon: ICON_ANNOTATION },
  { key: 'layers', label: 'Layers',  title: 'Layer drawer', icon: ICON_LAYER },
  { key: 'layout', label: 'Layout',  title: 'Switch layout', icon: ICON_LAYOUT },
  { key: 'setting',label: 'Setting', title: 'Display / Input settings', icon: ICON_SETTINGS },
]

const disabledKeys = computed(() => (props.mode === 'readonly' ? ['review'] : []))
const activeKey = props.mode === 'review' ? 'review' : 'measure'
</script>

<style>
.umt-wrap {
  margin: 20px auto 28px;
  max-width: 340px;
  color-scheme: light dark;
}

.umt-phone {
  position: relative;
  width: 100%;
  aspect-ratio: 9 / 19;
  /* Realistic dark device bezel — same in light/dark docs so the black
     canvas and floating dark tool bar read as one cohesive device. */
  background: #141518;
  color: #e2e8f0;
  --uml-grid: rgba(255, 255, 255, 0.1);
  --uml-shape: #ffffff;
  border-radius: 34px;
  padding: 10px;
  box-shadow:
    0 22px 44px -24px rgba(15, 23, 42, 0.65),
    0 0 0 2px rgba(255, 255, 255, 0.06) inset;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Top notch */
.umt-notch {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 32%;
  height: 22px;
  background: #050506;
  border-radius: 999px;
  z-index: 2;
}

/* Canvas */
.umt-screen {
  position: relative;
  flex: 1;
  border-radius: 20px;
  overflow: hidden;
  background: #000;
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.umt-grid, .umt-shapes {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.umt-badge {
  position: absolute;
  top: 52%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--vp-c-brand-1, #2f5fe0);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 4px;
  box-shadow: 0 4px 12px -6px rgba(47, 95, 224, 0.6);
  pointer-events: none;
}

/* Tab bar — same deep dark background + white icons as the real mobile viewer bottom bar */
.umt-tabbar {
  position: relative;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 2px;
  padding: 8px 6px calc(8px + 10px);
  background: #1E1F22;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.07);
  box-shadow:
    0 12px 24px -14px rgba(0, 0, 0, 0.75),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.umt-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 2px;
  padding: 6px 2px 4px;
  border: none;
  background: transparent;
  color: #fff;
  cursor: default;
  border-radius: 10px;
  min-width: 0;
  transition: background .15s ease, color .15s ease, opacity .15s ease;
  position: relative;
}
.umt-tab:hover { background: rgba(255,255,255,0.06); }
.umt-tab.is-active {
  color: #fff;
  background: rgba(255,255,255,0.08);
  font-weight: 500;
}
.umt-tab.is-disabled {
  color: rgba(255,255,255,0.38);
  opacity: 0.9;
  cursor: not-allowed;
  filter: none;
}
.umt-tab__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  font-size: 22px;
  color: inherit;
}
.umt-tab__label {
  font-size: 10.5px;
  white-space: nowrap;
  line-height: 1.1;
}

/* Home indicator (inside the rounded tab bar) */
.umt-home {
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  width: 38%;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.5);
}
</style>
