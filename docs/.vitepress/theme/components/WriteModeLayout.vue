<template>
  <div class="wml-root">
    <div class="wml-window">
      <!-- ============ RIBBON ============ -->
      <div class="wml-ribbon">
        <!-- File menu bar + Tab headers -->
        <div class="wml-ribbon__topbar">
          <div class="wml-ribbon__tabs">
            <span class="wml-ribbon__filetab">File</span>
            <span class="wml-ribbon__tab wml-ribbon__tab--active">Home</span>
            <span class="wml-ribbon__tab">Insert</span>
            <span class="wml-ribbon__tab">Review</span>
            <span class="wml-ribbon__tab">Measurement</span>
            <!-- Minimizer / chevron (▼) -->
            <span class="wml-ribbon__chev" title="Collapse ribbon">▼</span>
            <!-- Tabs after: undo / redo -->
            <div class="wml-ribbon__tabsAfter">
              <button class="wml-ico-btn" title="Undo"><span class="wml-ico" v-html="I.undo" aria-hidden="true"></span></button>
              <button class="wml-ico-btn" title="Redo"><span class="wml-ico" v-html="I.redo" aria-hidden="true"></span></button>
            </div>
          </div>

          <!-- Center: file name area -->
          <div class="wml-ribbon__fileName">
            <span class="wml-ribbon__fileNameText">drawing.dwg</span>
          </div>

          <!-- Tabs extra: language selector -->
          <div class="wml-ribbon__tabsExtra">
            <button class="wml-ribbon__lang">
              <span class="wml-ico" v-html="I.language" aria-hidden="true"></span>
              <span>English</span>
              <span class="wml-ribbon__chev">▼</span>
            </button>
          </div>
        </div>

        <!-- Group pane (Home tab) -->
        <div class="wml-ribbon__pane">
          <!-- Draw -->
          <div class="wml-ribbon__group">
            <div class="wml-ribbon__groupBody">
              <button class="wml-ribbon__bigBtn">
                <span class="wml-ico wml-ico--xl" v-html="I.line" aria-hidden="true"></span>
                <span class="wml-ribbon__bigBtnLabel">Line</span>
              </button>
              <button class="wml-ribbon__bigBtn">
                <span class="wml-ico wml-ico--xl" v-html="I.polyline" aria-hidden="true"></span>
                <span class="wml-ribbon__bigBtnLabel">Polyline</span>
              </button>
              <button class="wml-ribbon__bigBtn">
                <span class="wml-ico wml-ico--xl" v-html="I.circle" aria-hidden="true"></span>
                <span class="wml-ribbon__bigBtnLabel">Circle<span class="wml-chev">⌄</span></span>
              </button>
              <button class="wml-ribbon__bigBtn">
                <span class="wml-ico wml-ico--xl" v-html="I.arc" aria-hidden="true"></span>
                <span class="wml-ribbon__bigBtnLabel">Arc<span class="wml-chev">⌄</span></span>
              </button>
              <!-- Right mini column: Rect▼ / Ellipse▼ / Hatch -->
              <div class="wml-ribbon__miniCol">
                <button class="wml-ribbon__btnSm wml-ddbtn" title="Rectangle">
                  <span class="wml-ico" v-html="I.rect" aria-hidden="true"></span>
                  <span class="wml-dd">⌄</span>
                </button>
                <button class="wml-ribbon__btnSm wml-ddbtn" title="Ellipse">
                  <span class="wml-ico" v-html="I.ellipse" aria-hidden="true"></span>
                  <span class="wml-dd">⌄</span>
                </button>
                <button class="wml-ribbon__btnSm" title="Hatch">
                  <span class="wml-ico" v-html="I.hatch" aria-hidden="true"></span>
                </button>
              </div>
            </div>
            <div class="wml-ribbon__groupTitle">Draw <span class="wml-ribbon__groupMore">⌄</span></div>
          </div>

          <!-- Modify -->
          <div class="wml-ribbon__group">
            <div class="wml-ribbon__groupBody">
              <div class="wml-ribbon__modify">
                <button class="wml-ribbon__btnStd">
                  <span class="wml-ico wml-ico--lg" v-html="I.move" aria-hidden="true"></span>
                  <span>Move</span>
                </button>
                <button class="wml-ribbon__btnStd">
                  <span class="wml-ico wml-ico--lg" v-html="I.erase" aria-hidden="true"></span>
                  <span>Erase</span>
                </button>
                <button class="wml-ribbon__btnStd">
                  <span class="wml-ico wml-ico--lg" v-html="I.rotate" aria-hidden="true"></span>
                  <span>Rotate</span>
                </button>
                <button class="wml-ribbon__btnStd">
                  <span class="wml-ico wml-ico--lg" v-html="I.offset" aria-hidden="true"></span>
                  <span>Offset</span>
                </button>
                <button class="wml-ribbon__btnStd">
                  <span class="wml-ico wml-ico--lg" v-html="I.copy" aria-hidden="true"></span>
                  <span>Copy</span>
                </button>
              </div>
            </div>
            <div class="wml-ribbon__groupTitle">Modify</div>
          </div>

          <!-- More (three-dot) -->
          <div class="wml-ribbon__group">
            <div class="wml-ribbon__groupBody wml-ribbon__moreBody">
              <button class="wml-ribbon__moreBtn" title="More panels">⋯</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ============ BODY (CANVAS + CMDLINE + RIGHT TOOLBAR) ============ -->
      <div class="wml-body">
        <!-- Canvas -->
        <div class="wml-canvas">
          <!-- Sample drawing shapes, just a silhouette -->
          <svg class="wml-canvas__drawings" viewBox="0 0 200 110" preserveAspectRatio="none" aria-hidden="true">
            <!-- Top strip text lines -->
            <g stroke="#444" stroke-width=".22" opacity=".6">
              <line x1="80" y1="25" x2="190" y2="25"/><line x1="80" y1="28" x2="190" y2="28"/>
              <line x1="80" y1="31" x2="190" y2="31"/><line x1="80" y1="34" x2="190" y2="34"/>
              <line x1="80" y1="37" x2="190" y2="37"/><line x1="80" y1="40" x2="190" y2="40"/>
            </g>
            <!-- Left two views (boxes with circles) -->
            <rect x="30" y="30" width="28" height="30" fill="none" stroke="#e5e7eb" stroke-width=".5"/>
            <circle cx="44" cy="45" r="5" fill="none" stroke="#e5e7eb" stroke-width=".5"/>
            <rect x="65" y="30" width="28" height="30" fill="none" stroke="#e5e7eb" stroke-width=".5"/>
            <circle cx="79" cy="45" r="5" fill="none" stroke="#e5e7eb" stroke-width=".5"/>
            <!-- Bottom block / title bar -->
            <rect x="100" y="75" width="95" height="30" fill="none" stroke="#e5e7eb" stroke-width=".5"/>
            <line x1="100" y1="85" x2="195" y2="85" stroke="#e5e7eb" stroke-width=".35"/>
            <line x1="100" y1="95" x2="195" y2="95" stroke="#e5e7eb" stroke-width=".35"/>
            <line x1="100" y1="103" x2="195" y2="103" stroke="#e5e7eb" stroke-width=".35"/>
            <line x1="130" y1="75" x2="130" y2="105" stroke="#e5e7eb" stroke-width=".3"/>
            <line x1="160" y1="75" x2="160" y2="105" stroke="#e5e7eb" stroke-width=".3"/>
          </svg>
        </div>

        <!-- Command line (bottom-left, overlays canvas) -->
        <div class="wml-cmdline">
          <button class="wml-cmdline__close" title="Close command line">✕</button>
          <span class="wml-cmdline__input">▼ Type command</span>
          <button class="wml-cmdline__history" title="Command history">▲</button>
        </div>

        <!-- Right-side vertical toolbar (11 buttons, matching screenshot) -->
        <div class="wml-rightbar">
          <button v-for="b in rightBar" :key="b.key" class="wml-rtbtn" :title="b.title">
            <span class="wml-ico" v-html="b.icon" aria-hidden="true"></span>
          </button>
        </div>
      </div>

      <!-- ============ STATUS BAR ============ -->
      <div class="wml-statusbar">
        <div class="wml-statusbar__left">
          <button class="wml-statchip wml-statchip--on" title="Model space">Model</button>
          <button class="wml-statchip" title="Layout 1">Layout1</button>
          <button class="wml-statchip" title="Layout 2">Layout2</button>
        </div>
        <div class="wml-statusbar__coords">1139.0469, -400.0688</div>
        <div class="wml-statusbar__right">
          <button v-for="s in statusBar" :key="s.key" class="wml-statbtn" :class="{ 'wml-statbtn--on': s.on }" :title="s.title">
            <span class="wml-ico" v-html="s.icon" aria-hidden="true"></span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Icons — inlined from the actual icon SVGs used by cad-viewer / cad-simple-viewer
