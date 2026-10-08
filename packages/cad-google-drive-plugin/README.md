# @mlightcad/cad-google-drive-plugin

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Google Drive **data source** plugin for [`@mlightcad/cad-simple-viewer`](../cad-simple-viewer). Registers an `AcApDataSource` so Open menus in `cad-viewer` and `cad-simple-ui-plugin` can open `.dwg` / `.dxf` files from Google Drive.

## Why two clicks (Sign in, then Open)?

Browsers only allow OAuth popups in a direct user-gesture tick. Google Identity Services `requestAccessToken` opens a popup. If you chain sign-in into pick in the same handler after an `await`, the GIS popup can be blocked.

This plugin therefore exposes:

1. **Sign in to Google Drive** — GIS token client only
2. **Open from Google Drive** — Google Picker overlay, then Drive media download

Never chain sign-in into pick in the same click handler.

## Installation

```bash
pnpm add @mlightcad/cad-google-drive-plugin
```

Peer dependencies: `@mlightcad/cad-simple-viewer`, `@mlightcad/data-model`.

Google APIs (`gapi`, GIS, Picker) are loaded from Google CDNs at runtime — no extra npm SDK.

## Google Cloud setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **Google Drive API** and **Google Picker API**.
3. Create an OAuth **Web application** client. Add Authorized JavaScript origins for your app (e.g. `http://localhost:5173`).
4. Create an API key; restrict it to Drive + Picker and your domains.
5. Note the **numeric project number** (Project number on the project dashboard) — required as `appId` for Picker.
6. While the OAuth app is in Testing, add OAuth **test users**.

Scopes used: `drive.file`, `userinfo.email`, `userinfo.profile` (`drive.file` only covers files opened via Picker / Drive “Open with”).

## Registration

```typescript
import { AcApDocManager } from '@mlightcad/cad-simple-viewer'
import { registerGoogleDrivePlugin } from '@mlightcad/cad-google-drive-plugin/register'

await registerGoogleDrivePlugin(AcApDocManager.instance.pluginManager, {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
  appId: import.meta.env.VITE_GOOGLE_APP_ID // numeric project number
})
```

The plugin loads **eagerly** so Open menus list Google Drive immediately.
`restoreSession` preloads GIS / gapi / Picker in the background so Sign in can
open the token popup from a user gesture; scripts also load on demand if the
user signs in before preload finishes.

## UI

After registration, File → Open (cad-viewer) and the Open toolbar item (cad-simple-ui-plugin) rebuild from `dataSourceManager`:

| Auth state | Menu items |
|------------|------------|
| Signed out | Sign in to Google Drive |
| Signed in | Open from Google Drive, Sign out of Google Drive |

## Build

```bash
pnpm --filter @mlightcad/cad-google-drive-plugin build
```
