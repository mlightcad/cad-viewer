import {
  AcDbDatabase,
  AcDbFileType,
  AcDbObjectId,
  AcGePoint3d,
  AcGePoint3dLike
} from '@mlightcad/data-model'

import { acapWithSecondaryDatabase } from '../util/AcApSecondaryDatabase'

/**
 * Drawing data held by the clipboard.
 */
export interface AcApClipboardContent {
  /**
   * Temporary database with the copied entities in model space and every
   * record they depend on, as written by {@link AcDbDatabase.wblock}.
   */
  database: AcDbDatabase
  /**
   * Base point used when pasting. COPYCLIP uses the lower-left corner of the
   * copied objects' extents, COPYBASE the point the user picked.
   */
  basePoint: AcGePoint3d
  /**
   * Database the objects were copied from, when it is open in this page.
   * `undefined` when the content came from another browser tab.
   */
  sourceDatabase?: AcDbDatabase
}

/**
 * Minimal text clipboard used to share drawing data between browser tabs.
 */
export interface AcApSystemClipboard {
  writeText(text: string): Promise<void>
  readText(): Promise<string>
}

/** First DXF comment line identifying clipboard data written by this app. */
const CLIPBOARD_MARKER = 'MLIGHTCAD_CLIPBOARD'
const CLIPBOARD_VERSION = 'v1'

function browserClipboard(): AcApSystemClipboard | undefined {
  if (typeof navigator === 'undefined') return undefined
  const clipboard = navigator.clipboard
  if (!clipboard?.writeText || !clipboard.readText) return undefined
  return clipboard
}

function createStamp() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Application clipboard for drawing objects (COPYCLIP / PASTECLIP).
 *
 * Works like AutoCAD: copying writes the selected objects and everything they
 * reference into a temporary database ({@link AcDbDatabase.wblock}); pasting
 * inserts that database into the target drawing ({@link AcDbDatabase.insert}),
 * where records with an existing name keep the target's definition.
 *
 * One clipboard is shared by every document open in the page, so objects can
 * be pasted into another drawing tab. The content is also written to the
 * system clipboard as DXF text, so another browser tab running this app can
 * paste it. System clipboard access is best effort: when the browser denies
 * it, the in-memory content is used.
 */
export class AcApClipboard {
  private _content?: AcApClipboardContent
  private _stamp?: string
  private readonly _system?: AcApSystemClipboard

  /**
   * @param system - Text clipboard used for cross-tab copy and paste.
   * Defaults to `navigator.clipboard`; pass `null` to keep the clipboard in
   * memory only.
   */
  constructor(system?: AcApSystemClipboard | null) {
    this._system = system === null ? undefined : (system ?? browserClipboard())
  }

  /** True when the in-memory clipboard holds drawing data. */
  get hasContent() {
    return !!this._content
  }

  /**
   * Copies entities to the clipboard.
   *
   * @param sourceDb - Database that owns the entities.
   * @param objectIds - Ids of the entities to copy.
   * @param basePoint - Base point used when pasting.
   * @returns The new clipboard content.
   */
  set(
    sourceDb: AcDbDatabase,
    objectIds: AcDbObjectId[],
    basePoint: AcGePoint3dLike
  ): AcApClipboardContent {
    const content: AcApClipboardContent = {
      database: sourceDb.wblock(objectIds),
      basePoint: new AcGePoint3d(basePoint),
      sourceDatabase: sourceDb
    }
    this._content = content
    this._stamp = createStamp()
    void this.writeSystemClipboard(content, this._stamp)
    return content
  }

  /**
   * Returns the content to paste.
   *
   * Prefers drawing data copied in another browser tab when the system
   * clipboard holds newer data from this app; otherwise returns the in-memory
   * content.
   */
  async get(): Promise<AcApClipboardContent | undefined> {
    const text = await this.readSystemClipboard()
    if (text) {
      const parsed = AcApClipboard.parseHeader(text)
      if (parsed && parsed.stamp !== this._stamp) {
        const content = await AcApClipboard.deserialize(text)
        if (content) {
          this._content = content
          this._stamp = parsed.stamp
          return content
        }
      }
    }
    return this._content
  }

  /** Empties the in-memory clipboard. */
  clear() {
    this._content = undefined
    this._stamp = undefined
  }

  /**
   * Serializes clipboard content as DXF text preceded by an identifying
   * comment that carries the base point.
   *
   * @param content - Content to serialize.
   * @param stamp - Unique id of this copy operation.
   */
  static serialize(content: AcApClipboardContent, stamp: string): string {
    const { x, y, z } = content.basePoint
    const dxf = content.database.dxfOut(undefined, 16, undefined, {
      format: 'ascii'
    })
    const text =
      typeof dxf === 'string'
        ? dxf
        : new TextDecoder().decode(dxf as Uint8Array)
    return `999\n${CLIPBOARD_MARKER} ${CLIPBOARD_VERSION} ${stamp} ${x} ${y} ${z}\n${text}`
  }

  /**
   * Restores clipboard content from text written by {@link serialize}.
   *
   * @param text - Clipboard text.
   * @returns The content, or `undefined` when the text is not clipboard data
   * of this app or cannot be read.
   */
  static async deserialize(
    text: string
  ): Promise<AcApClipboardContent | undefined> {
    const header = AcApClipboard.parseHeader(text)
    if (!header) return undefined
    const database = new AcDbDatabase()
    try {
      // DXF import makes the database being read the working database;
      // restore the host's afterwards.
      await acapWithSecondaryDatabase(database, () =>
        database.read(text, { readOnly: true }, AcDbFileType.DXF)
      )
    } catch {
      return undefined
    }
    return { database, basePoint: header.basePoint }
  }

  private static parseHeader(text: string) {
    const match = /^\s*999\r?\n(\S+) (\S+) (\S+) (\S+) (\S+) (\S+)\r?\n/.exec(
      text
    )
    if (
      !match ||
      match[1] !== CLIPBOARD_MARKER ||
      match[2] !== CLIPBOARD_VERSION
    ) {
      return undefined
    }
    const coords = [match[4], match[5], match[6]].map(Number)
    if (coords.some(value => !Number.isFinite(value))) return undefined
    return {
      stamp: match[3],
      basePoint: new AcGePoint3d(coords[0], coords[1], coords[2])
    }
  }

  private async writeSystemClipboard(
    content: AcApClipboardContent,
    stamp: string
  ) {
    if (!this._system) return
    try {
      await this._system.writeText(AcApClipboard.serialize(content, stamp))
    } catch {
      // Permission denied or page not focused: the in-memory copy still works.
    }
  }

  private async readSystemClipboard() {
    if (!this._system) return undefined
    try {
      return await this._system.readText()
    } catch {
      return undefined
    }
  }
}
