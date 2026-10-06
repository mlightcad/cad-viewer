<template>
  <div class="ml-mag-demo">
    <div
      class="ml-mag-canvas"
      :style="{
        '--mag-snap-x': '37.5%',
        '--mag-snap-y': '56%',
      }"
    >
      <!-- Road intersection background (intersection at 35%, 52%) -->
      <div class="ml-mag-roads">
        <svg viewBox="0 0 160 100" preserveAspectRatio="none" aria-hidden="true">
          <line x1="0" y1="48" x2="52" y2="48" stroke="rgba(210,210,210,0.55)" stroke-width="0.9" />
          <line x1="60" y1="48" x2="160" y2="48" stroke="rgba(210,210,210,0.55)" stroke-width="0.9" />
          <line x1="0" y1="56" x2="52" y2="56" stroke="rgba(210,210,210,0.55)" stroke-width="0.9" />
          <line x1="60" y1="56" x2="160" y2="56" stroke="rgba(210,210,210,0.55)" stroke-width="0.9" />
          <line x1="52" y1="0" x2="52" y2="48" stroke="rgba(210,210,210,0.55)" stroke-width="0.9" />
          <line x1="52" y1="56" x2="52" y2="100" stroke="rgba(210,210,210,0.55)" stroke-width="0.9" />
          <line x1="60" y1="0" x2="60" y2="48" stroke="rgba(210,210,210,0.55)" stroke-width="0.9" />
          <line x1="60" y1="56" x2="60" y2="100" stroke="rgba(210,210,210,0.55)" stroke-width="0.9" />
          <line x1="0" y1="52" x2="160" y2="52" stroke="rgba(230,70,70,0.95)" stroke-width="1.1" />
          <line x1="56" y1="0" x2="56" y2="100" stroke="rgba(230,70,70,0.95)" stroke-width="1.1" />
        </svg>
      </div>
      <!-- Snap target box (on canvas) -->
      <div class="ml-mag-snap-box"></div>
      <!-- Green crosshair: appears at snap commit, persists until replay -->
      <div class="ml-mag-snap-cross">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path fill="none" stroke="currentColor" stroke-width="2" d="M8 2v12M2 8h12" />
        </svg>
      </div>
      <!-- Touch group: finger + touch zone -->
      <div class="ml-mag-touch-group">
        <div class="ml-mag-touch-zone">
          <svg viewBox="0 0 36 36" aria-hidden="true">
            <circle class="ml-mag-touch-fill" cx="18" cy="18" r="16" fill="rgba(120,120,120,0.42)" />
            <circle class="ml-mag-touch-ring" cx="18" cy="18" r="18" />
          </svg>
        </div>
        <div class="ml-mag-finger">
          <svg viewBox="0 0 24 32" aria-hidden="true">
            <path
              fill="#f5dcc8"
              stroke="#c9a88a"
              stroke-width="0.6"
              d="M12 2c-2.2 0-4 1.6-4 4.2v8.3c0 .6-.5 1-1 1s-1-.4-1-1V8.5C6 5.5 4 4 2 4.5 1 4.7.5 5.5.8 6.4c1.2 3.8 3.2 7.2 5.8 10.1 1.8 2 3.4 3.2 5.4 3.2 3.5 0 6-2.8 6-6.6V6.2C18 3.8 15.4 2 12 2z"
            />
            <ellipse cx="12" cy="28" rx="9" ry="2.5" fill="rgba(0,0,0,0.25)" />
          </svg>
        </div>
      </div>
      <!-- Magnifier HUD (top-left corner) -->
      <div class="ml-mag-hud">
        <div class="ml-mag-hud-viewport">
          <!-- Zoomed road content (3x, follows finger) -->
          <svg class="ml-mag-hud-content" viewBox="0 0 160 100" preserveAspectRatio="none" aria-hidden="true">
            <line x1="0" y1="48" x2="52" y2="48" stroke="rgba(210,210,210,0.55)" stroke-width="0.9" />
            <line x1="60" y1="48" x2="160" y2="48" stroke="rgba(210,210,210,0.55)" stroke-width="0.9" />
            <line x1="0" y1="56" x2="52" y2="56" stroke="rgba(210,210,210,0.55)" stroke-width="0.9" />
            <line x1="60" y1="56" x2="160" y2="56" stroke="rgba(210,210,210,0.55)" stroke-width="0.9" />
            <line x1="52" y1="0" x2="52" y2="48" stroke="rgba(210,210,210,0.55)" stroke-width="0.9" />
            <line x1="52" y1="56" x2="52" y2="100" stroke="rgba(210,210,210,0.55)" stroke-width="0.9" />
            <line x1="60" y1="0" x2="60" y2="48" stroke="rgba(210,210,210,0.55)" stroke-width="0.9" />
            <line x1="60" y1="56" x2="60" y2="100" stroke="rgba(210,210,210,0.55)" stroke-width="0.9" />
            <line x1="0" y1="52" x2="160" y2="52" stroke="rgba(230,70,70,0.95)" stroke-width="1.1" />
            <line x1="56" y1="0" x2="56" y2="100" stroke="rgba(230,70,70,0.95)" stroke-width="1.1" />
          </svg>
          <!-- Snap marker inside magnifier (at center when finger reaches snap) -->
          <div class="ml-mag-hud-snap"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.ml-mag-demo {
  margin: 16px auto;
  max-width: 480px;
}

