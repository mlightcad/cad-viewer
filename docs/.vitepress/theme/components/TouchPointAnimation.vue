<template>
  <div class="ml-touch-tutorial-demo">
    <div
      class="ml-touch-tutorial-canvas"
      :style="{
        '--ml-touch-snap-x': '40.5%',
        '--ml-touch-snap-y': '46%',
        '--ml-touch-cross-above': '32px',
        '--ml-touch-cross-half': '9px',
      }"
    >
      <!-- Road intersection background -->
      <div class="ml-touch-tutorial-roads">
        <svg viewBox="0 0 160 100" preserveAspectRatio="none" aria-hidden="true">
          <line x1="0" y1="38" x2="56.8" y2="38" stroke="rgba(210,210,210,0.55)" stroke-width="0.9" />
          <line x1="64.8" y1="38" x2="160" y2="38" stroke="rgba(210,210,210,0.55)" stroke-width="0.9" />
          <line x1="0" y1="46" x2="56.8" y2="46" stroke="rgba(210,210,210,0.55)" stroke-width="0.9" />
          <line x1="64.8" y1="46" x2="160" y2="46" stroke="rgba(210,210,210,0.55)" stroke-width="0.9" />
          <line x1="56.8" y1="0" x2="56.8" y2="38" stroke="rgba(210,210,210,0.55)" stroke-width="0.9" />
          <line x1="56.8" y1="46" x2="56.8" y2="100" stroke="rgba(210,210,210,0.55)" stroke-width="0.9" />
          <line x1="64.8" y1="0" x2="64.8" y2="38" stroke="rgba(210,210,210,0.55)" stroke-width="0.9" />
          <line x1="64.8" y1="46" x2="64.8" y2="100" stroke="rgba(210,210,210,0.55)" stroke-width="0.9" />
          <line x1="0" y1="42" x2="160" y2="42" stroke="rgba(230,70,70,0.95)" stroke-width="1.1" />
          <line x1="60.8" y1="0" x2="60.8" y2="100" stroke="rgba(230,70,70,0.95)" stroke-width="1.1" />
        </svg>
      </div>
      <!-- Snap target box -->
      <div class="ml-touch-tutorial-snap-box"></div>
      <!-- Touch group: finger + touch zone -->
      <div class="ml-touch-tutorial-touch-group">
        <div class="ml-touch-tutorial-touch-zone">
          <svg viewBox="0 0 36 36" aria-hidden="true">
            <circle class="ml-touch-tutorial-touch-fill" cx="18" cy="18" r="16" fill="rgba(120,120,120,0.42)" />
            <circle class="ml-touch-tutorial-touch-ring" cx="18" cy="18" r="18" />
          </svg>
        </div>
        <div class="ml-touch-tutorial-finger">
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
      <!-- Crosshair cursor -->
      <div class="ml-touch-tutorial-cross">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path fill="none" stroke="currentColor" stroke-width="2" d="M8 2v12M2 8h12" />
        </svg>
      </div>
    </div>
  </div>
</template>

<style>
.ml-touch-tutorial-demo {
  margin: 16px auto;
  max-width: 480px;
}

.ml-touch-tutorial-canvas {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  background: #0a0a0a;
  border-radius: 6px;
  overflow: hidden;
}

.ml-touch-tutorial-roads {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.ml-touch-tutorial-roads svg {
  display: block;
  width: 100%;
  height: 100%;
}

.ml-touch-tutorial-touch-group {
  position: absolute;
  left: 70%;
  top: 76%;
  width: 0;
  height: 0;
  animation: ml-touch-group 10s ease-in-out infinite;
  z-index: 4;
}

.ml-touch-tutorial-touch-zone {
  position: absolute;
  left: 0;
  top: 0;
  width: 36px;
  height: 36px;
  margin: -18px 0 0 -18px;
  pointer-events: none;
  opacity: 0;
  animation: ml-touch-zone-opacity 10s linear infinite;
  z-index: 1;
}

.ml-touch-tutorial-touch-zone svg {
  display: block;
  width: 100%;
  height: 100%;
}

.ml-touch-tutorial-touch-fill {
  opacity: 1;
}

.ml-touch-tutorial-touch-ring {
  fill: none;
  stroke: rgba(255, 255, 255, 0.95);
  stroke-width: 2;
  stroke-dasharray: 113.1;
  stroke-dashoffset: 113.1;
  animation: ml-touch-ring 10s linear infinite;
}

.ml-touch-tutorial-finger {
  position: absolute;
  left: 0;
  top: 0;
  width: 30px;
  height: 38px;
  margin: -6px 0 0 -15px;
  opacity: 0;
  animation: ml-touch-finger-opacity 10s linear infinite;
  z-index: 2;
}

.ml-touch-tutorial-finger svg {
  display: block;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.45));
}

