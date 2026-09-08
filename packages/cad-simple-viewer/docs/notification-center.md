# Notification Center

`@mlightcad/cad-simple-viewer` writes user-visible alerts — **missing fonts**, **unsupported entities** (including Tianzheng heuristics), **open failures**, and similar — into a **Notification Center** when a drawing opens. A lightweight DOM bell UI is installed by default. Hosts (for example `@mlightcad/cad-viewer`, or your own shell) can implement the same interface and **replace** that UI while still reusing the engine-side event bridge and message formatters.

This guide covers architecture, visibility, default behavior, how to override the center, and the contract custom centers must honor.

---

## 1. Architecture

```
Engine events (font-not-found / open-file-progress / message / …)
        │
        ▼
AcApNotificationEventBridge   ← formats title/body, writes into the current Center
        │
        ▼
AcApNotificationCenter        ← replaceable: default Store, or a host implementation
        │
        ├─ Default: AcUiDefaultNotificationUi (bell on the canvas)
        └─ Override: your UI (Vue / React / custom DOM …)
```

Key points:

- **The bridge only writes to the Center; it does not draw UI.** Swapping UI does not require re-subscribing to `eventBus`.
- **The Center is a singleton slot.** Switch it with `acapSetNotificationCenter`; pass `null` to restore the built-in implementation.
- **Notifications are per document session (MDI).** Each entry is tagged with `sessionId` (`AcApDocSession.id`). `notifications` / `unreadCount` reflect the **active** session only.
- **Default chrome is canvas-relative**, not viewport-relative. The bell mounts on the view container (`curView.container`) unless you pass another `host`.
- **Default DOM UI is `AcUi*`** (`src/ui/AcUiDefaultNotificationUi.ts`); the store / bridge / service stay `AcAp*` under `src/app/notification`.
- **Copy uses `AcApI18n`.** If the host has its own i18n, keep `AcApI18n.setCurrentLocale` in sync, or localize inside your custom Center.

---

## 2. Show / hide behavior

There is **no** public imperative API such as `show()` / `hide()` on the notification service. Visibility is controlled in three layers:

### 2.1 Install-time (enable or disable the system)

| `notificationCenter` option | Effect |
|---|---|
| omitted / `true` | Event bridge **on** + default bell UI **on** |
| `{ showDefaultUi: false }` | Bridge **on**, default UI **off** (host supplies UI via `acapSetNotificationCenter`) |
| `{ showDefaultUi: true, host }` | Bridge + default UI mounted on `host` (default host: canvas container) |
| `false` | Bridge **off**, UI **off** — host owns all `eventBus` subscriptions |

```ts
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

// Fully disable the built-in notification system
AcApDocManager.createInstance({
  container: document.getElementById('viewer')!,
  notificationCenter: false
})

// Keep the bridge; hide the built-in bell (typical for cad-viewer)
AcApDocManager.createInstance({
  container: document.getElementById('viewer')!,
  notificationCenter: { showDefaultUi: false }
})
```

Replacing or restoring the Center at runtime also shows/hides the default UI:

```ts
import { acapSetNotificationCenter } from '@mlightcad/cad-simple-viewer'

acapSetNotificationCenter(myCenter) // default DOM UI is disposed
acapSetNotificationCenter(null)     // restore built-in store + default UI (if enabled)
```

### 2.2 Default DOM UI (automatic)

`AcUiDefaultNotificationUi` ties chrome visibility to the **active session’s** notification list:

| State | Bell | Panel | Backdrop (phone) |
|---|---|---|---|
| `notifications.length === 0` | Hidden | Hidden | Hidden |
| Has messages, panel closed | Visible (badge) | Hidden | Hidden |
| Has messages, user tapped bell | Visible | Visible | Visible on phone |

Interaction rules:

- **Open panel:** tap the bell.
- **Close panel:** tap the bell again, tap outside the chrome, tap the phone backdrop, or clear/remove until the list is empty (panel closes automatically).
- The panel does **not** open by itself when a new message arrives; only the badge updates.

There is no separate “force show empty panel” mode in the built-in UI.

### 2.3 Data-driven hide (any Center)

