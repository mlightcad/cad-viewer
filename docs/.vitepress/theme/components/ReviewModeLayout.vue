<template>
  <div class="umr-viewport">
    <div class="umr-viewport__inner">
      <!-- Canvas area: toolbar overlay on right, dock overlay on far right (no Ribbon, no status bar) -->
      <div class="umr-body">
        <!-- Canvas -->
        <div class="umr-canvas">
          <svg class="umr-canvas__grid" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <pattern id="umr-grid" width="5" height="5" patternUnits="userSpaceOnUse">
                <path d="M 5 0 L 0 0 0 5" fill="none" stroke="var(--uml-grid)" stroke-width="0.25"/>
              </pattern>
            </defs>
            <rect width="100" height="60" fill="url(#umr-grid)"/>
          </svg>
          <svg class="umr-canvas__shapes" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
            <rect x="20" y="18" width="28" height="20" fill="none" stroke="var(--uml-shape)" stroke-width="0.6"/>
            <circle cx="72" cy="28" r="10" fill="none" stroke="var(--uml-shape)" stroke-width="0.6"/>
            <polyline points="30,44 50,44 58,52 78,52" fill="none" stroke="var(--uml-shape)" stroke-width="0.6"/>
          </svg>

          <!-- Read-only badge -->
          <div v-if="mode === 'readonly'" class="umr-badge umr-badge--read">READ-ONLY</div>
          <div v-if="mode === 'review'" class="umr-badge umr-badge--review">REVIEW MODE</div>
        </div>

        <!-- Vertical right toolbar -->
        <div class="umr-vertbar">
          <button v-for="b in coreButtons" :key="b.label" class="umr-btn umr-btn--icon" :title="b.label">
            <span class="uml-ico" v-html="b.icon" aria-hidden="true"></span>
          </button>
          <div class="umr-vertbar__sep"></div>
          <button class="umr-btn umr-btn--icon umr-group__trigger" title="Measure">
            <span class="uml-ico" v-html="icons.measure" aria-hidden="true"></span>
            <span class="umr-group__chev">▾</span>
          </button>
          <!-- Markup (review only) -->
          <template v-if="mode === 'review'">
            <button class="umr-btn umr-btn--icon umr-group__trigger" title="Markup">
              <span class="uml-ico" v-html="icons.markupTools" aria-hidden="true"></span>
              <span class="umr-group__chev">▾</span>
            </button>
          </template>
          <div class="umr-vertbar__sep"></div>
          <button class="umr-btn umr-btn--icon" title="Reading mode">
            <span class="uml-ico" v-html="icons.reading" aria-hidden="true"></span>
          </button>
          <button class="umr-btn umr-btn--icon" title="Switch background">
            <span class="uml-ico" v-html="icons.switchBg" aria-hidden="true"></span>
          </button>
        </div>

        <!-- Docked panels -->
        <div class="umr-dock">
          <div class="umr-dock__tabs">
            <span
              v-for="t in dockTabs"
              :key="t"
              class="umr-dock__tab"
              :class="{ 'is-active': t === activeDock }"
            >{{ t }}</span>
          </div>
          <div class="umr-dock__body">
            <div class="umr-dock__list">
              <div v-for="row in dockRows" :key="row" class="umr-dock__row">
                <span class="umr-dock__bullet"></span>
                <span>{{ row }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type Mode = 'readonly' | 'review'
const props = withDefaults(defineProps<{
  mode?: Mode
}>(), { mode: 'readonly' })

const ICON_SELECT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M10.4379 15.2979h.002l4.86-4.86-9.722-4.86 4.86 9.72Zm7.562-5.298-3.434 3.434 3.2 3.2-1.132 1.132-3.2-3.2-3.434 3.434-7.6-15.6 15.6 7.6Z"/></svg>'
const ICON_PAN =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M15.08 12.8537l.002-.002V5.5897c0-.422-.652-.414-.652 0v3.466c0 .938-1.482.95-1.482 0v-4.83c0-.414-.6381-.414-.6381 0h-.014v4.83c.014.95-1.482.95-1.482 0V3.4437c0-.42-.638-.414-.638 0v5.612c0 .95-1.494.95-1.494 0V4.2317c0-.408-.64-.42-.64 0v6.756c0 .802-1.094 1.088-1.494.388-.26-.446-.518-.892-.776-1.338-.338-.482-1.1-.15-.794.38.326.566.652 1.132.978 1.698.006.012.014.026.02.04.552.946 1.106 1.89 1.658 2.834.19.3.422.578.666.802h-.006c.672.61 1.528.964 2.418 1.052.888.06 1.7921-.124 2.5601-.612.3-.19.572-.416.816-.68.326-.368.57-.776.734-1.204.176-.482.258-.97.258-1.494Zm-.91-8.608-.004-.002c.958-.38 2.058.244 2.058 1.346v7.266c0 .652-.108 1.29-.332 1.894-.216.564-.53 1.114-.964 1.576-.318.34-.666.632-1.046.884-.978.612-2.1461.862-3.2601.774-1.128-.102-2.228-.564-3.098-1.352-.326-.292-.612-.646-.87-1.034-.558-.96-1.114-1.92-1.672-2.88l-.012-.028c-.326-.568-.652-1.138-.978-1.706-.59-1.018.068-2.186 1.156-2.336.536-.074 1.126.116 1.562.72.026.028.04.062.054.096.04.074.082.146.122.218V4.2337c0-1.176 1.244-1.788 2.202-1.278.42-1.278 2.378-1.264 2.792-.014.9721-.51 2.2221.102 2.2221 1.284v.06c.022-.014.046-.026.068-.04Z"/></svg>'
const ICON_ZOOM_EXTENT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M9.3333 14.125 5.875 10.6667V14.125H9.3333Zm4.7917-3.4583-3.4583 3.4583H14.125V10.6667ZM10.6667 5.875 14.125 9.3333V5.875H10.6667ZM5.875 9.3333 9.3333 5.875H5.875V9.3333Zm9.2083 5.475c1.2333-1.3 1.9083-3.0333 1.9083-4.825-.0083-3.325-2.35-6.1833-5.6083-6.8417C8.125 2.4833 4.85 4.2 3.55 7.2583c-1.3 3.0583-.275 6.6083 2.4583 8.5 2.725 1.8917 6.4167 1.6 8.8167-.6917.0917-.0833.175-.175.2583-.2583Zm1.2583.5917 2.575 2.575c-.3167.3167-.625.625-.9417.9417-.8583-.8583-1.7167-1.7167-2.575-2.575-3.4083 2.9-8.4917 2.5917-11.525-.6917S.9417 7.275 4.1083 4.1083C7.2667.9417 12.3667.8417 15.65 3.875s3.5917 8.1167.6917 11.525Z"/></svg>'
const ICON_ZOOM_BOX =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M15.0833 14.8083c1.2333-1.3 1.9083-3.0333 1.9083-4.825-.0083-3.325-2.35-6.1833-5.6083-6.8417C8.125 2.4833 4.85 4.2 3.55 7.2583c-1.3 3.0583-.275 6.6083 2.4583 8.5 2.725 1.8917 6.4167 1.6 8.8167-.6917.0917-.0833.175-.175.2583-.2583Zm1.2583.5917 2.575 2.575c-.3167.3167-.625.625-.9417.9417-.8583-.8583-1.7167-1.7167-2.575-2.575-3.4083 2.9-8.4917 2.5917-11.525-.6917C.8417 12.3667.9417 7.275 4.1083 4.1083 7.2667.9417 12.3667.8417 15.65 3.875s3.5917 8.1167.6917 11.525Zm-3.55-2.6083V7.2083H7.2083v5.5833h5.5833ZM5.875 5.875h8.25v8.25H5.875V5.875Z"/></svg>'
const ICON_LAYER =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m434.8 137.65l-149.36-68.1c-16.19-7.4-42.69-7.4-58.88 0L77.3 137.65c-17.6 8-17.6 21.09 0 29.09l148 67.5c16.89 7.7 44.69 7.7 61.58 0l148-67.5c17.52-8 17.52-21.1-.08-29.09M160 308.52l-82.7 37.11c-17.6 8-17.6 21.1 0 29.1l148 67.5c16.89 7.69 44.69 7.69 61.58 0l148-67.5c17.6-8 17.6-21.1 0-29.1l-79.94-38.47"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m160 204.48l-82.8 37.16c-17.6 8-17.6 21.1 0 29.1l148 67.49c16.89 7.7 44.69 7.7 61.58 0l148-67.49c17.7-8 17.7-21.1.1-29.1L352 204.48"/></svg>'
const ICON_READING_MODE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><rect x="2.5" y="2.5" width="15" height="15" rx="1.5" fill="#fff" stroke="currentColor" stroke-width="1.2"/><g fill="none" stroke="#000" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 6.5h4.5M5.5 10h7M5.5 13.5h9"/><path d="M13.25 6.5v4.25h-3.25"/></g></svg>'
const ICON_SWITCH_BG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" fill="currentColor"/><rect x="14" y="14" width="7" height="7" fill="none" stroke="currentColor" stroke-width="1"/><path d="M12 4a8 8 0 0 1 7.25 7.25" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><path d="M20.75 10 L17.25 10 L19 12.5 Z" fill="currentColor"/><path d="M12 20a8 8 0 0 1-8-8" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><path d="M6 14 L2.5 14 L4 11 Z" fill="currentColor"/></svg>'
const ICON_MEASURE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" fill-rule="evenodd" d="M1.5 7h17v6h-17ZM4.25 7h1v2.5h-1ZM7.5 7h.75v1.5H7.5ZM10.25 7h1v2.5h-1ZM13.5 7h.75v1.5H13.5ZM16.25 7h1v2.5h-1Z"/></svg>'
const ICON_ANNOTATION =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20" fill="none"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12.4 3.25H5.5A2.25 2.25 0 0 0 3.25 5.5v9A2.25 2.25 0 0 0 5.5 16.75h9A2.25 2.25 0 0 0 16.75 14.5V8.6"/><g transform="rotate(45 13.2 6.7)"><rect x="11.7" y="1.55" width="3" height="7.45" rx="1.45"/><path d="M11.7 3.2h3"/><path d="M11.7 9 13.2 12.15 14.7 9"/><rect x="12.8" y="7.05" width="0.8" height="1.2" rx="0.4"/></g></g></svg>'
const ICON_ANNOTATION_SHOW = `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 1024 1024"><path fill="currentColor" d="M512 160c320 0 512 352 512 352S832 864 512 864 0 512 0 512s192-352 512-352m0 64c-225.28 0-384.128 208.064-436.8 288 52.608 79.872 211.456 288 436.8 288 225.28 0 384.128-208.064 436.8-288-52.608-79.872-211.456-288-436.8-288m0 64a224 224 0 1 1 0 448 224 224 0 0 1 0-448m0 64a160.19 160.19 0 0 0-160 160c0 88.192 71.744 160 160 160s160-71.808 160-160-71.744-160-160-160"/></svg>`

const icons = {
  select: ICON_SELECT,
  pan: ICON_PAN,
  zoomExtent: ICON_ZOOM_EXTENT,
  zoomBox: ICON_ZOOM_BOX,
  layer: ICON_LAYER,
  reading: ICON_READING_MODE,
  switchBg: ICON_SWITCH_BG,
  measure: ICON_MEASURE,
  markupTools: ICON_ANNOTATION,
  markupShow: ICON_ANNOTATION_SHOW,
  measurementShow: ICON_ANNOTATION_SHOW,
}

const coreButtons = [
  { label: 'Select', icon: ICON_SELECT },
  { label: 'Pan', icon: ICON_PAN },
  { label: 'Zoom Extents', icon: ICON_ZOOM_EXTENT },
  { label: 'Window Zoom', icon: ICON_ZOOM_BOX },
  { label: 'Layer', icon: ICON_LAYER },
]

const dockTabs = computed(() => {
  const base = ['Layers', 'Measurements', 'Entity Info', 'Statistics', 'Missing Resources']
  if (props.mode === 'review') return ['Layers', 'Review', 'Measurements', 'Entity Info', 'Statistics']
  return base
})
const activeDock = 'Entity Info'
const dockRows = [
  'Type: LWPOLYLINE',
  'Position: (120.34, 78.92)',
  'Layer: 0',
  'Color: ByLayer',
]
</script>

<style>
/* Fixed dark palette — identical to WriteModeLayout.vue */
.umr-viewport {
  margin: 20px 0 28px;
  color-scheme: dark;
}
.umr-viewport__inner {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.3);
  box-shadow: 0 18px 40px -22px rgba(0, 0, 0, 0.7);
  background: #1c1f26;
  color: #e5e7eb;
  font-size: 12px;
  --uml-border: rgba(148, 163, 184, 0.2);
  --uml-grid: rgba(255, 255, 255, 0.12);
  --uml-shape: #e5e7eb;
}

