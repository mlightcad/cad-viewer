---
title: "Install and Use Proprietary DWG Converter"
---

# Install and Use Proprietary DWG Converter

This guide explains how to **install** and **register** the proprietary DWG parser package **`@mlightcad/dwg-converter`** with the cad-viewer data model.

For licensing, trial access, pricing, and GPL compliance, see [PROPRIETARY-PARSER.md](https://github.com/mlightcad/cad-viewer/blob/main/PROPRIETARY-PARSER.md) in the main repository.

> **Prerequisite:** Your GitHub account must already have **read access** to the private package (granted after trial or purchase approval).

## Overview

- `@mlightcad/dwg-converter` is published to **GitHub Packages**.
- Other `@mlightcad/*` packages (for example `@mlightcad/data-model`, `@mlightcad/cad-viewer`) are published to the public **npm registry**.
- npm and pnpm support **scope-level** registry mapping only — there is **no official package-level** registry mapping within the same scope.

That means you **cannot** use:

```ini
@mlightcad:registry=https://npm.pkg.github.com
```

to fetch only `@mlightcad/dwg-converter`. Doing so would route **all** `@mlightcad/*` packages to GitHub Packages and break installs of the public packages.

**Version note:** Replace `1.2.3` (and any tarball hash) in the examples below with the **exact version delivered to you**.

## Create a `GITHUB_TOKEN` with `read:packages`

GitHub Packages currently authenticates with a **personal access token (classic)**; fine-grained tokens are not supported for the npm registry.

1. Sign in to GitHub with the account that has package access.
2. Open **Settings → Developer settings → Personal access tokens → Tokens (classic)**  
   (direct link: [https://github.com/settings/tokens](https://github.com/settings/tokens)).
3. Click **Generate new token → Generate new token (classic)**.
4. Name the token (for example `dwg-converter-install`) and set an expiration that fits your security policy.
5. Under **Select scopes**, enable **`read:packages`**. You do not need `write:packages` or `delete:packages` for install-only use.
6. Click **Generate token**, then copy it immediately (shown only once).
7. Expose it as `GITHUB_TOKEN`:

   ```bash
   # macOS / Linux
   export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

   # Windows PowerShell
   $env:GITHUB_TOKEN = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

   # Windows CMD
   set GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

8. When the **client** talks to GitHub Packages directly (Option 2 below), add a **host-level** auth entry in `.npmrc`:

   ```ini
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```

   This attaches credentials only for `npm.pkg.github.com`. It does **not** remap the `@mlightcad` scope. Do **not** add `@mlightcad:registry=https://npm.pkg.github.com`.

   `pnpm install` reads this file. `npm view` does not, when you run it from a workspace package: since npm 8.5 the CLI ignores that package's `.npmrc` (`ignoring workspace config`) and the request is sent with no token (`401 Unauthorized - authentication token not provided`), even if `GITHUB_TOKEN` is set. Pass the token on the `npm view` command itself — see Option 2.

   In a monorepo, put this file in the **workspace root**. An `.npmrc` that lives only inside a member package is the file npm skips.

   If you use Option 1 (a private registry proxy), clients typically do **not** need this line — put the token on the proxy instead.

**Security notes**

- Treat the token like a password. Do **not** commit it to git or paste it into public issues.
- Prefer environment variables (or your CI secret store) over hard-coding the token in `.npmrc`.
- In GitHub Actions, map a repository secret (for example `GH_PACKAGES_TOKEN`) to `GITHUB_TOKEN` / `NODE_AUTH_TOKEN` for the install job.

## Install options

Choose **one** of the approaches below.

### Option 1: Unified private registry that proxies npm and GitHub Packages

If you operate (or already use) a private npm registry — Verdaccio, JFrog Artifactory, Sonatype Nexus, or a cloud vendor npm registry — point clients at that registry and let it decide the upstream per package:

```text
                ┌── npmjs.org          (@mlightcad/data-model, …)
client ──→ private registry
                └── GitHub Packages    (@mlightcad/dwg-converter)
```

Client `.npmrc`:

```ini
registry=https://npm.example.com/
```

Configure the private registry so that:

| Package | Upstream |
|---------|----------|
| `@mlightcad/foo` (public packages) | `https://registry.npmjs.org` |
| `@mlightcad/dwg-converter` | `https://npm.pkg.github.com` |

Then install normally:

```bash
pnpm add @mlightcad/dwg-converter@1.2.3
```

This is the cleanest long-term setup when you already maintain a private registry. For a small project that only needs one or two GitHub Packages, Option 2 is usually lighter.

### Option 2: Pin `@mlightcad/dwg-converter` to a GitHub Packages tarball URL

Pin the package to its **tarball URL** in `package.json` so the package manager downloads that URL directly instead of resolving through the `@mlightcad` scope registry.

1. Authenticate to GitHub Packages (a tarball URL does **not** bypass auth):

   ```ini
   # .npmrc
   registry=https://registry.npmjs.org/
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```

2. Resolve the tarball URL for the version you need.

   Do not rely on the project `.npmrc` for this command. `npm view` ignores a workspace package's `.npmrc`, so `${GITHUB_TOKEN}` in that file is never applied. Pass the token on the command line:

   ```bash
   # macOS / Linux
   npm view @mlightcad/dwg-converter@1.2.3 dist.tarball \
     --registry=https://npm.pkg.github.com \
     --//npm.pkg.github.com/:_authToken="${GITHUB_TOKEN}"
   ```

   ```powershell
   # Windows PowerShell
   npm view @mlightcad/dwg-converter@1.2.3 dist.tarball `
     --registry=https://npm.pkg.github.com `
     --//npm.pkg.github.com/:_authToken="$env:GITHUB_TOKEN"
   ```

   ```bat
   REM Windows CMD
   npm view @mlightcad/dwg-converter@1.2.3 dist.tarball --registry=https://npm.pkg.github.com --//npm.pkg.github.com/:_authToken=%GITHUB_TOKEN%
   ```

   The `.npmrc` entry from step 1 is still required: `pnpm install` uses it when it downloads the tarball.

   Example output:

   ```text
   https://npm.pkg.github.com/download/@mlightcad/dwg-converter/1.2.3/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. Put that URL into `package.json` (use **your** version and tarball URL):

   ```json
   {
     "dependencies": {
       "@mlightcad/data-model": "^1.0.0",
       "@mlightcad/dwg-converter": "https://npm.pkg.github.com/download/@mlightcad/dwg-converter/1.2.3/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
     }
   }
   ```

4. Install:

   ```bash
   pnpm install
   ```

**Caveats**

- Upgrades require fetching a new tarball URL and updating `package.json` / the lockfile.
- CI and local installs still need a valid GitHub token with read access.
- Keep the GitHub Packages auth entry in `.npmrc`.

Option 2 works well for evaluation and small teams. Prefer Option 1 (or a separate private scope such as `@mlightcad-private/*` mapped to GitHub Packages) if you expect frequent upgrades or many private packages.

## Register the converter

The proprietary parser is a **registerable converter** that plugs into the same pipeline as the open-source stack.

- Output conforms to the MIT-licensed **`@mlightcad/data-model`**: `AcDbDatabase`, `AcDb*` entities, layer tables, blocks, and related structures.
- Register it via **`AcDbDatabaseConverterManager`**, the same mechanism used by `AcDbLibreDwgConverter`.
- After parsing, the existing MIT rendering, layer, selection, and interaction pipeline (`cad-simple-viewer`, `cad-viewer`, plugins, etc.) works unchanged.

```typescript
import { AcDbDatabaseConverterManager, AcDbFileType } from '@mlightcad/data-model'
import { AcDbDwgConverter } from '@mlightcad/dwg-converter'

const converter = new AcDbDwgConverter({ /* options */ })
AcDbDatabaseConverterManager.instance.register(AcDbFileType.DWG, converter)
```

The package does **not** expose a standalone “parse DWG” API. Like the open-source [`libredwg-converter`](https://github.com/mlightcad/realdwg-web/tree/main/packages/libredwg-converter), it implements **`AcDbDatabaseConverter`**. After conversion, work with the resulting drawing through `@mlightcad/data-model`.

Do **not** also register the GPL-based `libredwg-converter` if you rely on the proprietary parser for compliance.

For a complete working sample (authentication, worker assets, registration, and database browsing), see [realdwg-web-example](https://github.com/mlightcad/realdwg-web-example).

## Related pages

- [Configure Worker URLs](./configure-worker-urls) — worker URL setup for DWG/DXF parsers
- [PROPRIETARY-PARSER.md](https://github.com/mlightcad/cad-viewer/blob/main/PROPRIETARY-PARSER.md) — commercial license, trial, and GPL notes
- [Development Guide](./) — index of developer topics