.ml-mag-canvas {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  background: #0a0a0a;
  border-radius: 6px;
  overflow: hidden;
}

/* ---- Road background ---- */
.ml-mag-roads {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.ml-mag-roads svg {
  display: block;
  width: 100%;
  height: 100%;
}

/* ---- Touch group (finger + zone) ---- */
.ml-mag-touch-group {
  position: absolute;
  left: 70%;
  top: 76%;
  width: 0;
  height: 0;
  animation: ml-mag-touch-group 10s ease-in-out infinite;
  z-index: 4;
}

.ml-mag-touch-zone {
  position: absolute;
  left: 0;
  top: 0;
  width: 36px;
  height: 36px;
  margin: -18px 0 0 -18px;
  pointer-events: none;
  opacity: 0;
  animation: ml-mag-zone-opacity 10s linear infinite;
  z-index: 1;
}

.ml-mag-touch-zone svg {
  display: block;
  width: 100%;
  height: 100%;
}

.ml-mag-touch-fill {
  opacity: 1;
}

.ml-mag-touch-ring {
  fill: none;
  stroke: rgba(255, 255, 255, 0.95);
  stroke-width: 2;
  stroke-dasharray: 113.1;
  stroke-dashoffset: 113.1;
  animation: ml-mag-ring 10s linear infinite;
}

.ml-mag-finger {
  position: absolute;
  left: 0;
  top: 0;
  width: 30px;
  height: 38px;
  margin: -6px 0 0 -15px;
  opacity: 0;
  animation: ml-mag-finger-opacity 10s linear infinite;
  z-index: 2;
}

.ml-mag-finger svg {
  display: block;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.45));
}

/* ---- Snap box on canvas ---- */
.ml-mag-snap-box {
  position: absolute;
  left: var(--mag-snap-x);
  top: var(--mag-snap-y);
  width: 22px;
  height: 22px;
  margin: -11px 0 0 -11px;
  border: 2px solid #0f0;
  border-radius: 1px;
  box-sizing: border-box;
  opacity: 0;
  pointer-events: none;
  animation: ml-mag-snap-box 10s step-end infinite;
  z-index: 3;
}

/* Green crosshair at the snap point: shows at commit, fades out gradually */
.ml-mag-snap-cross {
  position: absolute;
  left: var(--mag-snap-x);
  top: var(--mag-snap-y);
  width: 18px;
  height: 18px;
  margin: -9px 0 0 -9px;
  color: #0f0;
  opacity: 0;
  pointer-events: none;
  animation: ml-mag-snap-cross 10s linear infinite;
  z-index: 5;
}

.ml-mag-snap-cross svg {
  display: block;
  width: 100%;
  height: 100%;
}

