import * as THREE from 'three'

/** Highlight interaction kind bound to one packed geometry slot. */
export type AcTrBatchHighlightKind = 'select' | 'hover'

/**
 * Compare-display role for one packed geometry slot.
 * Encoded in the B channel of the highlight mask texture.
 */
export type AcTrBatchCompareRole = 'deleted' | 'added' | 'modified'

/** No compare role encoded in {@link AcTrBatchHighlightState.compareRoleMask}. */
export const COMPARE_ROLE_NONE = 0
/** Deleted (left/old) entity encoded in {@link AcTrBatchHighlightState.compareRoleMask}. */
export const COMPARE_ROLE_DELETED = 1
/** Added (right/new) entity encoded in {@link AcTrBatchHighlightState.compareRoleMask}. */
export const COMPARE_ROLE_ADDED = 2
/** Modified entity encoded in {@link AcTrBatchHighlightState.compareRoleMask}. */
export const COMPARE_ROLE_MODIFIED = 3

/**
 * Maps a compare role to its mask encoding.
 *
 * @param role - Compare role, or `null` / `undefined` for {@link COMPARE_ROLE_NONE}.
 */
export function compareRoleToMaskValue(
  role: AcTrBatchCompareRole | null | undefined
): number {
  if (role === 'deleted') return COMPARE_ROLE_DELETED
  if (role === 'added') return COMPARE_ROLE_ADDED
  if (role === 'modified') return COMPARE_ROLE_MODIFIED
  return COMPARE_ROLE_NONE
}

/** Safe upper bound for one highlight mask texture dimension. */
const MAX_MASK_TEXTURE_DIMENSION = 4096

/**
 * Computes a 2D mask texture layout that fits `slotCount` slots within GPU
 * dimension limits.
 *
 * @param slotCount - Number of geometry slots to encode in the mask texture.
 * @returns Pixel width and height of the highlight mask texture.
 * @throws {Error} When the slot count exceeds the maximum mask texture capacity.
 */
function computeMaskTextureLayout(slotCount: number) {
  const count = Math.max(slotCount, 1)
  if (count <= MAX_MASK_TEXTURE_DIMENSION) {
    return { width: count, height: 1 }
  }

  const width = MAX_MASK_TEXTURE_DIMENSION
  const height = Math.ceil(count / width)
  if (height > MAX_MASK_TEXTURE_DIMENSION) {
    throw new Error(
      `AcTrBatchHighlightState: slot count ${count} exceeds highlight mask capacity.`
    )
  }
  return { width, height }
}

/**
 * Per-batch CPU/GPU highlight mask for packed geometry slots.
 *
 * Selection and hover each occupy one channel in an RGBA `DataTexture`
 * (R = selected, G = hovered). Compare roles use the B channel.
 * Large batches use a 2D texture layout so width stays within GPU limits.
 */
export class AcTrBatchHighlightState {
  /** CPU-side selection flags indexed by geometry slot id. */
  selectedMask = new Uint8Array(0)
  /** CPU-side hover flags indexed by geometry slot id. */
  hoveredMask = new Uint8Array(0)
  /**
   * CPU-side compare roles indexed by geometry slot id.
   * Values: {@link COMPARE_ROLE_NONE} / DELETED / ADDED / MODIFIED.
   */
  compareRoleMask = new Uint8Array(0)
  /** When true, batch shaders force the compare base color then role overrides. */
  compareEnabled = false
  /** Base (unchanged) color while compare display is enabled. */
  compareBaseColor = new THREE.Color(0x9ca3af)
  /** Color for deleted entities. */
  compareDeletedColor = new THREE.Color(0xe11d48)
  /** Color for added entities. */
  compareAddedColor = new THREE.Color(0x22c55e)
  /** Color for modified entities. */
  compareModifiedColor = new THREE.Color(0xf59e0b)
  /** GPU mask texture uploaded from highlight and compare masks. */
  maskTexture: THREE.DataTexture | null = null
  /** Current width of {@link maskTexture} in pixels. */
  maskTextureWidth = 0
  /** Current height of {@link maskTexture} in pixels. */
  maskTextureHeight = 0
  /** Whether CPU mask data changed since the last texture upload. */
  dirty = false
  /**
   * Highest slot index that may appear in vertex `slotId` attributes for this
   * batch, regardless of whether that slot is currently highlighted.
   */
  addressableSlotCount = 0

