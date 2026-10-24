---
name: create-release
description: >-
  Create a concise English release message from commits since the last vX.Y.Z
  tag, then bump every workspace package to the same version with pnpm changeset
  and pnpm changeset version. Supports stable releases and npm preview
  prereleases (X.Y.Z-preview.N, dist-tag preview). Use when the user asks to
  release, cut a release, publish a preview, bump versions, write a release
  message, or run changesets for this monorepo.
---

# Create Release

Keep all `packages/*` versions identical. Never bump only the packages touched by recent commits.

Ask the user (if unclear) whether this is a **stable** release or a **preview** prerelease for npm trial installs.

## Workflow (stable)

Copy and track:

```
Release progress:
- [ ] 1. Find last release tag
- [ ] 2. Collect commits since that tag
- [ ] 3. Draft release message (30–100 English words, conventional prefix)
- [ ] 4. Choose bump type (major | minor | patch)
- [ ] 5. Create changeset covering ALL workspace packages
- [ ] 6. Run pnpm changeset version
- [ ] 7. Verify every package version matches
- [ ] 8. Commit version bump (only if user asked to commit)
- [ ] 9. Tag / publish only if user asked: pnpm release [X.Y.Z]
```

## Workflow (preview)

Preview versions use Changesets pre mode and npm dist-tag `preview` (never `latest`).

```
Preview release progress:
- [ ] 1. Find last stable vX.Y.Z tag (baseline)
- [ ] 2. Collect commits since that tag
- [ ] 3. Draft release message (same rules as stable)
- [ ] 4. Choose bump type for the eventual stable line (major | minor | patch)
- [ ] 5. Enter pre mode (if not already): pnpm changeset pre enter preview
- [ ] 6. Create changeset covering ALL workspace packages
- [ ] 7. Run pnpm changeset version → X.Y.Z-preview.N
- [ ] 8. Verify every package version matches (preview semver)
- [ ] 9. Commit version bump (only if user asked to commit)
- [ ] 10. Tag / publish only if user asked: pnpm release --preview
       (or pnpm release X.Y.Z-preview.N)
```

After the last preview before a stable ship:

```bash
pnpm changeset pre exit
# then continue with the stable workflow (changeset + version → X.Y.Z → pnpm release)
```

Do **not** leave the repo in pre mode when cutting a normal stable release.

### Preview version / install

| Item | Value |
| --- | --- |
| Version shape | `X.Y.Z-preview.N` (e.g. `1.8.0-preview.0`) |
| Git tag | `vX.Y.Z-preview.N` |
| npm dist-tag | `preview` (CI: `pnpm publish:viewer:preview`) |
| User install | `pnpm add @mlightcad/cad-viewer@preview` |

### 1. Find last release tag

Use the latest **stable** semver `vX.Y.Z` tag (not by create date alone; ignore `v*-preview.*` for the baseline):

```bash
git tag --list "v*.*.*"
```

Sort by major → minor → patch descending. That tag is the release baseline.

### 2. Collect commits

```bash
git log <latest-tag>..HEAD --pretty=format:"%h %s"
```

Ignore pure release commits such as `release: release X.Y.Z`. Summarize the remaining user-facing changes.

### 3. Draft release message

Requirements:

- English only
- **30–100 words** (aim ~40–80)
- Start with a conventional prefix: `feat:`, `fix:`, `perf:`, `refactor:`, `docs:`, or `chore:`
- One short paragraph summarizing the release theme (not a bullet dump of every commit)
- Match existing CHANGELOG tone (see `packages/*/CHANGELOG.md`)

Prefix choice:

- Dominant change is a new capability → `feat:`
- Dominant change is a bug fix → `fix:`
- Mixed with a clear feature theme → prefer `feat:`
- Only tooling/docs → `chore:` / `docs:`

**Example style** (from prior releases):

```text
feat: speeds up drawing open with progressive loading by default, a direct-batch convert fast path, and smarter rendering-cache heuristics that share compacted INSERT template geometry. Fonts load on demand during text draw, and picking is fixed so hollow lines are not selected via bbox while hatch islands stay selectable
```

Show the draft to the user before applying the changeset unless they already approved the wording.

### 4. Choose bump type

Infer from commits since the last tag (ask if unclear):

