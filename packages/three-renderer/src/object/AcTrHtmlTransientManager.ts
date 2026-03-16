import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'

/**
 * Entry stored for each HTML transient element.
 */
interface HtmlTransientEntry {
  /** The CSS2DObject wrapping the HTML element */
  object: CSS2DObject
  /** The layer this entry belongs to */
  layer: string
}

/** Default layer name when none is specified */
const DEFAULT_LAYER = 'default'

/**
 * Manages transient HTML elements anchored to world coordinates.
 *
 * Similar to {@link AcTrTransientManager} but for HTML overlays instead of
 * Three.js geometry. Uses Three.js CSS2DObject so positioning is handled
 * automatically by CSS2DRenderer — no manual viewChanged listeners needed.
 *
 * Supports grouping entries by **layer** so callers can show/hide or clear
 * specific categories of overlays (e.g. measurements, annotations).
 */
export class AcTrHtmlTransientManager {
  private readonly scene: THREE.Scene
  private readonly htmlGroup: THREE.Group

  /** Mapping from entry ID → entry */
  private readonly entries: Map<string, HtmlTransientEntry>

  constructor(scene: THREE.Scene) {
    this.scene = scene

    this.htmlGroup = new THREE.Group()
    this.htmlGroup.name = 'Html_Transient_Group'
    this.scene.add(this.htmlGroup)

    this.entries = new Map()
  }

  /**
   * Add an HTML element anchored at a world-space position.
   *
   * @param id Unique identifier for this entry
   * @param element The HTML element to display
   * @param worldPosition Position in world coordinates
   * @param layer Optional layer name for grouping (default: 'default')
   */
  add(
    id: string,
    element: HTMLElement,
    worldPosition: { x: number; y: number; z?: number },
    layer: string = DEFAULT_LAYER
  ): void {
    // Remove existing entry with same id
    this.remove(id)

    const css2dObject = new CSS2DObject(element)
    css2dObject.position.set(
      worldPosition.x,
      worldPosition.y,
      worldPosition.z ?? 0
    )

    this.entries.set(id, { object: css2dObject, layer })
    this.htmlGroup.add(css2dObject)
  }

  /**
   * Update the world position of an existing entry.
   *
   * @param id The entry identifier
   * @param worldPosition New position in world coordinates
   */
  updatePosition(
    id: string,
    worldPosition: { x: number; y: number; z?: number }
  ): void {
    const entry = this.entries.get(id)
    if (!entry) return

    entry.object.position.set(
      worldPosition.x,
      worldPosition.y,
      worldPosition.z ?? 0
    )
  }

  /**
   * Remove an entry by ID.
   */
  remove(id: string): void {
    const entry = this.entries.get(id)
    if (!entry) return

    this.htmlGroup.remove(entry.object)
    entry.object.element.remove()
    this.entries.delete(id)
  }

  /**
   * Clear all entries, or only entries on a specific layer.
   *
   * @param layer If provided, only entries on this layer are removed.
   *              If omitted, all entries are removed.
   */
  clear(layer?: string): void {
    if (layer == null) {
      for (const entry of this.entries.values()) {
        this.htmlGroup.remove(entry.object)
        entry.object.element.remove()
      }
      this.entries.clear()
    } else {
      for (const [id, entry] of this.entries) {
        if (entry.layer === layer) {
          this.htmlGroup.remove(entry.object)
          entry.object.element.remove()
          this.entries.delete(id)
        }
      }
    }
  }

  /**
   * Check whether an entry exists.
   */
  has(id: string): boolean {
    return this.entries.has(id)
  }

  /**
   * Retrieve the HTML element for an entry.
   */
  get(id: string): HTMLElement | undefined {
    return this.entries.get(id)?.object.element
  }

  /**
   * Show or hide all entries, or only entries on a specific layer.
   *
   * @param visible Whether to show or hide
   * @param layer If provided, only this layer is affected
   */
  setVisible(visible: boolean, layer?: string): void {
    if (layer == null) {
      this.htmlGroup.visible = visible
    } else {
      for (const entry of this.entries.values()) {
        if (entry.layer === layer) {
          entry.object.visible = visible
        }
      }
    }
  }

  /**
   * Destroy the manager and remove all HTML elements.
   */
  dispose(): void {
    this.clear()
    this.scene.remove(this.htmlGroup)
  }
}
