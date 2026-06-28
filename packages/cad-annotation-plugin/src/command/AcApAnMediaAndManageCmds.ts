import type { AcApContext } from '@mlightcad/cad-simple-viewer'
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { AcEdCommand, AcEdOpenMode } from '@mlightcad/cad-simple-viewer'
import { AcApI18n } from '@mlightcad/cad-simple-viewer'

import { getAnnotationServices } from '../AcApAnnotationServices'
import {
  downloadJson,
  isMobileDevice,
  MAX_VIDEO_DURATION_SEC,
  pickImageFile,
  pickJsonFile
} from '../util/annotationUtil'
import { promptAnnotationText } from '../util/promptText'
import { AcApAnnotationCmd } from './AcApAnnotationCmd'

async function pickVideoFile(): Promise<
  { mime: string; data: string; duration?: number } | undefined
> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'video/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) {
        resolve(undefined)
        return
      }
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      resolve({
        mime: file.type || 'video/webm',
        data: btoa(binary)
      })
    }
    input.click()
  })
}

async function recordAudio(): Promise<
  { mime: string; data: string } | undefined
> {
  if (!navigator.mediaDevices?.getUserMedia) return undefined
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const recorder = new MediaRecorder(stream)
  const chunks: BlobPart[] = []
  recorder.ondataavailable = e => chunks.push(e.data)
  return new Promise(resolve => {
    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop())
      const blob = new Blob(chunks, { type: recorder.mimeType })
      const buffer = await blob.arrayBuffer()
      const bytes = new Uint8Array(buffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      resolve({ mime: recorder.mimeType, data: btoa(binary) })
    }
    recorder.start()
    setTimeout(() => recorder.stop(), MAX_VIDEO_DURATION_SEC * 1000)
  })
}

export class AcApAnImageCmd extends AcApAnnotationCmd {
  async execute(context: AcApContext) {
    const picked = await pickImageFile()
    if (!picked) return
    const anchor = await this.getPoint(AcApI18n.t('annotation.jig.media.point'))
    if (!anchor) return
    this.commitRecord(context, {
      type: 'image',
      carrier: 'image',
      layoutSpaceId: this.layoutSpaceId(context),
      geometry: { anchor: { x: anchor.x, y: anchor.y }, width: 120 },
      content: {
        mediaMimeType: picked.mime,
        mediaData: picked.data
      },
      style: { ...this.style }
    })
  }
}

export class AcApAnVideoCmd extends AcApAnnotationCmd {
  async execute(context: AcApContext) {
    const picked = await pickVideoFile()
    if (!picked) return
    const anchor = await this.getPoint(AcApI18n.t('annotation.jig.media.point'))
    if (!anchor) return
    this.commitRecord(context, {
      type: 'video',
      carrier: 'video',
      layoutSpaceId: this.layoutSpaceId(context),
      geometry: { anchor: { x: anchor.x, y: anchor.y } },
      content: {
        mediaMimeType: picked.mime,
        mediaData: picked.data,
        mediaDuration: picked.duration
      },
      style: { ...this.style }
    })
  }
}

export class AcApAnAudioCmd extends AcApAnnotationCmd {
  async execute(context: AcApContext) {
    if (!isMobileDevice()) {
      AcApDocManager.instance.editor.showMessage(
        AcApI18n.t('annotation.audio.desktopDisabled'),
        'info'
      )
      return
    }
    const recorded = await recordAudio()
    if (!recorded) return
    const anchor = await this.getPoint(AcApI18n.t('annotation.jig.media.point'))
    if (!anchor) return
    this.commitRecord(context, {
      type: 'audio',
      carrier: 'audio',
      layoutSpaceId: this.layoutSpaceId(context),
      geometry: { anchor: { x: anchor.x, y: anchor.y } },
      content: {
        mediaMimeType: recorded.mime,
        mediaData: recorded.data
      },
      style: { ...this.style }
    })
  }
}

export class AcApAnnVisCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  async execute(context: AcApContext) {
    const services = getAnnotationServices()
    services.annotationsVisible = !services.annotationsVisible
    const store = services.getStoreFromContext(context)
    store.setAllVisible(services.annotationsVisible)
    if (services.annotationsVisible) {
      services.refreshAll(context)
    } else {
      services.renderer.clear()
    }
    services.shell?.refresh()
  }
}

export class AcApAnnExportCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  async execute(context: AcApContext) {
    const services = getAnnotationServices()
    const store = services.getStoreFromContext(context)
    const json = services.codec.export(store)
    downloadJson(`annotations-${Date.now()}.json`, json)
  }
}

export class AcApAnnImportCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  async execute(context: AcApContext) {
    const text = await pickJsonFile()
    if (!text) return
    const services = getAnnotationServices()
    const store = services.getStoreFromContext(context)
    try {
      services.codec.import(text, store, { mode: 'merge' })
      services.refreshAll(context)
      services.shell?.refresh()
    } catch (err) {
      AcApDocManager.instance.editor.showMessage(
        `${AcApI18n.t('annotation.import.failed')}: ${String(err)}`,
        'error'
      )
    }
  }
}

export class AcApAnnPanelCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  async execute(_context: AcApContext) {
    const services = getAnnotationServices()
    services.panelVisible = !services.panelVisible
    services.shell?.setPanelVisible(services.panelVisible)
  }
}

export class AcApAnnBookmarkCmd extends AcEdCommand {
  constructor() {
    super()
    this.mode = AcEdOpenMode.Read
  }

  async execute(context: AcApContext) {
    const services = getAnnotationServices()
    const name = await promptAnnotationText(
      AcApI18n.t('annotation.bookmark.namePrompt')
    )
    if (!name) return
    services.createBookmark(context, name)
  }
}