const I = {
  line: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" d="M3 15 17 5"/></svg>',
  polyline: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M2.5 14 7 6.5 11 11 17.5 4"/></svg>',
  circle: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  arc: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M3 13A8 8 0 0 1 16 6"/></svg>',
  rect: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><rect x="3.5" y="5" width="13" height="10" rx=".8" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  ellipse: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><ellipse cx="10" cy="10" rx="7" ry="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  hatch: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><rect x="3" y="4" width="14" height="12" fill="none" stroke="currentColor" stroke-width="1.3"/><path fill="none" stroke="currentColor" stroke-width="1" d="M5 15 15 5M4 10 10 4M10 16 16 10"/></svg>',
  move: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M10 2 7 5h2v4H5V7L2 10l3 3v-2h4v4H7l3 3 3-3h-2v-4h4v2l3-3-3-3v2h-4V5h2L10 2Z"/></svg>',
  erase: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M6.5 3h7v1.5H18V6H2V4.5h4.5V3Zm-3 4.5 1.25 11a2 2 0 0 0 2 1.75h7.5a2 2 0 0 0 2-1.75L17.5 7.5H3.5Zm5.6 3.5 2 2-1.06 1.06L8 12.06 5.94 14.12 4.88 13.06l2.06-2.06L4.88 9L6 7.94l2 2 2-2 1.1 1.06Z"/></svg>',
  rotate: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M3 10a7 7 0 0 1 12.12-4.5M17 10a7 7 0 0 0-12.12 4.5"/><path fill="currentColor" d="M14.5 3.5 17 2v3.5H13.5V2l3.5 1.5ZM2 18l3.5-1.5v3.5H2V16.5Z"/></svg>',
  offset: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.3" d="M4 14h10v-8"/><path fill="none" stroke="currentColor" stroke-width="1.3" d="M6 12h8v-8H6z"/></svg>',
  copy: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><rect x="5" y="6" width="10.5" height="11.5" rx="1" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="2.5" y="2.5" width="10.5" height="11.5" rx="1" fill="#fff" stroke="currentColor" stroke-width="1.3"/></svg>',
  // Element Plus @element-plus/icons-vue RefreshLeft (undo) — SVG inlined to avoid a dependency.
  undo: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 1024 1024"><path fill="currentColor" d="M289.088 296.704h92.992a32 32 0 0 1 0 64H232.96a32 32 0 0 1-32-32V179.712a32 32 0 0 1 64 0v50.56a384 384 0 0 1 643.84 282.88 384 384 0 0 1-383.936 384 384 384 0 0 1-384-384h64a320 320 0 1 0 640 0 320 320 0 0 0-555.712-216.448z"/></svg>',
  // Element Plus @element-plus/icons-vue RefreshRight (redo) — SVG inlined to avoid a dependency.
  redo: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 1024 1024"><path fill="currentColor" d="M784.512 230.272v-50.56a32 32 0 1 1 64 0v149.056a32 32 0 0 1-32 32H667.52a32 32 0 1 1 0-64h92.992A320 320 0 1 0 524.8 833.152a320 320 0 0 0 320-320h64a384 384 0 0 1-384 384 384 384 0 0 1-384-384 384 384 0 0 1 643.712-282.88"/></svg>',
  language: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.4" d="M10 2a8 8 0 1 0 8 8 8 8 0 0 0-8-8Z"/><path fill="none" stroke="currentColor" stroke-width="1.4" d="M2 10h16M10 2.2c2.2 2.2 3.4 4.8 3.8 7.8 0-3 .8-5.5-3.8-7.8ZM10 17.8c-4.6-2.2-3.8-7.8-3.8-7.8s-.8 5.6 3.8 7.8Z"/></svg>',
  // Right toolbar icons (matching screenshot: select, pan, entity info, properties, layers, measurements, review, annotate, measure, hide toggle, agent-like? we use the 11 in the screenshot order)
  // Screenshot right bar, top to bottom:
  //   1. Select (white arrow on dark button background)
  //   2. Pan (hand)
  //   3. Entity info (info circle: ⓘ or i mark)
  //   4. Properties (slider / 3 horizontal lines: list with bullets)
  //   5. Layers (layer stack icon)
  //   6. Measurements (ruler)
  //   7. Review (list clipboard / review)
  //   8. Annotate tool (edit / pencil square)
  //   9. Layer isolate / measurement isolate (window with cursor: e.g. W select window)
  //  10. Measure visibility (eye)
  //  11. Agent (chat bubble)
  rbSelect: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M10.4379 15.2979h.002l4.86-4.86-9.722-4.86 4.86 9.72Zm7.562-5.298-3.434 3.434 3.2 3.2-1.132 1.132-3.2-3.2-3.434 3.434-7.6-15.6 15.6 7.6Z"/></svg>',
  rbPan: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M15.08 12.854V5.59c0-.422-.652-.414-.652 0v3.466c0 .938-1.482.95-1.482 0v-4.83c0-.414-.638-.414-.638 0h-.014v4.83c.014.95-1.482.95-1.482 0V3.444c0-.42-.638-.414-.638 0v5.612c0 .95-1.494.95-1.494 0V4.232c0-.408-.64-.42-.64 0v6.756c0 .802-1.094 1.088-1.494.388-.26-.446-.518-.892-.776-1.338-.338-.482-1.1-.15-.794.38.326.566.652 1.132.978 1.698.552.946 1.106 1.89 1.658 2.834.19.3.422.578.666.802.672.61 1.528.964 2.418 1.052.888.06 1.792-.124 2.56-.612.3-.19.572-.416.816-.68.326-.368.57-.776.734-1.204.176-.482.258-.97.258-1.494Zm-.91-8.608c.958-.38 2.058.244 2.058 1.346v7.266c0 .652-.108 1.29-.332 1.894-.216.564-.53 1.114-.964 1.576-.318.34-.666.632-1.046.884-.978.612-2.146.862-3.26.774-1.128-.102-2.228-.564-3.098-1.352-.326-.292-.612-.646-.87-1.034-.558-.96-1.114-1.92-1.672-2.88-.326-.568-.652-1.138-.978-1.706-.59-1.018.068-2.186 1.156-2.336.536-.074 1.126.116 1.562.72.04.074.082.146.122.218V4.232c0-1.176 1.244-1.788 2.202-1.278.42-1.278 2.378-1.264 2.792-.014.972-.51 2.222.102 2.222 1.284Z"/></svg>',
  rbInfo: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.4"/><path fill="currentColor" d="M10 7.2a1 1 0 1 0-1-1 1 1 0 0 0 1 1Zm1 6.8H9v-1h1v-3H9V9h2v5Z"/></svg>',
  rbProperties: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.4" d="M4 5h9v10H4zM15 7h1v1h-1zM15 10.5h1v1h-1zM15 14h1v1h-1z"/><path fill="currentColor" d="M6 7h5v1.2H6zm0 3.5h5v1.2H6zm0 3.5h5V15H6z"/></svg>',
  rbLayers: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 512 512"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="m434.8 137.65l-149.36-68.1c-16.19-7.4-42.69-7.4-58.88 0L77.3 137.65c-17.6 8-17.6 21.09 0 29.09l148 67.5c16.89 7.7 44.69 7.7 61.58 0l148-67.5c17.52-8 17.52-21.1-.08-29.09M160 308.52l-82.7 37.11c-17.6 8-17.6 21.1 0 29.1l148 67.5c16.89 7.69 44.69 7.69 61.58 0l148-67.5c17.6-8 17.6-21.1 0-29.1l-79.94-38.47"/></svg>',
  rbMeasurements: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" d="M2 7h16v6H2z"/><path fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" d="M4 7v2M6.5 7v1M9 7v2M12 7v1M14.5 7v2"/></svg>',
  rbReview: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.4" d="M3 4h10l4 4v8H3z"/><path fill="none" stroke="currentColor" stroke-width="1.4" d="M13 4v4h4"/><path fill="currentColor" d="M6 9h4v1.2H6zm0 2.5h4V12.7H6zm0 2.5h4V15.2H6z"/></svg>',
  rbAnnotate: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><rect x="4.5" y="12.5" width="6.5" height="3" rx="0.6" fill="none" stroke="currentColor" stroke-width="1.4"/><path fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" d="M13.5 3.5 17 7 8.5 15.5 5 16l.5-3.5Z"/></svg>',
  rbSelectWindow: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.4" d="M3 5h10v10H3z"/><path fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" d="M13 13l4 4M15 11l2 2"/></svg>',
  rbMeasurementPanel: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.4" d="M3 5h10l4 4v8H3z"/><path fill="none" stroke="currentColor" stroke-width="1.4" d="M13 5v4h4"/><path fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" d="M6 11h4v1H6zM6 13.5h4v1H6z"/></svg>',
  rbAgent: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.4" d="M3 5h14v8h-4l-3 3-3-3H3z"/><circle cx="7.5" cy="9" r="1" fill="currentColor"/><circle cx="12.5" cy="9" r="1" fill="currentColor"/></svg>',

  // Status bar buttons (screenshot far right, left to right):
  //   1. Notification bell
  //   2. Clean screen (sun? / focus / reading mode: sun icon)
  //   3. Layout switch (Model / Layout: ↕↔ like 4 arrows center)
  //   4. Status bars / toggle status bar visibility
  //   5. Palettes toggle (panels: layered icon)
  //   6. Language selector / menu (grid squares)
  //   7. Full-screen (zoom fullscreen: 4 out corners)
  //   8. Pin/minimize / chevron-up
  //   9. Settings gear
  sbBell: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" d="M10 3a5 5 0 0 0-5 5v4l-1.5 2h13L15 12V8a5 5 0 0 0-5-5Z"/><path fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" d="M8.5 16.5a1.5 1.5 0 0 0 3 0"/></svg>',
  sbCleanScreen: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><circle cx="10" cy="10" r="3" fill="none" stroke="currentColor" stroke-width="1.4"/><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><line x1="10" y1="2" x2="10" y2="4"/><line x1="10" y1="16" x2="10" y2="18"/><line x1="2" y1="10" x2="4" y2="10"/><line x1="16" y1="10" x2="18" y2="10"/><line x1="4.34" y1="4.34" x2="5.76" y2="5.76"/><line x1="14.24" y1="14.24" x2="15.66" y2="15.66"/><line x1="4.34" y1="15.66" x2="5.76" y2="14.24"/><line x1="14.24" y1="5.76" x2="15.66" y2="4.34"/></g></svg>',
  sbLayout: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.4" d="M3 3h7v7H3zM10 10h7v7h-7zM10 3h7v7h-7zM3 10h7v7H3z"/></svg>',
  sbStatusBar: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.4" d="M3 4h14v12H3z"/><path fill="currentColor" d="M3 14h14v1.2H3z"/></svg>',
  sbPalette: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.4" d="M3 4h10v5H3zM3 11h10v5H3zM14 4h3v5h-3zM14 11h3v5h-3z"/></svg>',
  sbLanguage: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.4" d="M2 10h16M10 2.2c2.2 2.2 3.4 4.8 3.8 7.8 0-3 .8-5.5-3.8-7.8ZM10 17.8c-4.6-2.2-3.8-7.8-3.8-7.8s-.8 5.6 3.8 7.8Z"/></svg>',
  sbFullscreen: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" d="M3 6.5V3.5H6M17 6.5V3.5H14M3 13.5v3H6M17 13.5v3H14"/></svg>',
  sbPin: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" d="M10 3v14M5 8l5-5 5 5M5 12l5 5 5-5"/></svg>',
  sbSettings: '<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 20 20"><path fill="currentColor" d="M8.08 2.1h3.84l.32 1.52a6.4 6.4 0 0 1 1.36.78l1.48-.64 1.92 1.92-.64 1.48c.3.42.54.88.78 1.36l1.52.32v3.84l-1.52.32a6.4 6.4 0 0 1-.78 1.36l.64 1.48-1.92 1.92-1.48-.64a6.4 6.4 0 0 1-1.36.78l-.32 1.52H8.08l-.32-1.52a6.4 6.4 0 0 1-1.36-.78l-1.48.64-1.92-1.92.64-1.48a6.4 6.4 0 0 1-.78-1.36L1.34 11.92V8.08l1.52-.32c.24-.48.48-.94.78-1.36l-.64-1.48 1.92-1.92 1.48.64c.42-.3.88-.54 1.36-.78L8.08 2.1ZM10 7.2A2.8 2.8 0 1 0 10 12.8 2.8 2.8 0 0 0 10 7.2Z"/></svg>',
}

