/**
 * Auth state for a data source that may require sign-in (OneDrive, Google Drive, …).
 *
 * - `'none'` — no authentication (local file, public URL)
 * - `'signed-out'` — requires auth and the user is not signed in
 * - `'signed-in'` — requires auth and the user is signed in
 */
export type AcApDataSourceAuthState = 'none' | 'signed-out' | 'signed-in'

/**
 * Signed-in account details for cloud data-source UI (avatar + name).
 */
export interface AcApDataSourceAccountProfile {
  /** Display name shown next to the avatar. */
  displayName: string
  /** Optional email / UPN under the display name. */
  email?: string
  /** Optional avatar image URL (object URL or https). */
  avatarUrl?: string
}

/**
 * A drawing file obtained from a data source, ready to open in the viewer.
 *
 * Prefer {@link content} for bytes already in memory. Prefer {@link url} when the
 * source should open via {@link AcApDocManager.openUrl} (HTTP fetch with progress).
 */
export interface AcApDataSourceFile {
  /** File name including extension (e.g. `drawing.dwg`). */
  name: string
  /** Raw file bytes. Used when {@link url} is omitted. */
  content?: ArrayBuffer
  /** Remote URL opened via `openUrl` when present. */
  url?: string
}

/**
 * Pluggable origin for CAD drawings (local disk, URL, OneDrive, Google Drive, …).
 *
 * ## Host UI contract
 *
 * Hosts (ribbon Open menu, {@link AcUiFileOpenPanel}, toolbars) must only:
 * 1. List sources via {@link AcApDataSourceManager}
 * 2. Build labels with {@link acapBuildDataSourceMenu}
 * 3. Run clicks with {@link acapRunDataSourceMenuAction} /
 *    {@link acapInvokeDataSourceMenuAction}
 *
 * They must **not** open vendor File Pickers, download URLs, or show
 * provider-specific login chrome. All of that belongs inside the source:
 *
 * - {@link signIn} / {@link signOut} — auth popups / redirects
 * - {@link pick} — open File Picker (use {@link acapOpenCenteredPopup}), download
 *   bytes (use {@link acapWithDataSourceBusy}), return {@link AcApDataSourceFile}
 * - {@link getAuthState} / {@link getAccountProfile} — drive adaptive menus
 * - {@link restoreSession} — restore cached sessions after {@link AcApDataSourceManager.register}
 *
 * Cloud sources that open a popup File Picker must set {@link requiresUserGesture}
 * and must **not** call {@link pick} in the same click handler as {@link signIn}
 * (browsers block the second popup after an `await`).
 */
export interface AcApDataSource {
  /** Stable id used in menus and registry lookups (`local`, `url`, `onedrive`, …). */
  id: string
  /** i18n key for the source display name (e.g. `main.dataSource.local`). */
  labelKey: string
  /** Optional icon (inline SVG string or URL). */
  icon?: string
  /** Whether this source needs user authentication. */
  requiresAuth: boolean
  /**
   * When true, {@link pick} must run in a direct user-gesture tick
   * (e.g. `window.open` for a cloud File Picker).
   */
  requiresUserGesture: boolean
  /** Current authentication state. */
  getAuthState(): AcApDataSourceAuthState
  /** Optional signed-in account label for menus (email / display name). */
  getAccountLabel?(): string | undefined
  /**
   * Signed-in profile for landing / account chrome (avatar + name).
   * Auth sources should implement this so hosts need no provider-specific UI.
   */
  getAccountProfile?(): AcApDataSourceAccountProfile | undefined
  /**
   * Restore a cached session after registration (MSAL accounts, tokens, …).
   * Implementations must notify their {@link AcApDataSourceManager} via
   * `notifyAuthChanged` when finished so Open menus refresh.
   */
  restoreSession?(): Promise<void>
  /** Interactive sign-in. No-op when {@link requiresAuth} is false. */
  signIn(): Promise<void>
  /** Sign out. No-op when {@link requiresAuth} is false. */
  signOut(): Promise<void>
  /**
   * Opens the source-specific File Picker / dialog, downloads if needed, and
   * returns the chosen drawing — or `null` when the user cancels.
   */
  pick(): Promise<AcApDataSourceFile | null>
}