Mutations that empty the active list hide the default UI:

- `clear()` — active session only
- `remove(id)` / `removeWhere` / `removeBySource`
- `clearSession(sessionId)` — when closing a document (bridge calls this on `documentToBeDestroyed`)
- Switching sessions via `setActiveSession` — UI follows the **new** active list (may appear empty even if another tab still has messages)

Custom Centers should drive their own show/hide from `subscribe` / reactive `notifications` (for example hide a status-bar badge when `unreadCount === 0`).

---

## 3. Default behavior (no override)

`AcApDocManager.createInstance()` by default:

1. Installs `AcApNotificationEventBridge` (fonts, parse warnings, generic `message`, etc.);
2. Mounts the built-in DOM notification bell on the **canvas container** (`curView.container`).

### Theme and layout

- Styles use `--ml-ui-*` via `acedApplyUiTheme` / `resolveUiTheme` (same tokens as the shortcut toolbar and command line).
- **Desktop (non-handheld):** bell at the **canvas** bottom-right; panel opens above the bell.
- **Phone / Pad / handheld:** bell is placed **below** the measured shortcut toolbar (so it does not cover undo/redo/erase). On phone the panel is a top sheet + dimmed backdrop, both clipped to the canvas host.
- The bell is **not** merged into the shortcut toolbar: notifications are system alerts, not drawing shortcuts; toggling visibility would shift toolbar buttons, and the toolbar can be hidden in settings.

### Options

```ts
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'

AcApDocManager.createInstance({
  container: document.getElementById('viewer')!,
  notificationCenter: {
    // Mount node for the bell; defaults to curView.container (canvas host)
    host: document.getElementById('viewer')!,
    // true (default): show built-in bell; false: bridge only, host supplies UI
    showDefaultUi: true
  }
})
```

`cad-viewer` uses `showDefaultUi: false` and registers a Vue notification center.

---

## 4. Override: implement and register your Center

### 4.1 Interface

Your object must implement `AcApNotificationCenter` (core methods):

```ts
import type {
  AcApNotification,
  AcApNotificationCenter,
  AcApNotificationInput,
  AcApNotificationSource
} from '@mlightcad/cad-simple-viewer'

class MyNotificationCenter implements AcApNotificationCenter {
  private buckets = new Map<string, AcApNotification[]>()
  private activeSessionId: string | null = null
  private nextId = 1
  private listeners = new Set<() => void>()

  private activeList() {
    if (this.activeSessionId == null) return []
    return this.buckets.get(this.activeSessionId) ?? []
  }

  get notifications() {
    return this.activeList()
  }

  get unreadCount() {
    return this.activeList().length
  }

  setActiveSession(sessionId: string | null) {
    this.activeSessionId = sessionId
    this.emit()
  }

  clearSession(sessionId: string) {
    this.buckets.delete(sessionId)
    this.emit()
  }

  add(notification: AcApNotificationInput): string {
    const sessionId = notification.sessionId ?? this.activeSessionId
    if (sessionId == null) return ''

    const entry: AcApNotification = {
      ...notification,
      sessionId,
      id: `n-${this.nextId++}`,
      timestamp: new Date()
    }
    const list = this.buckets.get(sessionId) ?? []
    this.buckets.set(sessionId, [entry, ...list])
    this.emit()
    // Update your UI / toast here
    return entry.id
  }

  info(title: string, message?: string, options?: Partial<AcApNotification>) {
    return this.add({ type: 'info', title, message, ...options })
  }

  warning(title: string, message?: string, options?: Partial<AcApNotification>) {
    return this.add({ type: 'warning', title, message, ...options })
  }

  error(title: string, message?: string, options?: Partial<AcApNotification>) {
    return this.add({
      type: 'error',
      title,
      message,
      persistent: true,
      ...options
    })
  }

  success(title: string, message?: string, options?: Partial<AcApNotification>) {
    return this.add({ type: 'success', title, message, ...options })
  }

  remove(id: string) {
    for (const [sessionId, list] of this.buckets) {
      const next = list.filter(n => n.id !== id)
      if (next.length === list.length) continue
      if (next.length === 0) this.buckets.delete(sessionId)
      else this.buckets.set(sessionId, next)
      this.emit()
      return
    }
  }

  clear() {
    if (this.activeSessionId == null) return
    this.buckets.delete(this.activeSessionId)
    this.emit()
  }

  removeWhere(predicate: (n: AcApNotification) => boolean) {
    if (this.activeSessionId == null) return
    const list = this.activeList()
    const next = list.filter(n => !predicate(n))
    if (next.length === list.length) return
    if (next.length === 0) this.buckets.delete(this.activeSessionId)
    else this.buckets.set(this.activeSessionId, next)
    this.emit()
  }

  removeBySource(source: AcApNotificationSource) {
    this.removeWhere(n => n.source === source)
  }

  removeResolvedFontMissedNotifications(missedFontNames: Iterable<string>) {
    const missed = new Set(missedFontNames)
    this.removeWhere(n => {
      if (n.source !== 'font-missed') return false
      if (missed.size === 0) return true
      if (!n.fontNames?.length) return false
      return !n.fontNames.some(name => missed.has(name))
    })
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  dispose() {
    this.listeners.clear()
    this.buckets.clear()
    this.activeSessionId = null
  }

  private emit() {
    for (const listener of this.listeners) listener()
  }
}
```

