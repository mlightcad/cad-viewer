# Proprietary DWG Parser — Commercial License

[简体中文](./PROPRIETARY-PARSER.zh-CN.md)

This document describes the **proprietary DWG parser** offered as a commercial alternative to the open-source `libredwg-web` / `libredwg-converter` stack shipped with [cad-viewer](https://github.com/mlightcad/cad-viewer).

If you are building a **closed-source commercial product**, a **white-labeled deployment**, or a **SaaS / on-premise CAD viewer** and cannot distribute GPL-3.0 code to your customers, this parser is designed for your use case.

For purchase inquiries, email [mlight.lee@outlook.com](mailto:mlight.lee@outlook.com).

---

## Scope

| Format | Supported |
|--------|-----------|
| **DWG** | Yes |

The proprietary parser covers **DWG**. It is intended as a drop-in replacement for the default open-source DWG converter, with:

- **Lower memory usage** than the LibreDWG-based stack
- **Support for larger DWG files** (not constrained by the WASM heap limits of `libredwg-web`)
- **More accurate parsing** for production drawings

---

## Licensing Terms

### What you receive

- A **pre-built npm package** (compiled/bundled). **Source code is not included.**
- A **perpetual license** to use the package in your products and deployments.

### Permitted use

You may:

- **Embed the package** inside your own closed-source application and **redistribute it as part of your product** (desktop, mobile, or web).
- Deploy in **SaaS** (multi-tenant cloud) and **on-premise** environments, including **white-labeled** deployments to your customers.
- Process an **unlimited** number of users, tenants, projects, or files. **There are no per-seat, per-server, per-tenant, or per-file fees.**

### Restrictions

You may **not**:

- **Redistribute or resell the parser as a standalone DWG parsing library or SDK.** The license is for use inside your own application or service, not for offering a competing parser product. This restriction avoids a direct commercial conflict with the parser itself.

If your use case does not fit the above (for example, you plan to ship a parser SDK to third parties), contact us to discuss terms.

### Pricing

Purchase is handled through a **one-time donation** model:

| Item | Amount (USD) |
|------|----------------|
| **Perpetual license** (one-time donation) | **$3,000** |
| **Upgrade packages — first year** | Included at no extra cost |
| **Upgrade packages — after the first year** | **$1,500 / year** (donation) |

- The **$3,000 donation** grants **perpetual use** of the parser version delivered at purchase time and ongoing use of that version in production.
- For **one year** after purchase, you receive **free upgrade packages** (bug fixes, parser improvements, compatibility updates).
- **After the first year**, a **$1,500 annual donation** is required to receive **new upgrade packages**. You may continue running the version you already have without paying for upgrades; the annual donation applies only if you want updated packages.

There are **no royalties**, **no per-seat fees**, and **no usage caps**.

---

## Trial License

If you want to evaluate the proprietary parser before purchase, you can apply for a **trial license**.

### How to apply

1. Send an email to [mlight.lee@outlook.com](mailto:mlight.lee@outlook.com) with your **company information** and **intended use case**.
2. **Personal / individual applications are not accepted at this time** — trial licenses are available for **companies and organizations** only.
3. Your email **must include a GitHub username**. We use this account to grant read access to the private npm package **`@mlightcad/dwg-converter`**.

### Email template

```
Subject: Trial License Request — [Company Name] — Proprietary DWG Parser

Dear cad-viewer team,

We would like to apply for a trial license for the proprietary DWG parser to evaluate its fit for our product.

Company information:
- Company / organization name: [Your company name]
- Website (optional): [URL]
- Country / region: [Country or region]
- Contact name: [Your name]
- Contact email: [Your work email]
- GitHub username (required): [your-github-username]

Intended use:
- Product / project name: [Brief name]
- Deployment model: [e.g. SaaS, on-premise, desktop, white-label]
- Brief description of use case: [1–3 sentences on how you plan to use the parser]

We understand that trial licenses are currently offered to companies and organizations only, not to individual developers.

Thank you,
[Your name]
[Company name]
```

### After approval

If your application is approved:

1. We will grant the GitHub account listed in your application **read access** to the private npm package **`@mlightcad/dwg-converter`**.
2. You will receive **integration notes** describing how to authenticate npm/pnpm/yarn with GitHub Packages and install the package.
3. Follow those notes to install and register the converter in your project.

For commercial production use after the trial, please refer to the [Licensing Terms](#licensing-terms) above and contact us to purchase a perpetual license.

---

## Installing `@mlightcad/dwg-converter`

The proprietary package **`@mlightcad/dwg-converter`** is published to **GitHub Packages**, while other `@mlightcad/*` packages (for example `@mlightcad/data-model`, `@mlightcad/cad-viewer`) are published to the public **npm registry**. npm and pnpm support **scope-level** registry mapping only — there is **no official package-level** registry mapping within the same scope.

That means you **cannot** rely on a single `.npmrc` line such as:

```ini
@mlightcad:registry=https://npm.pkg.github.com
```

to fetch only `@mlightcad/dwg-converter` from GitHub Packages. Doing so would incorrectly route **all** `@mlightcad/*` packages to GitHub Packages and break installs of the public packages.

**Version note:** `@mlightcad/dwg-converter` is updated regularly. In every example below, replace `1.2.3` (and any tarball hash) with the **exact version you need**. Do not copy version numbers from this document without checking the release that was delivered to you.

### Create a `GITHUB_TOKEN` with `read:packages`

Before installing, create a GitHub personal access token that can read private packages. GitHub Packages currently authenticates with a **personal access token (classic)**; fine-grained tokens are not supported for the npm registry.

**Prerequisites**

- The GitHub account used for the token must already have **read access** to `@mlightcad/dwg-converter` (granted after trial or purchase approval).
- The token must include the **`read:packages`** scope (package read permission).

**Steps**

1. Sign in to GitHub with the account that has package access.
2. Open **Settings → Developer settings → Personal access tokens → Tokens (classic)**  
   (direct link: [https://github.com/settings/tokens](https://github.com/settings/tokens)).
3. Click **Generate new token → Generate new token (classic)**.
4. Give the token a clear name (for example `dwg-converter-install`) and an expiration that fits your security policy.
5. Under **Select scopes**, enable **`read:packages`**. You do not need `write:packages` or `delete:packages` for install-only use.
6. Click **Generate token**, then copy the token immediately (it is shown only once).
7. Expose the token as `GITHUB_TOKEN` in your shell or CI, for example:

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

   This only attaches credentials when requesting `npm.pkg.github.com`. It does **not** remap the `@mlightcad` scope, so public `@mlightcad/*` packages on npmjs.org are unaffected. Do **not** add `@mlightcad:registry=https://npm.pkg.github.com`.

   If you use Option 1 (a private registry proxy), clients typically do **not** need this line — put the token on the proxy instead.

**Security notes**

- Treat the token like a password. Do **not** commit it to git or paste it into public issues.
- Prefer environment variables (or your CI secret store) over hard-coding the token in `.npmrc`.
- In GitHub Actions, you can map a repository secret (for example `GH_PACKAGES_TOKEN`) to `GITHUB_TOKEN` / `NODE_AUTH_TOKEN` for the install job.

After the token is configured, choose **one** of the install approaches below.

### Option 1: Unified private registry that proxies npm and GitHub Packages

If you can operate (or already use) a private npm registry — for example Verdaccio, JFrog Artifactory, Sonatype Nexus, or a cloud vendor npm registry — point all clients at that registry and let it decide where each package comes from:

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

Clients then install normally, for example:

```bash
pnpm add @mlightcad/dwg-converter@1.2.3
```

This is the cleanest long-term setup when you already maintain a private registry. For a small project that only needs one or two GitHub Packages, Option 2 is usually lighter.

### Option 2: Pin `@mlightcad/dwg-converter` to a GitHub Packages tarball URL

If you only need a small number of GitHub Packages dependencies, pin `@mlightcad/dwg-converter` to its **tarball URL** in `package.json`. Package managers then download that URL directly instead of resolving the package through the `@mlightcad` scope registry.

1. Authenticate to GitHub Packages (still required — a tarball URL does **not** bypass auth):

   ```ini
   # .npmrc
   registry=https://registry.npmjs.org/
   //npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
   ```

2. Resolve the tarball URL for the version you need:

   ```bash
   npm view @mlightcad/dwg-converter@1.2.3 \
     --registry=https://npm.pkg.github.com \
     dist.tarball
   ```

   Example output:

   ```text
   https://npm.pkg.github.com/download/@mlightcad/dwg-converter/1.2.3/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

   You can also inspect the full metadata with `npm view @mlightcad/dwg-converter@1.2.3 --registry=https://npm.pkg.github.com` and read `dist.tarball`.

3. Put that URL into `package.json` (again, use **your** version and tarball URL):

   ```json
   {
     "dependencies": {
       "@mlightcad/data-model": "^1.0.0",
       "@mlightcad/dwg-converter": "https://npm.pkg.github.com/download/@mlightcad/dwg-converter/1.2.3/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
     }
   }
   ```

4. Install as usual:

   ```bash
   pnpm install
   ```

**Caveats for Option 2:**

- Upgrades require fetching a new tarball URL and updating `package.json` / the lockfile — more friction than a normal semver range.
- CI and local installs still need a valid GitHub token with read access to the package (`//npm.pkg.github.com/:_authToken=...`).
- Authentication behavior for URL dependencies can differ slightly from normal registry dependencies; keep the GitHub Packages auth entry in `.npmrc`.

Option 2 works well for evaluation and small teams. Prefer Option 1 (or a separate private scope such as `@mlightcad-private/*` mapped to GitHub Packages) if you expect frequent upgrades or many private packages.

---

## Integration with the Existing Data Model

The proprietary parser is delivered as a **registerable converter** that plugs into the same pipeline as the open-source stack.

- Output conforms to the MIT-licensed **`@mlightcad/data-model`**: `AcDbDatabase`, `AcDb*` entities, layer tables, blocks, and related structures.
- You register it via **`AcDbDatabaseConverterManager`**, the same mechanism used by `AcDbLibreDwgConverter` today.
- After parsing, your existing **MIT rendering, layer, selection, and interaction pipeline** (`cad-simple-viewer`, `cad-viewer`, plugins, etc.) works unchanged.

Typical integration (conceptual):

```typescript
import { AcDbDatabaseConverterManager, AcDbFileType } from '@mlightcad/data-model'
import { AcDbDwgConverter } from '@mlightcad/dwg-converter'

const converter = new AcDbDwgConverter({ /* options */ })
AcDbDatabaseConverterManager.instance.register(AcDbFileType.DWG, converter)
```

For a complete working sample (authentication, worker assets, registration, and database browsing), see [realdwg-web-example](https://github.com/mlightcad/realdwg-web-example).

Do **not** register the GPL-based `libredwg-converter` if you rely on the proprietary parser for compliance.

---

## GPL Compliance

The default cad-viewer DWG loading path uses GPL-3.0 packages:

| Package | License | Role |
|---------|---------|------|
| `libredwg-web` / `@mlightcad/libredwg-converter` | GPL-3.0 | DWG parsing |

DXF loading uses the built-in MIT parser in `@mlightcad/data-model` and does not require the proprietary parser.

If you **replace the LibreDWG converter** with the proprietary parser and **remove those GPL dependencies** from your build, your application can rely on the **MIT-licensed** cad-viewer stack only (`data-model`, `cad-simple-viewer`, renderers, plugins, etc.).

**You can fully remove GPL packages from your dependency graph** — including LibreDWG-related packages — so that **no GPL code is distributed** to your customers, provided you use the proprietary parser for all DWG ingestion.

---

## Support and Maintenance

cad-viewer is currently maintained as a **personal open-source project** (not operated by a company). The author works on it **full-time**.

| Area | Included |
|------|----------|
| **Bug fixes** | Yes — reported issues are addressed as quickly as possible |
| **Parser updates / upgrade packages** | First year included; thereafter with annual donation |
| **New DWG version compatibility** | Delivered via upgrade packages |
| **Technical integration support** | Reasonable email support for integrating the converter |
| **Response time** | Typically **within one business day** for reported bugs |

There is no formal SLA or 24/7 on-call service. For enterprise support requirements, contact us to discuss options.

---

## Frequently Asked Questions

### Can we use this in a white-labeled product?

**Yes.** You may embed the parser in a closed-source, white-labeled commercial application and deploy it to your customers (SaaS or on-premise).

### Do we need to open-source our application?

**No.** The proprietary parser license allows use inside closed-source products. Only the open-source cad-viewer components you choose to use remain under their respective licenses (MIT for the core stack).

### Can we ship the parser inside a desktop installer?

**Yes**, as part of your application bundle, subject to the restriction that you do not resell the parser itself as a standalone parsing product.

### What happens if we stop paying the annual donation?

You **keep perpetual rights** to the version(s) you already received. You simply will not receive **new** upgrade packages until the annual donation is renewed.

### How do we purchase?

Email [mlight.lee@outlook.com](mailto:mlight.lee@outlook.com) with a brief description of your product and deployment model. We will arrange the donation and deliver the npm package and integration notes.

### How do we apply for a trial license?

See the [Trial License](#trial-license) section above. Send an application email with your company details, intended use, and a **GitHub username**. If approved, that account will be granted read access to **`@mlightcad/dwg-converter`**, along with integration notes for installing the package.

### Does the proprietary parser support 3D entities in DWG?

**Partially.** The parser can extract **3DSOLID** entities from DWG files and decode a portion of the embedded **ACIS SAB** payload. Full B-rep tessellation is not yet available; when SAB/SAT data is present, the data model exposes a best-effort wireframe (or a bounding-box fallback).

For details, see:

- [`AcDb3dSolid` API documentation](https://mlightcad.github.io/realdwg-web/classes/_mlightcad_data-model.AcDb3dSolid.html)
- ACIS-related source under [`packages/data-model/src/acis`](https://github.com/mlightcad/realdwg-web/tree/main/packages/data-model/src/acis) in the [realdwg-web](https://github.com/mlightcad/realdwg-web) repository

### Can we evaluate the proprietary parser without a trial license?

**Yes.** You can explore the proprietary DWG parser’s capabilities through the public demo project [realdwg-web-example](https://github.com/mlightcad/realdwg-web-example), which demonstrates installation, worker asset deployment, converter registration, and browsing the resulting database after parse.

For longer evaluation or production pilots, apply for a formal [trial license](#trial-license).

### How do we use the proprietary DWG parser?

The proprietary parser does **not** expose a standalone “parse DWG” API. Like the open-source [`libredwg-converter`](https://github.com/mlightcad/realdwg-web/tree/main/packages/libredwg-converter), it implements the **`AcDbDatabaseConverter`** interface and registers with **`AcDbDatabaseConverterManager`**. After conversion, you work with the resulting drawing through the MIT-licensed **`@mlightcad/data-model`** (`AcDbDatabase`, entities, symbol tables, and so on)—the same integration path described in [Integration with the Existing Data Model](#integration-with-the-existing-data-model).

---

## Related Documentation

- [cad-viewer README](./README.md) — project overview, open-source stack, and known limitations of the default parsers
- [API Docs](https://cad-viewer.readthedocs.io/en/latest/) — `@mlightcad/data-model` and viewer APIs