const rightBar = [
  { key: 'select',       title: 'Select',             icon: I.rbSelect },
  { key: 'pan',          title: 'Pan',                icon: I.rbPan },
  { key: 'info',         title: 'Entity Info',        icon: I.rbInfo },
  { key: 'properties',   title: 'Properties',         icon: I.rbProperties },
  { key: 'layers',       title: 'Layers',             icon: I.rbLayers },
  { key: 'measurements', title: 'Measurements',       icon: I.rbMeasurements },
  { key: 'review',       title: 'Review (markups)',   icon: I.rbReview },
  { key: 'annotate',     title: 'Annotation tools',   icon: I.rbAnnotate },
  { key: 'window',       title: 'Select Window',      icon: I.rbSelectWindow },
  { key: 'mPanel',       title: 'Measurement Panel',  icon: I.rbMeasurementPanel },
  { key: 'agent',        title: 'CAD Agent',          icon: I.rbAgent },
]

const statusBar = [
  { key: 'bell',    title: 'Notifications',    icon: I.sbBell,        on: false },
  { key: 'clean',   title: 'Clean Screen',     icon: I.sbCleanScreen, on: true },
  { key: 'layout',  title: 'Layout switcher',  icon: I.sbLayout,      on: false },
  { key: 'statbar', title: 'Status bar',       icon: I.sbStatusBar,   on: true },
  { key: 'palette', title: 'Palettes toggle',  icon: I.sbPalette,     on: false },
  { key: 'lang',    title: 'Language',         icon: I.sbLanguage,    on: false },
  { key: 'fs',      title: 'Full screen',      icon: I.sbFullscreen,  on: false },
  { key: 'pin',     title: 'Minimize ribbon',  icon: I.sbPin,         on: false },
  { key: 'gear',    title: 'Settings',         icon: I.sbSettings,    on: false },
]
</script>