Implement `subscribe` / `dispose` when possible so UI can observe list changes and resources are released when the Center is swapped.

`setActiveSession` / `clearSession` are **required**: the event bridge calls them on document activate / close so MDI tabs keep separate notification lists.

### 4.2 When to register

Register immediately **after** `createInstance` so the default bell never flashes:

```ts
import {
  AcApDocManager,
  acapSetNotificationCenter
} from '@mlightcad/cad-simple-viewer'

const container = document.getElementById('viewer')!

AcApDocManager.createInstance({
  container,
  notificationCenter: { showDefaultUi: false }
})

acapSetNotificationCenter(new MyNotificationCenter())
```

On host unmount / viewer destroy:

```ts
acapSetNotificationCenter(null) // restore built-in if still needed
await AcApDocManager.instance.destroy()
```

Or just `destroy()` — it tears down the bridge and the current Center.

### 4.3 Reading the current Center

```ts
import { acapNotificationCenter } from '@mlightcad/cad-simple-viewer'

acapNotificationCenter().warning('Custom title', 'A warning pushed by the host')
```

---

## 5. UI framework integration (Vue example)

The `@mlightcad/cad-viewer` pattern:

1. `createInstance({ notificationCenter: { showDefaultUi: false } })`
2. Implement (or adapt) `AcApNotificationCenter` with a reactive Vue store (**per session**)
3. `acapSetNotificationCenter(adapter)`
4. Panel components read the store only — do **not** re-subscribe to `font-not-found` and similar events

Minimal adapter:

```ts
import {
  acapSetNotificationCenter,
  type AcApNotificationCenter
} from '@mlightcad/cad-simple-viewer'
import { useNotificationCenter } from './myVueStore' // your reactive store

export function registerHostNotificationCenter() {
  const vue = useNotificationCenter()

  const adapter: AcApNotificationCenter = {
    get notifications() {
      return vue.notifications.value
    },
    get unreadCount() {
      return vue.unreadCount.value
    },
    add: n => vue.add(n),
    info: (t, m, o) => vue.info(t, m, o),
    warning: (t, m, o) => vue.warning(t, m, o),
    error: (t, m, o) => vue.error(t, m, o),
    success: (t, m, o) => vue.success(t, m, o),
    remove: id => vue.remove(id),
    clear: () => vue.clear(),
    removeWhere: p => vue.removeWhere(p),
    removeBySource: s => vue.removeBySource(s),
    removeResolvedFontMissedNotifications: names =>
      vue.removeResolvedFontMissedNotifications(names),
    setActiveSession: id => vue.setActiveSession(id),
    clearSession: id => vue.clearSession(id)
  }

  acapSetNotificationCenter(adapter)
}
```

Toasts (e.g. Element Plus `ElMessage`) can:

- fire inside `adapter.add`; or
- listen to `eventBus.on('message' | 'failed-to-open-file', …)` **for toast only** — do not also write into the Center, or entries will duplicate.

