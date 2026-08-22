---
name: create-release
description: >-
  Create a concise English release message from commits since the last vX.Y.Z
  tag, then bump every workspace package to the same version with pnpm changeset
  and pnpm changeset version. Use when the user asks to release, cut a release,
  bump versions, write a release message, or run changesets for this monorepo.
---

# Create Release

Keep all `packages/*` versions identical. Never bump only the packages touched by recent commits.

## Workflow

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
```

### 1. Find last release tag

Use the latest semver `vX.Y.Z` tag (not by create date alone):

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
"@mlightcad/cad-viewer-examples": patch
"@mlightcad/three-renderer": patch
---

feat: your 30–100 word release summary here
```

Refresh the package list from disk each release; do not hard-code a stale set if packages were added or removed.

If an interactive terminal is available, `pnpm changeset` is fine **only when every package is selected**. Skipping packages is a failure.

### 6. Version

```bash
pnpm changeset version
```

This consumes the changeset, bumps versions, and updates CHANGELOGs.

### 7. Verify lockstep versions

Confirm every `packages/*/package.json` `"version"` is identical. If any package lagged behind, fix before committing — do not ship divergent versions.

Optional sanity check after edits:

```bash
pnpm sync:versions:check
```

### 8. Commit / tag

- Commit **only** when the user asks. Suggested message: `release: release X.Y.Z` (match prior commits).
- Creating/pushing the git tag is separate: `pnpm release` (or `pnpm release X.Y.Z`). Do not run tag push unless the user asks.

## Anti-patterns

- Bumping only “affected” packages
- Release notes as a raw commit list or over 100 words
- Missing conventional prefix on the release message
- Running `pnpm changeset version` with an incomplete changeset
- Changing root `package.json` version (root stays private/`1.0.0`; only `packages/*` release together)