<style>
/* === Root / window container === */
.wml-root {
  margin: 20px 0 28px;
  color-scheme: dark;
}
.wml-window {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.3);
  box-shadow: 0 18px 40px -22px rgba(0, 0, 0, 0.7);
  /* Enforce dark-mode colours for viewer chrome — matches the screenshot dark theme */
  background: #1c1f26;
  color: #e5e7eb;
  font: 12px/1.3 "Segoe UI", system-ui, -apple-system, "Microsoft YaHei", sans-serif;
}
.wml-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.1em;
  height: 1.1em;
  font-size: 18px;
  color: inherit;
}
.wml-ico--lg { font-size: 22px; }

/* === RIBBON === */
.wml-ribbon {
  background: #2c313a;
  color: #e5e7eb;
  border-bottom: 1px solid #1a1d23;
}
.wml-ribbon__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 6px;
  border-bottom: 1px solid #1a1d23;
  background: linear-gradient(180deg, #2e343f 0%, #262a33 100%);
}
.wml-ribbon__tabs {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
}
.wml-ribbon__filetab {
  padding: 6px 12px 7px;
  font-weight: 600;
  color: #7cb7ff;
  letter-spacing: .02em;
}
.wml-ribbon__tab {
  padding: 6px 10px 7px;
  font-size: 12.5px;
  border-radius: 3px 3px 0 0;
  opacity: .85;
  cursor: default;
  white-space: nowrap;
}
.wml-ribbon__tab--active {
  background: #2c313a;
  color: #fff;
  opacity: 1;
  border-left: 1px solid #1a1d23;
  border-right: 1px solid #1a1d23;
  border-top: 1px solid #1a1d23;
  border-bottom: 1px solid transparent;
  margin-bottom: -1px;
  font-weight: 600;
}
.wml-ribbon__chev {
  padding: 2px 4px;
  font-size: 9px;
  opacity: .75;
}
.wml-ribbon__tabsAfter {
  display: inline-flex;
  gap: 2px;
  margin-left: 4px;
  padding-left: 6px;
  border-left: 1px solid rgba(148,163,184,.2);
}
.wml-ico-btn {
  width: 22px;
  height: 22px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  color: inherit;
  cursor: default;
}
.wml-ico-btn:hover {
  background: rgba(124, 183, 255, .12);
  border-color: rgba(124, 183, 255, .35);
}
.wml-ico-btn .wml-ico { font-size: 14px; }

