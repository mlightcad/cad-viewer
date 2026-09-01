import { AcUiDrawStyleSessionAccessory } from '../ui/AcUiDrawStyleSessionAccessory'
import { AcUiDrawStyleSessionAccessorySource } from '../ui/AcUiDrawStyleSessionAccessorySource'
import type { AcTrView2d } from '../view'
import type { AcApDrawStyleSessionInstallContext } from './AcApDrawStyleSession'

interface DrawStyleInstallRecord {
  host: AcUiDrawStyleSessionAccessory
  unregisterSource: () => void
}

const installs = new WeakMap<object, DrawStyleInstallRecord>()

/**
 * Registers draw-style controls and coordinator source for a view.
 *
 * Idempotent: safe to call from both measure and markup command registration.
 *
 * @param ctx - View, coordinator, and command stack for this document.
 * @returns The view's draw-style session accessory host.
 */
export function acapInstallDrawStyleSessionAccessory(
  ctx: AcApDrawStyleSessionInstallContext
): AcUiDrawStyleSessionAccessory {
  const existing = installs.get(ctx.view)
  if (existing) return existing.host

  const host = new AcUiDrawStyleSessionAccessory(ctx.view)
  const source = new AcUiDrawStyleSessionAccessorySource(
    ctx.commandManager,
    host
  )
  const unregisterSource = ctx.coordinator.addSource(source)
  installs.set(ctx.view, { host, unregisterSource })
  return host
}

/**
 * Returns the draw-style session accessory installed for a view, if any.
 *
 * @param view - View passed to {@link acapInstallDrawStyleSessionAccessory}.
 */
export function acapGetDrawStyleSessionAccessory(
  view: AcTrView2d
): AcUiDrawStyleSessionAccessory | undefined {
  return installs.get(view)?.host
}
