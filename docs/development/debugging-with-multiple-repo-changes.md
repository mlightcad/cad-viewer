---
title: "Debugging with Multiple Repo Changes"
---

# Debugging with Multiple Repo Changes

The `cad-viewer` repository depends on packages from other MLight repositories, for example:

- Repo **`cad-viewer`**
  - package: `@mlightcad/cad-simple-viewer`
- Repo **`realdwg-web`**
  - packages: `@mlightcad/data-model`, `@mlightcad/libredwg-converter`
- Repo **`mtext-renderer`**
  - packages: `@mlightcad/mtext-renderer`, `@mlightcad/mtext-input-box`, `@mlightcad/mtext-parser`

Example dependency chain:

```
@mlightcad/cad-simple-viewer  --->  @mlightcad/data-model
                                   @mlightcad/libredwg-converter
                                   @mlightcad/mtext-renderer
```

During development, bugs may exist in `realdwg-web` or `mtext-renderer` that must be fixed and tested immediately inside `cad-viewer`.

## Problem with `pnpm link`

Using `pnpm link` across multiple monorepos introduces several issues:

- Complex setup and teardown
- Easy to forget unlink steps
- `node_modules` state becomes hard to reason about
- Breaks CI / reproducibility
- Hard for new developers to follow

To simplify local debugging, we adopt a **local directory dependency** approach with pnpm overrides.

## Solution: Use Local Directory Dependencies with pnpm overrides

Instead of publishing or linking packages, we temporarily change `overrides` in `pnpm-workspace.yaml` to directly reference the local filesystem path of packages in other repos.

Centralized version management lives in `pnpm-workspace.yaml`:

- Published semver ranges (for example `^1.8.3`) are the source of truth for releases
- `pnpm sync:versions` propagates those values into each `packages/*/package.json`
- CI and the release script run `pnpm sync:versions:check` to ensure everything stays aligned

For short-term debugging, replace a semver override with a `file:` path. This approach:

✅ Works naturally with `pnpm`  
✅ Requires no global linking  
✅ Is explicit and easy to revert  
✅ Is suitable for short-term debugging  
✅ Keeps dependency resolution predictable  
✅ Applies to all packages in the monorepo

## Directory Layout (Recommended)

Place the repositories side by side:

```
workspace/
├── cad-viewer/
│   ├── packages/
│   │   └── cad-simple-viewer/
│   ├── package.json
│   └── pnpm-workspace.yaml
│
├── realdwg-web/
│   ├── packages/
│   │   ├── data-model/
│   │   └── libredwg-converter/
│   └── pnpm-workspace.yaml
│
└── mtext-renderer/
    ├── packages/
    │   ├── mtext-renderer/
    │   └── mtext-input-box/
    └── pnpm-workspace.yaml
```

> ⚠️ This layout is **not mandatory**, but relative paths will be easier to manage.

## Step-by-Step Guide

### 1. Add local `file:` overrides in `pnpm-workspace.yaml`

In `cad-viewer/pnpm-workspace.yaml`, temporarily replace the semver entries you want to debug with local paths.

Normal (published) overrides look like this:

```yaml
packages:
  - 'packages/*'

overrides:
  '@mlightcad/data-model': '^1.8.3'
  '@mlightcad/libredwg-converter': '^3.6.3'
  '@mlightcad/mtext-input-box': '^0.2.16'
  '@mlightcad/mtext-renderer': '^0.11.2'
  # ... other shared dependency pins
```

For local debugging, change only the packages you need to test:

```yaml
overrides:
  '@mlightcad/data-model': 'file:../realdwg-web/packages/data-model'
  '@mlightcad/libredwg-converter': 'file:../realdwg-web/packages/libredwg-converter'
  '@mlightcad/mtext-renderer': 'file:../mtext-renderer/packages/mtext-renderer'
  # Keep other overrides unchanged, or comment out entries you are not debugging
```

> Adjust the relative paths if your directory structure is different.  
> Do **not** put overrides in the root `package.json`; they belong in `pnpm-workspace.yaml`.

### 2. Install Dependencies

From the **root of `cad-viewer`**:

```
pnpm install
```

pnpm will:

- Resolve the overridden packages from the local directories
- Create symlinks inside `node_modules`
- Track them as file-based dependencies

### 3. Build dependencies (If Required)

If the upstream package requires a build step (TypeScript, bundling, etc.):

```
cd ../realdwg-web
pnpm install
pnpm build
```

For active development, you may also run:

```
pnpm dev
```

or a watch mode if supported. Repeat the same steps in `mtext-renderer` when debugging packages from that repo.

### 4. Debug Normally

Now you can:

- Modify code inside the upstream repo (for example `realdwg-web/packages/data-model`)
- Rebuild (or let watch mode rebuild)
- Instantly test changes in `cad-viewer`

No linking, no publishing, no reinstall needed.

## Reverting Back to Published Packages

After debugging is complete:

1. Restore semver overrides in `cad-viewer/pnpm-workspace.yaml` (remove all `file:` paths).
2. Sync dependency versions into workspace packages:

```
pnpm sync:versions
```

3. Reinstall dependencies:

```
pnpm install
```

4. Commit any `package.json` changes produced by `pnpm sync:versions` together with the restored `pnpm-workspace.yaml`.

This ensures:

- CI consistency
- Clean dependency graph
- No accidental local paths committed

## Version Sync Before Release or PR

Before opening a PR or running a release, make sure dependency versions are aligned:

```
pnpm sync:versions
```

This reads `overrides` from `pnpm-workspace.yaml` and updates matching entries in every `packages/*/package.json`.

To verify without writing files:

```
pnpm sync:versions:check
```

The release script (`pnpm release`) and CI both run the check automatically. If versions are out of sync, fix them with `pnpm sync:versions`, commit, then retry.

Typical workflow when bumping an external dependency:

1. Update the semver in `pnpm-workspace.yaml` `overrides`
2. Run `pnpm sync:versions`
3. Run `pnpm install`
4. Test, commit, and open a PR

## ⚠️ Important Notes

### Do NOT Commit Local Paths

Local `file:` overrides are **developer-only**.

Before committing:

- Ensure `pnpm-workspace.yaml` does **not** contain `file:` paths
- Run `pnpm sync:versions` so every `package.json` matches the published semver overrides
- Use published versions for PRs and releases

### When to Use This Approach

✅ Fixing bugs across repos  
✅ Debugging integration issues  
✅ Rapid iteration without publishing  
❌ Long-term dependency management  
❌ CI / production builds

## Comparison: `pnpm link` vs Local Path with pnpm overrides

| Aspect           | pnpm link | Local path with pnpm overrides |
| ---------------- | --------- | ------------------------------- |
| Setup complexity | High      | Low                             |
| Explicitness     | Implicit  | Explicit                        |
| Easy to revert   | ❌         | ✅                               |
| CI-safe          | ❌         | ❌ (dev-only)                    |
| Team-friendly    | ❌         | ✅                               |

## Summary

For debugging issues that span **`cad-viewer`** and upstream repos such as **`realdwg-web`** or **`mtext-renderer`**, temporarily use **`file:` overrides in `pnpm-workspace.yaml`**.

It is:

- Simple
- Transparent
- Easy to teach
- Easy to undo
- Applies to all packages in the monorepo

When you are done debugging—or before any release—restore semver overrides, run **`pnpm sync:versions`**, and commit the synced `package.json` files.