.wml-ribbon__fileName {
  flex: 0 1 auto;
  text-align: center;
  font-weight: 500;
  font-size: 12.5px;
  padding: 0 10px;
  color: #e5e7eb;
  min-width: 0;
}
.wml-ribbon__fileNameText {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  max-width: 380px;
  display: inline-block;
  vertical-align: middle;
}

.wml-ribbon__tabsExtra {
  display: flex;
  align-items: center;
  gap: 4px;
}
.wml-ribbon__lang {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: transparent;
  border: 1px solid rgba(148,163,184,.25);
  border-radius: 3px;
  padding: 3px 7px;
  color: inherit;
  cursor: default;
  font-size: 12px;
}
.wml-ribbon__lang:hover { background: rgba(255,255,255,.04); }
.wml-ribbon__lang .wml-ico { font-size: 15px; }
.wml-ribbon__lang .wml-ribbon__chev { padding: 0; margin-left: 2px; }

/* === Group pane === */
.wml-ribbon__pane {
  display: flex;
  gap: 0;
  padding: 2px 0;
  align-items: stretch;
  background: #2c313a;
}
.wml-ribbon__group {
  display: flex;
  flex-direction: column;
  padding: 2px 6px 0;
  border-right: 1px solid rgba(148,163,184,.18);
  min-width: 0;
}
.wml-ribbon__group:last-child { border-right: none; }
.wml-ribbon__groupBody {
  display: flex;
  gap: 3px;
  align-items: stretch;
  flex: 1;
}
.wml-ribbon__groupTitle {
  margin-top: 2px;
  padding: 1px 0 3px;
  font-size: 11px;
  text-align: center;
  opacity: .7;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.wml-ribbon__groupMore { font-size: 9px; opacity: .55; }

/* --- Draw group --- */
.wml-ribbon__bigBtn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 2px 9px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  color: inherit;
  cursor: default;
  white-space: nowrap;
  font-size: 12px;
}
.wml-ribbon__bigBtn:hover {
  background: rgba(124,183,255,.12);
  border-color: rgba(124,183,255,.35);
}
.wml-ribbon__bigBtnLabel {
  display: inline-flex;
  align-items: center;
}
.wml-ico--xl { font-size: 22px; }
.wml-chev {
  font-size: 9px;
  opacity: .6;
  margin-left: 3px;
}
.wml-ribbon__miniCol {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1px;
  margin-left: 3px;
}
.wml-dd {
  font-size: 9px;
  opacity: .65;
}
.wml-ribbon__btnSm {
  position: relative;
  width: 30px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  color: inherit;
  cursor: default;
}
.wml-ribbon__btnSm:hover {
  background: rgba(124,183,255,.12);
  border-color: rgba(124,183,255,.35);
}
.wml-ribbon__btnSm .wml-ico { font-size: 14px; }
.wml-ddbtn .wml-ico { margin: 0 auto 0 5px; }
.wml-ddbtn .wml-dd {
  position: absolute;
  right: 1px;
  bottom: 0;
  padding: 0 3px;
  margin: 0;
  opacity: .7;
}