| Commits indicate | Bump |
| --- | --- |
| Breaking API / incompatible change | `major` |
| New features, no breaking change | `minor` |
| Fixes / small improvements only | `patch` |

Apply the **same** bump type to every package.

For preview: the bump type is what Changesets will apply to the next version line; pre mode then suffixes `-preview.N`.

### 5. Create changeset for ALL packages

Discover packages:

```bash
# Every packages/*/package.json that has a "name" field
```

Include **every** named workspace package in the changeset frontmatter — public and private. Do not omit untouched packages.

Prefer writing the changeset file directly (agents often lack an interactive TTY for `pnpm changeset`):

1. Create `.changeset/<short-slug>.md`
2. Frontmatter: each package name → chosen bump type
3. Body: the approved release message (single paragraph)

```md
---
"@mlightcad/cad-agent-plugin": patch
"@mlightcad/cad-html-plugin": patch
"@mlightcad/cad-pdf-plugin": patch
"@mlightcad/cad-simple-ui-plugin": patch
"@mlightcad/cad-simple-viewer": patch
"@mlightcad/cad-simple-viewer-cli": patch
"@mlightcad/cad-simple-viewer-example": patch
"@mlightcad/cad-diff-viewer": patch
"@mlightcad/cad-diff-viewer-example": patch
"@mlightcad/cad-svg-plugin": patch
"@mlightcad/cad-viewer": patch
"@mlightcad/cad-viewer-example": patch
"@mlightcad/cad-demo-gallery": patch
"@mlightcad/three-renderer": patch
---

feat: your 30–100 word release summary here
```

Refresh the package list from disk each release; do not hard-code a stale set if packages were added or removed.

If an interactive terminal is available, `pnpm changeset` is fine **only when every package is selected**. Skipping packages is a failure.

### 5b. Preview: enter Changesets pre mode

Only for preview releases, and only if `.changeset/pre.json` is not already present:

```bash
pnpm changeset pre enter preview
```

Then create the changeset (step 5) if it does not exist yet, and continue to version.

If already in pre mode (`pre.json` exists with `"tag": "preview"`), do not enter again — just add a new changeset and version for the next `preview.N`.

### 6. Version

```bash
pnpm changeset version
```

This consumes the changeset, bumps versions, and updates CHANGELOGs.

- Stable: `X.Y.Z`
- Preview (in pre mode): `X.Y.Z-preview.N`

### 7. Verify lockstep versions

Confirm every `packages/*/package.json` `"version"` is identical. If any package lagged behind, fix before committing — do not ship divergent versions.

Optional sanity check after edits:

```bash
pnpm sync:versions:check
```

### 8. Commit / tag

- Commit **only** when the user asks.
  - Stable: `release: release X.Y.Z`
  - Preview: `release: release X.Y.Z-preview.N`
- Creating/pushing the git tag is separate — do not run tag push unless the user asks:

| Mode | Command |
| --- | --- |
| Stable | `pnpm release` or `pnpm release X.Y.Z` |
| Preview | `pnpm release --preview` or `pnpm release X.Y.Z-preview.N` |

`tools/release.mjs` requires:

- Clean working tree on `main`
- All `packages/*` versions lockstep and **equal** to the tag version
- Stable auto-bump (no args) only increments the latest stable `vX.Y.Z` patch
- `--preview` with no version reads the lockstep package version (must already be `X.Y.Z-preview.N`)

CI on tag push:

- `vX.Y.Z` → `pnpm publish:viewer` → npm `latest`
- `vX.Y.Z-preview.N` → `pnpm publish:viewer:preview` → npm `preview` + GitHub prerelease

## Anti-patterns

- Bumping only “affected” packages
- Release notes as a raw commit list or over 100 words
- Missing conventional prefix on the release message
- Running `pnpm changeset version` with an incomplete changeset
- Changing root `package.json` version (root stays private/`1.0.0`; only `packages/*` release together)
- Publishing a preview without Changesets pre mode / without `-preview.N` version
- Tagging a preview in a way that publishes to npm `latest` (always use `publish:viewer:preview` / CI preview branch)
- Cutting a stable release while still in `changeset pre` mode (run `pnpm changeset pre exit` first)
- Using `pnpm release` with no args when packages are already on a preview version (pass `--preview` or the explicit preview version)
