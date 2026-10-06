# @mlightcad/cad-onedrive-plugin

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

OneDrive **data source** plugin for [`@mlightcad/cad-simple-viewer`](../cad-simple-viewer). Registers an `AcApDataSource` so Open menus in `cad-viewer` and `cad-simple-ui-plugin` can open `.dwg` / `.dxf` files from Microsoft OneDrive / SharePoint.

## Why two clicks (Sign in, then Open)?

Browsers only allow `window.open` in a direct user-gesture tick. Microsoft’s File Picker v8 must run in a popup. If you `await` MSAL login and then open the picker, the second popup is blocked.

This plugin therefore exposes:

1. **Sign in to OneDrive** — MSAL `loginPopup` only
2. **Open from OneDrive** — opens the blank picker window **synchronously** on click, then posts into File Picker v8

Never chain sign-in into pick in the same click handler.

## Installation

```bash
pnpm add @mlightcad/cad-onedrive-plugin @azure/msal-browser
```

Peer dependencies: `@mlightcad/cad-simple-viewer`, `@mlightcad/data-model`.

## Azure app setup

1. Register a **Single-page application** in Microsoft Entra ID.
2. Add a redirect URI matching your app origin (e.g. `http://localhost:5173/`).
3. Grant delegated Graph permissions: `User.Read`, `Files.Read.All`.
4. For personal OneDrive picker tokens, consent also covers `OneDrive.ReadOnly`.

## Registration

```typescript
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { registerOneDrivePlugin } from '@mlightcad/cad-onedrive-plugin/register'

await registerOneDrivePlugin(AcApDocManager.instance.pluginManager, {
  clientId: import.meta.env.VITE_MSAL_CLIENT_ID,
  tenantId: import.meta.env.VITE_MSAL_TENANT_ID || 'common',
  redirectUri: import.meta.env.VITE_MSAL_REDIRECT_URI // optional
})
```

The plugin loads **eagerly** so Open menus list OneDrive immediately. MSAL itself is still imported on demand inside sign-in / pick.

## UI

After registration, File → Open (cad-viewer) and the Open toolbar item (cad-simple-ui-plugin) rebuild from `dataSourceManager`:

| Auth state | Menu items |
|------------|------------|
| Signed out | Sign in to OneDrive |
| Signed in | Open from OneDrive, Sign out of OneDrive |

## Build

```bash
pnpm --filter @mlightcad/cad-onedrive-plugin build
```
