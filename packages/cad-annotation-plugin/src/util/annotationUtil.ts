import type { AcEdBaseView } from '@mlightcad/cad-simple-viewer'
import type { AcTrView2d } from '@mlightcad/cad-simple-viewer'

export function asTrView(view: AcEdBaseView): AcTrView2d {
  return view as AcTrView2d
}

export function captureViewState(view: AcEdBaseView): {
  center: { x: number; y: number }
  scale: number
} {
  const trView = asTrView(view)
  const center = view.center
  const camera = trView.internalCamera
  const zoom =
    camera && 'zoom' in camera
      ? (camera as { zoom: number }).zoom
      : 1
  return { center: { x: center.x, y: center.y }, scale: zoom }
}

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua)
}

export const MAX_VIDEO_DURATION_SEC = 60

export async function readFileAsBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function downloadJson(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function pickJsonFile(): Promise<string | undefined> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(undefined)
        return
      }
      resolve(await file.text())
    }
    input.click()
  })
}

export async function pickImageFile(): Promise<
  { mime: string; data: string } | undefined
> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(undefined)
        return
      }
      const data = await readFileAsBase64(file)
      resolve({ mime: file.type || 'image/png', data })
    }
    input.click()
  })
}