  /**
   * Returns the number of slots the mask texture must cover for correct UV
   * lookups from any packed geometry in the batch.
   */
  getTextureSlotCount() {
    return Math.max(
      this.selectedMask.length,
      this.hoveredMask.length,
      this.compareRoleMask.length,
      this.addressableSlotCount,
      1
    )
  }

  /**
   * Grows CPU mask arrays when the batch needs to address more geometry slots.
   *
   * @param slotCount - Minimum number of slots that must be addressable.
   */
  ensureCapacity(slotCount: number) {
    if (slotCount <= this.selectedMask.length) {
      return
    }
    const newSize = Math.max(slotCount, this.selectedMask.length * 2, 16)
    const selectedMask = new Uint8Array(newSize)
    const hoveredMask = new Uint8Array(newSize)
    const compareRoleMask = new Uint8Array(newSize)
    selectedMask.set(this.selectedMask)
    hoveredMask.set(this.hoveredMask)
    compareRoleMask.set(this.compareRoleMask)
    this.selectedMask = selectedMask
    this.hoveredMask = hoveredMask
    this.compareRoleMask = compareRoleMask
  }

  /**
   * Records how many geometry slots may appear in packed vertex attributes.
   *
   * Ensures the uploaded mask texture is large enough that unhighlighted slots
   * sample zero rather than clamping to a highlighted edge texel.
   *
   * @param slotCount - One plus the highest geometry slot id in the batch.
   */
  setAddressableSlotCount(slotCount: number) {
    if (slotCount <= this.addressableSlotCount) {
      return
    }

    const previousLayout = computeMaskTextureLayout(this.getTextureSlotCount())
    this.addressableSlotCount = slotCount
    this.ensureCapacity(slotCount)

    const nextLayout = computeMaskTextureLayout(this.getTextureSlotCount())
    if (
      this.maskTexture != null &&
      (previousLayout.width !== nextLayout.width ||
        previousLayout.height !== nextLayout.height)
    ) {
      this.dirty = true
    }
  }

  /**
   * Sets or clears one highlight flag for a geometry slot.
   *
   * @param slotId - Packed geometry slot index within the batch.
   * @param kind - Whether to update selection or hover state.
   * @param enabled - `true` to highlight the slot, `false` to clear it.
   * @returns `true` when the mask value changed.
   */
  setHighlight(slotId: number, kind: AcTrBatchHighlightKind, enabled: boolean) {
    this.ensureCapacity(slotId + 1)
    const mask = kind === 'select' ? this.selectedMask : this.hoveredMask
    const next = enabled ? 1 : 0
    if (mask[slotId] === next) {
      return false
    }
    mask[slotId] = next
    this.dirty = true
    return true
  }

  /**
   * Sets the compare role for one geometry slot (or clears it when `role` is null).
   *
   * @param slotId - Packed geometry slot index within the batch.
   * @param role - Compare role, or `null` / `undefined` to clear.
   * @returns `true` when the mask value changed.
   */
  setCompareRole(
    slotId: number,
    role: AcTrBatchCompareRole | null | undefined
  ) {
    this.ensureCapacity(slotId + 1)
    const next = compareRoleToMaskValue(role)
    if (this.compareRoleMask[slotId] === next) {
      return false
    }
    this.compareRoleMask[slotId] = next
    this.dirty = true
    return true
  }

  /**
   * Clears both selection and hover flags for one geometry slot.
   * Compare role is left unchanged.
   *
   * @param slotId - Packed geometry slot index within the batch.
   * @returns `true` when either mask channel changed.
   */
  clearSlot(slotId: number) {
    let changed = false
    if (this.selectedMask[slotId]) {
      this.selectedMask[slotId] = 0
      changed = true
    }
    if (this.hoveredMask[slotId]) {
      this.hoveredMask[slotId] = 0
      changed = true
    }
    if (changed) {
      this.dirty = true
    }
    return changed
  }

