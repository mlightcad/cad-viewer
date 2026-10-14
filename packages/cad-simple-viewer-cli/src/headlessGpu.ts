import { type Browser, chromium } from 'playwright'

/**
 * ANGLE / GL backend tried for headless WebGL, in preference order.
 * `swiftshader` is the software renderer used when no hardware backend works.
 */
type GpuBackend =
  | 'd3d11'
  | 'd3d9'
  | 'metal'
  | 'vulkan'
  | 'gl'
  | 'egl'
  | 'gles'
  | 'swiftshader'

export interface HeadlessGpuLaunch {
  browser: Browser
  /** UNMASKED_RENDERER_WEBGL string, or `unavailable`. */
  renderer: string
  backend: GpuBackend
}

/**
 * Hardware backends for this OS, then SwiftShader.
 *
 * Playwright's headless Chromium otherwise stays on SwiftShader even when a
 * GPU is present. Each entry is probed; the first real GPU wins.
 */
export function gpuBackendOrder(
  platform: NodeJS.Platform = process.platform
): GpuBackend[] {
  switch (platform) {
    case 'win32':
      return ['d3d11', 'd3d9', 'swiftshader']
    case 'darwin':
      return ['metal', 'gl', 'swiftshader']
    default:
      return ['vulkan', 'gl', 'egl', 'gles', 'swiftshader']
  }
}

/** True for CPU rasterizers (SwiftShader, llvmpipe, WARP, …). */
export function isSoftwareWebGlRenderer(renderer: string): boolean {
  return /swiftshader|llvmpipe|softpipe|lavapipe|microsoft basic render|software raster/i.test(
    renderer
  )
}

function chromiumArgsForBackend(backend: GpuBackend): string[] {
  const shared = ['--ignore-gpu-blocklist', '--enable-gpu', '--enable-webgl']
  if (backend === 'swiftshader') {
    return [
      ...shared,
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader'
    ]
  }
  if (backend === 'egl') {
    return [...shared, '--use-gl=egl']
  }
  return [...shared, '--use-gl=angle', `--use-angle=${backend}`]
}

async function probeWebGlRenderer(browser: Browser): Promise<string> {
  const page = await browser.newPage()
  try {
    return await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      if (!gl) return 'unavailable'
      const ext = gl.getExtension('WEBGL_debug_renderer_info')
      const renderer = ext
        ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER)
      return renderer ? String(renderer) : 'unavailable'
    })
  } catch {
    return 'unavailable'
  } finally {
    await page.close().catch(() => undefined)
  }
}

export interface LaunchHeadlessChromiumOptions {
  /** Playwright browser channel override (e.g. from `PLAYWRIGHT_BROWSER_CHANNEL`). */
  channel?: string
  /** Override OS for backend preference (mainly for tests). */
  platform?: NodeJS.Platform
  /**
   * Prefer hardware GPU WebGL. Default `true`.
   * When hardware is unavailable, falls back to SwiftShader.
   * When `false`, launches SwiftShader directly (no hardware probe).
   */
  useGpu?: boolean
}

async function launchSwiftShader(
  base: { headless: true; channel?: string }
): Promise<HeadlessGpuLaunch> {
  const browser = await chromium.launch({
    ...base,
    args: chromiumArgsForBackend('swiftshader')
  })
  const renderer = await probeWebGlRenderer(browser)
  return { browser, renderer, backend: 'swiftshader' }
}

/**
 * Launches headless Chromium for WebGL.
 *
 * With {@link LaunchHeadlessChromiumOptions.useGpu} `true` (default), probes
 * hardware backends for this OS and falls back to SwiftShader when none work.
 * With `useGpu` `false`, skips the probe and uses SwiftShader immediately.
 */
export async function launchHeadlessChromium(
  options: LaunchHeadlessChromiumOptions = {}
): Promise<HeadlessGpuLaunch> {
  const channel = options.channel
  const platform = options.platform ?? process.platform
  const useGpu = options.useGpu !== false
  const base = {
    headless: true as const,
    ...(channel ? { channel } : {})
  }

  if (!useGpu) {
    console.log(
      '[cad-simple-viewer-cli] GPU disabled; using software renderer (SwiftShader)'
    )
    return launchSwiftShader(base)
  }

  let software: HeadlessGpuLaunch | undefined
  const skipped: string[] = []

  for (const backend of gpuBackendOrder(platform)) {
    let browser: Browser
    try {
      browser = await chromium.launch({
        ...base,
        args: chromiumArgsForBackend(backend)
      })
    } catch (error) {
      skipped.push(
        `${backend} (${error instanceof Error ? error.message : String(error)})`
      )
      continue
    }

    const renderer = await probeWebGlRenderer(browser)
    if (renderer === 'unavailable') {
      skipped.push(`${backend} (no WebGL)`)
      await browser.close().catch(() => undefined)
      continue
    }

    if (!isSoftwareWebGlRenderer(renderer)) {
      if (software) {
        await software.browser.close().catch(() => undefined)
      }
      return { browser, renderer, backend }
    }

    skipped.push(`${backend} (${renderer})`)
    if (!software) {
      software = { browser, renderer, backend }
    } else {
      await browser.close().catch(() => undefined)
    }
  }

  if (software) {
    if (skipped.length > 0) {
      console.log(
        `[cad-simple-viewer-cli] no hardware WebGL; using software renderer. Tried ${skipped.join('; ')}`
      )
    }
    return software
  }

  console.log(
    '[cad-simple-viewer-cli] no hardware WebGL; falling back to SwiftShader'
  )
  return launchSwiftShader(base)
}