.umr-body {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0,1fr) 36px 23%;
  min-height: 320px;
  background: #000;
}

.umr-canvas {
  position: relative;
  grid-column: 1 / 2;
  overflow: hidden;
  border-right: 1px solid #0a0c10;
}
.umr-canvas__grid,
.umr-canvas__shapes {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.umr-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.12em;
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid;
  text-transform: uppercase;
  pointer-events: none;
}
.umr-badge--read {
  color: #d97706;
  background: rgba(217, 119, 6, 0.08);
  border-color: rgba(217, 119, 6, 0.3);
}
.umr-badge--review {
  color: #16a34a;
  background: rgba(22, 163, 74, 0.08);
  border-color: rgba(22, 163, 74, 0.3);
}

/* Vertical toolbar */
.umr-vertbar {
  grid-column: 2 / 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 6px 0;
  border-right: 1px solid #0a0c10;
  background: #1c1f26;
}

.umr-vertbar__sep {
  width: 70%;
  height: 1px;
  background: var(--uml-border);
  margin: 4px 0;
}
.umr-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 5px;
  background: transparent;
  border: 1px solid transparent;
  color: inherit;
  cursor: default;
  transition: background .15s ease, border-color .15s ease;
}
.umr-btn:hover {
  background: rgba(124, 183, 255, .12);
  border-color: rgba(124, 183, 255, .35);
}
.umr-btn--icon { padding: 0; }
.uml-ico { display: inline-flex; width: 1.4em; height: 1.4em; font-size: 16px; color: inherit; align-items: center; justify-content: center; }

