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

## Integration with the Existing Data Model

The proprietary parser is delivered as a **registerable converter** that plugs into the same pipeline as the open-source stack.

- Output conforms to the MIT-licensed **`@mlightcad/data-model`**: `AcDbDatabase`, `AcDb*` entities, layer tables, blocks, and related structures.
- You register it via **`AcDbDatabaseConverterManager`**, the same mechanism used by `AcDbLibreDwgConverter` today.
- After parsing, your existing **MIT rendering, layer, selection, and interaction pipeline** (`cad-simple-viewer`, `cad-viewer`, plugins, etc.) works unchanged.

Typical integration (conceptual):

```typescript
import { AcDbDatabaseConverterManager, AcDbFileType } from '@mlightcad/data-model'
// Import the proprietary converter from the licensed package
import { AcDbProprietaryConverter } from '@mlightcad/proprietary-converter' // package name provided on purchase

const converter = new AcDbProprietaryConverter({ /* options */ })
AcDbDatabaseConverterManager.instance.register(AcDbFileType.DWG, converter)
```

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

---

## Related Documentation

- [cad-viewer README](./README.md) — project overview, open-source stack, and known limitations of the default parsers
- [API Docs](https://mlightcad.github.io/cad-viewer/docs/) — `@mlightcad/data-model` and viewer APIs