  /**
   * Clears all selection and hover flags owned by this batch.
   *
   * @returns `true` when any mask data existed before clearing.
   */
  clearAll() {
    if (!this.hasAnyHighlight()) {
      return false
    }
    this.selectedMask.fill(0)
    this.hoveredMask.fill(0)
    this.dirty = true
    return true
  }

  /**
   * Clears all compare role flags owned by this batch.
   *
   * @returns `true` when any compare role existed before clearing.
   */
  clearAllCompareRoles() {
    if (!this.hasAnyCompareRole()) {
      return false
    }
    this.compareRoleMask.fill(0)
    this.dirty = true
    return true
  }

  /**
   * Returns whether any geometry slot is currently selected or hovered.
   *
   * @returns `true` when at least one slot has a non-zero mask value.
   */
  hasAnyHighlight() {
    for (let i = 0; i < this.selectedMask.length; i++) {
      if (this.selectedMask[i] || this.hoveredMask[i]) {
        return true
      }
    }
    return false
  }

  /**
   * Returns whether any geometry slot has a compare role override.
   */
  hasAnyCompareRole() {
    for (let i = 0; i < this.compareRoleMask.length; i++) {
      if (this.compareRoleMask[i]) {
        return true
      }
    }
    return false
  }

  /**
   * Whether the batch shader should apply compare coloring (base + roles).
   */
  needsCompareUniforms() {
    return this.compareEnabled
  }

  /**
   * Uploads CPU mask arrays into {@link maskTexture}, reallocating when layout
   * dimensions change.
   *
   * @param force - When `true`, rebuilds the texture even if {@link dirty} is false.
   * @returns The mask texture bound by batch highlight shaders.
   */
  uploadMaskTexture(force = false) {
    if (!force && !this.dirty && this.maskTexture != null) {
      return this.maskTexture
    }

    const slotCount = this.getTextureSlotCount()
    const { width, height } = computeMaskTextureLayout(slotCount)
    const data = new Uint8Array(width * height * 4)

    for (let slotId = 0; slotId < slotCount; slotId++) {
      const x = slotId % width
      const y = Math.floor(slotId / width)
      const offset = (y * width + x) * 4
      data[offset] = this.selectedMask[slotId] ? 255 : 0
      data[offset + 1] = this.hoveredMask[slotId] ? 255 : 0
      // Encode compare role in B: 0 / 85 / 170 / 255
      const role = this.compareRoleMask[slotId] ?? 0
      data[offset + 2] = role === 0 ? 0 : role * 85
    }

    if (
      this.maskTexture == null ||
      this.maskTextureWidth !== width ||
      this.maskTextureHeight !== height
    ) {
      this.maskTexture?.dispose()
      this.maskTexture = new THREE.DataTexture(
        data,
        width,
        height,
        THREE.RGBAFormat
      )
      this.maskTexture.minFilter = THREE.NearestFilter
      this.maskTexture.magFilter = THREE.NearestFilter
      this.maskTexture.generateMipmaps = false
      this.maskTexture.unpackAlignment = 1
      // Role bytes (0/85/170/255) must not be sRGB-decoded; that would map
      // added (170) into the deleted shader threshold band.
      this.maskTexture.colorSpace = THREE.NoColorSpace
      this.maskTexture.needsUpdate = true
      this.maskTextureWidth = width
      this.maskTextureHeight = height
    } else {
      this.maskTexture.image.data = data
      this.maskTexture.needsUpdate = true
    }

    this.dirty = false
    return this.maskTexture
  }

  /**
   * Returns the pixel dimensions of the current highlight mask texture.
   *
   * @returns Width and height, each at least `1`.
   */
  getMaskTextureDimensions() {
    return {
      width: Math.max(this.maskTextureWidth, 1),
      height: Math.max(this.maskTextureHeight, 1)
    }
  }
}