.umr-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  padding: 0 3px;
}
.umr-group__trigger {
  grid-column: 1 / span 2;
  position: relative;
}
.umr-group__chev {
  position: absolute;
  right: 3px;
  bottom: 2px;
  font-size: 8px;
  opacity: 0.6;
}
.umr-group__side {
  grid-column: 1 / span 2;
  width: 100%;
  height: 22px;
  font-size: 12px;
}

/* Docked panels */
.umr-dock {
  grid-column: 3 / 4;
  display: flex;
  flex-direction: column;
  background: #1c1f26;
  min-width: 0;
}
.umr-dock__tabs {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
  padding: 4px 6px 0;
  border-bottom: 1px solid #0a0c10;
}
.umr-dock__tab {
  padding: 4px 8px;
  font-size: 11px;
  border-radius: 4px 4px 0 0;
  opacity: 0.65;
  white-space: nowrap;
  cursor: default;
}
.umr-dock__tab.is-active {
  background: #2c313a;
  color: #fff;
  opacity: 1;
  border: 1px solid #1a1d23;
  border-bottom-color: transparent;
  font-weight: 600;
}
.umr-dock__body {
  padding: 8px 10px;
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.umr-dock__list { display: flex; flex-direction: column; gap: 5px; font-size: 11.5px; }
.umr-dock__row { display: flex; align-items: center; gap: 8px; }
.umr-dock__bullet {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: #7cb7ff;
  opacity: 0.75;
}
</style>