Position host panels relative to the **canvas / main drawing area** (`position: absolute` on the view host), not `position: fixed` against the browser viewport. Drive panel open/close in the host (cad-viewer uses a status-bar toggle); the shared Center only owns the message list.

---

## 6. `source` and grouping

The bridge stamps some alerts with `source` for grouping and cleanup:

| `source` | Meaning |
|---|---|
| `font-missed` | Font missing / load failure; use `fontNames` + `removeResolvedFontMissedNotifications` |
| `unsupported-entities` | Unknown entities, empty proxies, Tianzheng-class heuristics; cleared per session on re-open |

Use `acapGroupNotifications(notifications)` to collapse same-`source` rows (built-in bell and cad-viewer panel both use this helper).

---

## 7. Which events does the bridge forward?

When the bridge is enabled (`notificationCenter !== false`):

| Source | Center behavior |
|---|---|
| `eventBus` `message` | info / warning / error / success |
| `fonts-not-loaded` / `fonts-not-found` / `font-not-found` | `font-missed` |
| `missed-data-changed` | prune resolved font-missed rows |
| `failed-to-open-file` / `failed-to-get-avaiable-fonts` | error |
| PARSE END `unknownEntityCount` + `documentActivated` analysis | `unsupported-entities` |
| `documentActivated` / `documentCreated` | `setActiveSession(activeSessionId)` |
| `documentToBeDestroyed` | `clearSession(sessionId)` |

Analysis and formatting are also usable without the Center:

```ts
import {
  acapAnalyzeUnsupportedDrawing,
  acapFormatUnsupportedEntitiesMessage
} from '@mlightcad/cad-simple-viewer'

const analysis = acapAnalyzeUnsupportedDrawing(db, unknownEntityCount)
if (analysis.shouldWarn) {
  console.warn(acapFormatUnsupportedEntitiesMessage(analysis))
}
```

---

## 8. FAQ

**Q: Default bell still shows after I override?**  
Set `notificationCenter: { showDefaultUi: false }` on `createInstance`, and call `acapSetNotificationCenter` before the first paint.

**Q: No notification system at all?**  
`notificationCenter: false`. Subscribe to `eventBus` yourself if you still need alerts.

**Q: How do I programmatically hide the built-in bell?**  
Clear the active list (`clear()` / remove items), or disable the default UI with `showDefaultUi: false`. There is no `hide()` method on the service.

**Q: Wrong language?**  
The bridge uses `AcApI18n.t(...)`. Call `AcApI18n.setCurrentLocale('zh' | 'en' | …)` when the locale changes (`cad-viewer`'s `useLocale` already does this).

**Q: Can I keep the default Store and only swap UI?**  
The public API replaces the whole Center. Easiest path: implement Store + UI yourself, or wrap `AcApNotificationStore` and drive your view from `subscribe`.

**Q: How does this relate to the command-line `showMessage`?**  
Command-line history (`AcEdCommand.showMessage`) is a separate channel. Only `notify` / `eventBus.emit('message')` enter the Notification Center.

**Q: Why is the bell not at the screen corner?**  
By design it tracks the **canvas**. If the viewer is not full-window, the bell stays on the drawing area. Pass `notificationCenter.host` only when you intentionally want a different mount node.

**Q: Why don’t Doc A’s font warnings appear while Doc B is active?**  
Notifications are stored per `sessionId`. Activate Doc A again (or read that session’s bucket in a custom Center) to see its list.

---

## 9. API quick reference

| API | Role |
|---|---|
| `acapSetNotificationCenter(center \| null)` | install / restore Center (also shows/hides default UI) |
| `acapNotificationCenter()` | current Center |
| `AcApNotificationStore` | built-in per-session memory store |
| `AcApNotificationCenter.setActiveSession` | switch visible document list |
| `AcApNotificationCenter.clearSession` | drop a closed document’s list |
| `acapGroupNotifications` | group by `source` |
| `AcApDocManagerOptions.notificationCenter` | bridge / default UI / canvas host |

Source: `packages/cad-simple-viewer/src/app/notification/`.