/* --- Modify group --- */
.wml-ribbon__modify {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(3, 20px);
  gap: 1px;
  align-content: start;
}
.wml-ribbon__btnStd {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 6px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  color: inherit;
  cursor: default;
  white-space: nowrap;
  text-align: left;
  font-size: 12px;
}
.wml-ribbon__btnStd .wml-ico { font-size: 15px; }
.wml-ribbon__btnStd:hover {
  background: rgba(124,183,255,.12);
  border-color: rgba(124,183,255,.35);
}

/* --- More (three-dot) group --- */
.wml-ribbon__moreBody { align-items: center; }
.wml-ribbon__moreBtn {
  width: 28px;
  height: 28px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  color: inherit;
  cursor: default;
  font-size: 20px;
  line-height: 1;
}
.wml-ribbon__moreBtn:hover {
  background: rgba(124,183,255,.12);
  border-color: rgba(124,183,255,.35);
}

/* --- Properties group --- */
.wml-ribbon__propsCol {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 200px;
}
.wml-ribbon__propRow {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 2px 5px;
  background: rgba(255,255,255,.03);
  border: 1px solid rgba(148,163,184,.18);
  border-radius: 3px;
}
.wml-ribbon__propRow .wml-ico { font-size: 16px; }
.wml-ico--rainbow .wml-ico { font-size: 18px; }
.wml-propBlock, .wml-propLayer {
  flex: 1;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wml-selectDd {
  font-size: 9px;
  opacity: .6;
  padding: 0 2px;
}
.wml-ribbon__select {
  display: none;
}

/* === BODY (Canvas area) === */
.wml-body {
  position: relative;
  display: flex;
  min-height: 340px;
  background: #000;
}
.wml-canvas {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #000;
}
.wml-canvas__drawings {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  stroke: #e5e7eb;
}
.wml-ruler {
  position: absolute;
  background: rgba(255,255,255,.03);
  border-color: rgba(255,255,255,.15);
  background-image:
    linear-gradient(to bottom, rgba(255,255,255,.25) 0 1px, transparent 1px),
    linear-gradient(to right, transparent 0 8px, rgba(255,255,255,.25) 8px 9px, transparent 9px 18px, rgba(255,255,255,.15) 18px 19px, transparent 19px 28px, rgba(255,255,255,.15) 28px 29px);
  background-repeat: repeat;
  border-style: solid;
  border-width: 0;
  pointer-events: none;
}
.wml-ruler--left {
  left: 0;
  top: 0;
  width: 20px;
  height: calc(100% - 20px);
  border-right-width: 1px;
  background-image:
    linear-gradient(to right, rgba(255,255,255,.25) 0 1px, transparent 1px),
    linear-gradient(to bottom, transparent 0 8px, rgba(255,255,255,.25) 8px 9px, transparent 9px 18px, rgba(255,255,255,.15) 18px 19px, transparent 19px 28px, rgba(255,255,255,.15) 28px 29px);
}
.wml-ruler--bottom {
  left: 20px;
  bottom: 0;
  height: 20px;
  width: calc(100% - 20px);
  border-top-width: 1px;
}
.wml-ruler__axis {
  position: absolute;
  color: #cbd5e1;
  font: 700 11px "Segoe UI", system-ui, sans-serif;
}
.wml-ruler__axis--y {
  left: 4px;
  bottom: 24px;
}
.wml-ruler__axis--x {
  left: 8px;
  bottom: 2px;
}
.wml-ruler__axis--y::after {
  content: '';
  position: absolute;
  bottom: -6px;
  left: -4px;
  width: 18px;
  height: 2px;
  background: linear-gradient(90deg, #22c55e, transparent);
  transform-origin: left center;
  transform: rotate(0deg);
}
.wml-ruler__axis--x::before {
  content: '';
  position: absolute;
  top: 7px;
  right: -24px;
  width: 24px;
  height: 2px;
  background: linear-gradient(90deg, #ef4444, transparent);
}

/* Command line at bottom-left overlay */
.wml-cmdline {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: #1c1f26;
  border-top: 1px solid #0a0c10;
  display: flex;
  align-items: center;
  padding: 3px 8px 3px 4px;
  gap: 6px;
  color: #d1d5db;
  font: 12px/1.2 "Consolas", "Courier New", ui-monospace, monospace;
}
.wml-cmdline__close {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: transparent;
  border: 1px solid rgba(148,163,184,.2);
  border-radius: 2px;
  color: inherit;
  cursor: default;
  font-size: 11px;
}
.wml-cmdline__input {
  flex: 1;
  background: #111419;
  border: 1px solid rgba(148,163,184,.22);
  border-radius: 2px;
  padding: 3px 8px;
  color: #e5e7eb;
  white-space: nowrap;
}
.wml-cmdline__history {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: transparent;
  border: 1px solid rgba(148,163,184,.2);
  border-radius: 2px;
  color: inherit;
  cursor: default;
  font-size: 10px;
}

/* Right-side vertical toolbar (screenshot order: 11 buttons) */
.wml-rightbar {
  width: 38px;
  flex: 0 0 38px;
  background: #1c1f26;
  border-left: 1px solid #0a0c10;
  padding: 6px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}
.wml-rtbtn {
  width: 30px;
  height: 28px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  color: #cbd5e1;
  cursor: default;
}
.wml-rtbtn:hover {
  background: rgba(124, 183, 255, .12);
  border-color: rgba(124, 183, 255, .35);
  color: #fff;
}
.wml-rtbtn .wml-ico { font-size: 16px; }

/* === STATUS BAR === */
.wml-statusbar {
  background: #1c1f26;
  color: #cbd5e1;
  border-top: 1px solid #0a0c10;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 3px 6px;
  font-size: 11.5px;
}
.wml-statusbar__left {
  display: flex;
  gap: 2px;
  flex: 0 0 auto;
}
.wml-statchip {
  padding: 3px 10px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 2px;
  cursor: default;
  font-weight: 500;
  color: #cbd5e1;
  white-space: nowrap;
}
.wml-statchip--on {
  background: rgba(124,183,255,.1);
  border-color: rgba(124,183,255,.35);
  color: #7cb7ff;
}
.wml-statusbar__coords {
  flex: 0 0 auto;
  padding-right: 8px;
  margin-left: 4px;
  border-right: 1px solid rgba(148,163,184,.2);
  font-family: "Consolas", "Courier New", ui-monospace, monospace;
  color: #e5e7eb;
  opacity: .92;
  white-space: nowrap;
}
.wml-statusbar__right {
  display: flex;
  gap: 1px;
  margin-left: auto;
  align-items: center;
}
.wml-statbtn {
  width: 24px;
  height: 22px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 2px;
  color: #cbd5e1;
  cursor: default;
}
.wml-statbtn:hover {
  background: rgba(124,183,255,.1);
  border-color: rgba(124,183,255,.25);
}
.wml-statbtn--on {
  color: #7cb7ff;
  background: rgba(124,183,255,.1);
  border-color: rgba(124,183,255,.35);
}
.wml-statbtn .wml-ico { font-size: 14px; }

/* Narrow docs screen: prevent horizontal overflow */
@media (max-width: 900px) {
  .wml-ribbon__propsCol { min-width: 140px; }
  .wml-ribbon__fileNameText { max-width: 160px; }
}
</style>
