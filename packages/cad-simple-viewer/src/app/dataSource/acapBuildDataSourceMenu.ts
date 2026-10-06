import { AcApI18n } from '../../i18n/AcApI18n'
import type { AcApDataSource } from './AcApDataSource'
import { ACAP_LOCAL_DATA_SOURCE_ID } from './AcApLocalDataSource'

/** Action triggered when a data-source menu item is clicked. */
export type AcApDataSourceMenuAction = 'pick' | 'sign-in' | 'sign-out'

/**
 * A single menu entry derived from registered data sources.
 *
 * Hosts (ribbon, toolbar, landing page) render these items and run
 * {@link acapRunDataSourceMenuAction} on click.
 */
export interface AcApDataSourceMenuItem {
  /** Stable menu item id (unique across the built menu). */
  id: string
  /** Data source id this item acts on. */
  sourceId: string
  /** Action to run when clicked. */
  action: AcApDataSourceMenuAction
  /** i18n key for the label. */
  labelKey: string
  /** Interpolation params for {@link labelKey}. */
  labelParams?: Record<string, string>
  /** Already-resolved display label. */
  label: string
}

function applyTemplateParams(
  template: string,
  params?: Record<string, string>
): string {
  if (!params) return template
  let text = template
  for (const [key, value] of Object.entries(params)) {
    text = text.split(`{${key}}`).join(value)
  }
  return text
}

/**
 * Builds Open-menu items from the current data-source registry.
 *
 * Rules (popup-blocker safe):
 * - No auth → one **pick** item
 * - Signed out → one **sign-in** item only (never chain into pick)
 * - Signed in → **pick** + **sign-out**
 *
 * @param sources - Registered sources (usually `dataSourceManager.list()`)
 */
export function acapBuildDataSourceMenu(
  sources: AcApDataSource[]
): AcApDataSourceMenuItem[] {
  const items: AcApDataSourceMenuItem[] = []

  for (const source of sources) {
    const sourceLabel = AcApI18n.t(source.labelKey)
    const auth = source.getAuthState()

    if (!source.requiresAuth || auth === 'none') {
      // Built-in sources use their own short label (Local / From URL).
      items.push(
        createItem(source, 'pick', source.labelKey, undefined, sourceLabel)
      )
      continue
    }

    if (auth === 'signed-out') {
      items.push(
        createItem(source, 'sign-in', 'main.dataSource.signInTo', {
          name: sourceLabel
        })
      )
      continue
    }

    // signed-in
    items.push(
      createItem(source, 'pick', 'main.dataSource.openFrom', {
        name: sourceLabel
      })
    )
    const account = source.getAccountLabel?.()
    items.push(
      createItem(
        source,
        'sign-out',
        account
          ? 'main.dataSource.signOutOfAccount'
          : 'main.dataSource.signOutOf',
        account ? { name: sourceLabel, account } : { name: sourceLabel }
      )
    )
  }

  return items
}

/**
 * Whether the Open UI should collapse to a single "Open" action
 * (only the built-in local source, no auth).
 *
 * @param sources - Registered sources
 */
export function acapIsSingleLocalOpen(sources: AcApDataSource[]): boolean {
  return (
    sources.length === 1 &&
    sources[0]?.id === ACAP_LOCAL_DATA_SOURCE_ID &&
    !sources[0].requiresAuth
  )
}

function createItem(
  source: AcApDataSource,
  action: AcApDataSourceMenuAction,
  labelKey: string,
  labelParams?: Record<string, string>,
  labelOverride?: string
): AcApDataSourceMenuItem {
  return {
    id: `${source.id}:${action}`,
    sourceId: source.id,
    action,
    labelKey,
    labelParams,
    label:
      labelOverride ??
      applyTemplateParams(AcApI18n.t(labelKey), labelParams)
  }
}