/* ---- Magnifier HUD ---- */
.ml-mag-hud {
  position: absolute;
  left: 3%;
  top: 5%;
  width: 26%;
  aspect-ratio: 1;
  border: 2px solid rgba(255, 255, 255, 0.85);
  border-radius: 4px;
  overflow: hidden;
  background: #0a0a0a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  z-index: 6;
  opacity: 0;
  animation: ml-mag-hud-opacity 10s linear infinite;
}

.ml-mag-hud-viewport {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

/* Zoomed content: same road SVG, scaled 3x, translated to follow finger */
.ml-mag-hud-content {
  position: absolute;
  width: 100%;
  height: 100%;
  transform-origin: 0 0;
  animation: ml-mag-hud-content 10s ease-in-out infinite;
}

.ml-mag-hud-content svg {
  display: block;
  width: 100%;
  height: 100%;
}

/* Snap marker inside magnifier (centered while finger holds the snap target,
   then slides out with the magnified content as the finger returns) */
.ml-mag-hud-snap {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 12px;
  height: 12px;
  margin: -6px 0 0 -6px;
  border: 2px solid #0f0;
  border-radius: 1px;
  box-sizing: border-box;
  opacity: 0;
  pointer-events: none;
  z-index: 2;
  animation: ml-mag-hud-snap 10s ease-in-out infinite;
}

/* ============ Keyframes ============ */

/* Finger movement: start → snap → back */
@keyframes ml-mag-touch-group {
  0%, 5% {
    left: 70%;
    top: 76%;
  }
  23%, 48% {
    left: var(--mag-snap-x);
    top: var(--mag-snap-y);
  }
  57%, 100% {
    left: 70%;
    top: 76%;
  }
}

@keyframes ml-mag-zone-opacity {
  0%, 4.6% { opacity: 0; }
  5.4%, 48% { opacity: 1; }
  57%, 100% { opacity: 0; }
}

@keyframes ml-mag-finger-opacity {
  0%, 2% { opacity: 0; }
  2.8%, 99.99% { opacity: 1; }
  100% { opacity: 0; }
}

@keyframes ml-mag-ring {
  0%, 4.6% { stroke-dashoffset: 113.1; }
  9.6%, 96% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 113.1; }
}

/* Magnifier HUD visibility (appears after long press) */
@keyframes ml-mag-hud-opacity {
  0%, 5% { opacity: 0; }
  5.6%, 85% { opacity: 1; }
  96%, 100% { opacity: 0; }
}

/* Magnifier content: translate follows finger position
   tx = 50% - fingerX * 3, ty = 50% - fingerY * 3
   At start (70%, 76%): tx = -160%, ty = -178%
   At snap  (37.5%, 56%): tx = -62.5%, ty = -118% */
@keyframes ml-mag-hud-content {
  0%, 5% {
    transform: translate(-160%, -178%) scale(3);
  }
  23%, 48% {
    transform: translate(-62.5%, -118%) scale(3);
  }
  57%, 100% {
    transform: translate(-160%, -178%) scale(3);
  }
}

/* Canvas snap box */
@keyframes ml-mag-snap-box {
  0%, 23% { opacity: 0; }
  23.01%, 28% { opacity: 1; }
  28.01%, 100% { opacity: 0; }
}

/* Magnifier snap marker: stays at loupe center while the finger holds the
   snap target, then drifts off with the magnified view as the finger returns.
   Marker loupe-pos = 50% + 3 * (snap - finger); at the start position that is
   (-47.5%, -10%), i.e. outside the loupe viewport. */
@keyframes ml-mag-hud-snap {
  0%, 23% {
    opacity: 0;
    left: 50%;
    top: 50%;
  }
  23.01%, 48% {
    opacity: 1;
    left: 50%;
    top: 50%;
  }
  57%, 100% {
    opacity: 1;
    left: -47.5%;
    top: -10%;
  }
}

/* Green crosshair: appears at snap commit (28%), stays fully visible, then
   fades out in the same window as the magnifier HUD (85% → 96%) so both
   disappear together */
@keyframes ml-mag-snap-cross {
  0%, 28% { opacity: 0; }
  28.01%, 85% { opacity: 1; }
  96%, 100% { opacity: 0; }
}
</style>