.ml-touch-tutorial-cross {
  position: absolute;
  left: 70%;
  top: calc(76% - var(--ml-touch-cross-above));
  width: 18px;
  height: 18px;
  margin: calc(-1 * var(--ml-touch-cross-half)) 0 0 calc(-1 * var(--ml-touch-cross-half));
  color: #0b84ff;
  opacity: 0;
  animation:
    ml-touch-cross-move 10s ease-in-out infinite,
    ml-touch-cross-opacity 10s linear infinite,
    ml-touch-cross-color 10s step-end infinite;
  z-index: 5;
}

.ml-touch-tutorial-cross svg {
  display: block;
  width: 100%;
  height: 100%;
}

.ml-touch-tutorial-snap-box {
  position: absolute;
  left: var(--ml-touch-snap-x);
  top: var(--ml-touch-snap-y);
  width: 22px;
  height: 22px;
  margin: -11px 0 0 -11px;
  border: 2px solid #0f0;
  border-radius: 1px;
  box-sizing: border-box;
  opacity: 0;
  pointer-events: none;
  animation: ml-touch-snap-box 10s step-end infinite;
  z-index: 3;
}

@keyframes ml-touch-group {
  0%,
  5% {
    left: 70%;
    top: 76%;
  }
  23%,
  48% {
    left: var(--ml-touch-snap-x);
    top: calc(var(--ml-touch-snap-y) + var(--ml-touch-cross-above) + var(--ml-touch-cross-half));
  }
  57%,
  100% {
    left: 70%;
    top: 76%;
  }
}

@keyframes ml-touch-zone-opacity {
  0%,
  4.6% {
    opacity: 0;
  }
  5.4%,
  48% {
    opacity: 1;
  }
  57%,
  100% {
    opacity: 0;
  }
}

@keyframes ml-touch-finger-opacity {
  0%,
  2% {
    opacity: 0;
  }
  2.8%,
  99.99% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@keyframes ml-touch-ring {
  0%,
  4.6% {
    stroke-dashoffset: 113.1;
  }
  9.6%,
  96% {
    stroke-dashoffset: 0;
  }
  100% {
    stroke-dashoffset: 113.1;
  }
}

@keyframes ml-touch-cross-move {
  0%,
  5% {
    left: 70%;
    top: calc(76% - var(--ml-touch-cross-above));
  }
  23%,
  27% {
    left: var(--ml-touch-snap-x);
    top: calc(var(--ml-touch-snap-y) + var(--ml-touch-cross-half));
  }
  27%,
  99.99% {
    left: var(--ml-touch-snap-x);
    top: var(--ml-touch-snap-y);
  }
  100% {
    left: 70%;
    top: calc(76% - var(--ml-touch-cross-above));
  }
}

@keyframes ml-touch-cross-opacity {
  0%,
  5% {
    opacity: 0;
  }
  5.6%,
  57% {
    opacity: 1;
  }
  96%,
  100% {
    opacity: 0;
  }
}

@keyframes ml-touch-cross-color {
  0%,
  28% {
    color: #0b84ff;
  }
  28.01%,
  57% {
    color: #0f0;
  }
  100% {
    color: #0b84ff;
  }
}

@keyframes ml-touch-snap-box {
  0%,
  23% {
    opacity: 0;
  }
  23.01%,
  28% {
    opacity: 1;
  }
  28.01%,
  100% {
    opacity: 0;
  }
}
</style>
