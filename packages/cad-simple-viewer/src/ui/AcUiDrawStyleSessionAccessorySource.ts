import {
  AcApSettingManager,
  type AcApSettingManagerEventArgs
} from '../app/AcApSettingManager'
import { getMarkupStore } from '../command/markup/AcApMarkupStore'
import {
  getSelectedMeasurementId,
  subscribeMeasurementSelection
} from '../command/measure/AcApMeasurementStore'
import type { AcEdCommandStack } from '../editor/command/AcEdCommandStack'
import type { AcEdSessionAccessory } from '../editor/command/AcEdSessionAccessory'
import type {
  AcEdSessionAccessoryResolveContext,
  AcEdSessionAccessorySource
} from '../editor/input/ui/AcEdSessionAccessorySource'
import { acapDrawStyleKindForCommand } from '../util/AcApCommandUtil'
import {
  type AcUiDrawStyleKind,
  type AcUiDrawStyleSessionHost,
  acuiResolveDrawStyleKind,
  acuiShouldShowDrawStyleToolbar
} from './AcUiDrawStyle'

/**
 * Fallback draw-style session accessory for selection-only desktop sessions.
 *
 * Command-time draw-style controls come from
 * `activeCommand.createSessionAccessory()` (via
 * {@link acuiBindDrawStyleSessionAccessory}) and are mounted by
 * {@link AcEdSessionAccessoryCoordinator}. This source does not listen to
 * command lifecycle events.
 */
export class AcUiDrawStyleSessionAccessorySource
  implements AcEdSessionAccessorySource
{
  readonly id = 'draw-style'

  private readonly commandManager: AcEdCommandStack
  private readonly host: AcUiDrawStyleSessionHost

  /**
   * @param commandManager - Active command stack (for kind while a command runs).
   * @param host - Draw-style controls reparented into session slots.
   */
  constructor(
    commandManager: AcEdCommandStack,
    host: AcUiDrawStyleSessionHost
  ) {
    this.commandManager = commandManager
    this.host = host
  }

  /** @inheritdoc */
  subscribe(onChange: () => void): () => void {
    const offMarkup = getMarkupStore().subscribe(onChange)
    const offMeasure = subscribeMeasurementSelection(onChange)
    const onSettingsModified = (args: AcApSettingManagerEventArgs) => {
      if (args.key === 'isShowRibbon') onChange()
    }
    AcApSettingManager.instance.events.modified.addEventListener(
      onSettingsModified
    )
    return () => {
      offMarkup()
      offMeasure()
      AcApSettingManager.instance.events.modified.removeEventListener(
        onSettingsModified
      )
    }
  }

  /** @inheritdoc */
  resolve(input: AcEdSessionAccessoryResolveContext): AcEdSessionAccessory | null {
    const kind = this.resolveKind()
    this.host.setActiveKind(kind)

    if (input.slot === 'mobile') {
      return null
    }

    if (kind == null || !acuiShouldShowDrawStyleToolbar(kind)) {
      return null
    }

    return this.host.createSessionAccessory()
  }

  private resolveKind(): AcUiDrawStyleKind | undefined {
    return acuiResolveDrawStyleKind({
      commandKind: acapDrawStyleKindForCommand(
        this.commandManager.activeCommand?.globalName
      ),
      markupSelected: getMarkupStore().selectedId != null,
      measurementSelected: getSelectedMeasurementId() != null
    })
  }
}
