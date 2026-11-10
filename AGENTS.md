# AGENTS.md

MLightCAD is a browser-only DWG/DXF viewer and editor: a `pnpm` + `nx` TypeScript monorepo (`packages/*`) with no backend.

## Setup and commands

Node >= 24, pnpm 10.33.4 (pinned by `packageManager`).

```bash
pnpm install            # CI uses --frozen-lockfile
pnpm dev                # Vue editor demo (cad-editor-demo)
pnpm dev:simple         # framework-free demo (cad-simple-viewer-demo)
pnpm build              # nx run-many -t build
pnpm lint / lint:fix    # ESLint (includes simple-import-sort)
pnpm test               # Jest (root config, excludes e2e)
pnpm test:e2e           # Playwright (cad-editor-demo only)
pnpm docs:site          # VitePress dev docs
```

Single project: `pnpm nx build @mlightcad/<pkg>`, `pnpm nx lint @mlightcad/<pkg>`.
Single test file: `pnpm jest packages/<pkg>/__tests__/Foo.spec.ts`.

## Package layout (directory -> package name)

- `cad-simple-viewer` -> `@mlightcad/cad-simple-viewer`: core logic, **no UI framework** (canvas only) — commands, documents, plugin system, i18n registry.
- `cad-editor` -> `@mlightcad/cad-editor`: Vue 3 component/app (menus, ribbon, command line, status bar).
- `three-renderer` / `pdf-renderer`: rendering engines (THREE.js batching, PDF output).
- `*-plugin` (`cad-simple-ui`, `cad-script`, `cad-llm`, `cad-agent`, `cad-pdf`, `cad-html`, `cad-svg`, `cad-onedrive`, `cad-google-drive`): optional features, lazy-loaded.
- `cad-llm-plugin` -> `@mlightcad/cad-llm-plugin`: shared AI model (LLM) settings — config store, AI SDK model factory, framework-free settings dialog (`llmsettings`) and the LLM text recognizer. `cad-agent-plugin` depends on it; other features (e.g. `pdftext` OCR) reach it only through `AcApLlmSettingsService` / `AcApTextRecognitionService` in `cad-simple-viewer`, which must never import AI SDK code.
- `cad-html-core` / `cad-html-exporter` / `cad-simple-viewer-cli` / `cad-mcp-server`: self-contained HTML export, CLI, MCP server.
- `cad-pdf-core` / `cad-pdf-exporter`: shared PDF export pipeline (no `cad-simple-viewer` / DOM dependency) and the headless Node PDF exporter built on it; `cad-pdf-plugin` uses the same core in the browser.
- `cad-svg-converter` -> `@mlightcad/cad-svg-converter`: SVG File → Open (`AcDbDatabaseConverter` for `'svg'`). Depends only on `data-model`. Hosts call `registerSvgConverter()` (`cad-editor` does this in `initializeCadViewer`). Export remains `cad-svg-plugin` (`csvg`).
- `cad-script-core` -> `@mlightcad/cad-script-core`: agent script runtime (`cad.*` host, tool catalog, headless `createDatabaseSession`). Depends on `data-model` + `cad-pdf-core` (`cad.file.savePdf`); HTML export (`cad.file.saveHtml`) uses a `CadSession.exportHtml` hook filled by `cad-agent-core`. ESLint rejects `cad-simple-viewer`, `cad-html-core`, `three`, and `vue` imports there. `cad-agent-core` binds it to `cad-simple-viewer` and re-exports it.
- `*-demo` / `*-example`: sample apps (not published). `vite-config`: shared Rollup/Vite helpers.

Layering: `data-model` (external) -> renderers (`three-renderer`) -> view layer (`cad-simple-viewer`) -> UI (`cad-editor`) / plugins. **Low-level packages must never depend on higher-level ones.**

## Reading dependency sources

Published `@mlightcad/*` dependencies live in sibling repositories of this one, checked out side by side in the same parent folder. Check the parent directory (`../`) before guessing APIs:

- `../realdwg-web/packages/*` -> `data-model`, `libredwg-converter`, `geometry-engine`, `graphic-interface`
- `../mtext-renderer`, `../mtext-parser`, `../mtext-input-box`, `../shx-parser` -> text/SHX stack
- `../ribbon`, `../ui-components` -> editor UI building blocks

Always read the actual source when a dependency's behavior matters; do not infer signatures from this repo's imports alone.

## Code conventions

- Formatting is owned by Prettier: no semicolons, single quotes, `printWidth: 80`, `trailingComma: none`, single-parameter arrows without parens. Never hand-format.
- ESLint: single quotes, `simple-import-sort` (third party block, blank line, relative imports), prefix unused vars/args with `_`. Run `pnpm lint:fix` before committing.
- TypeScript is `strict` with `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch` (see `tsconfig.base.json`). Avoid `any`; prefer explicit types/interfaces.
- **Prefixes encode the owning layer** and apply to classes _and_ to exported functions/values, not just types:
  - Classes/types: `AcAp` (app/core), `AcEd` (editor/commands), `AcTr` (three renderer), `AcEx` (extended interaction, e.g. osnap), `AcExHtml` (`cad-html-core`), `AcUi` (UI controllers), `AcSv`/`AcSvg` (SVG), `AcPdf` (PDF renderer), `AcExPdf` (`cad-pdf-core`).
  - Exported functions/values: same prefix in lowerCamelCase — `acapFoo()`, `acedFoo()`, `acTrFoo()`, `acExFoo()`, `acexHtmlFoo()`, `acexPdfFoo()`, `acuiFoo()`. Exceptions: Vue hooks/composables use `use*` (e.g. `useSettings`), and local (non-exported) helpers do not need a prefix.
- File name matches its primary class (`AcApFoo.ts`); commands are `AcAp<Name>Cmd.ts`.
- Public API gets JSDoc — TypeDoc generates the API reference from it. Inline comments explain _why_, not _what_.
- Entry point is always `src/index.ts` (re-exports); plugins additionally expose `src/register.ts`.

## Commands and i18n

The full recipe for a new CAD command lives in `packages/cad-simple-viewer/src/command/AGENTS.md` (file -> jig -> command class -> i18n -> register in `AcApDocManager.registerCommands` -> export from `src/command/index.ts`).

- Every user-facing string (command descriptions, prompts, dialogs, ribbon/menu labels, tooltips, palettes, plugin UI, exported HTML viewer) must go through i18n — never hardcode English.
- Core code uses `AcApI18n.t('command.ACAD.line')`; the Vue UI uses `vue-i18n`. Key prefixes: `command.*`, `jig.*`, `dialog.*`, `entity.*`, `main.*`.
- **Translate into all supported locales in the same change: `en`, `zh`, `ja`, `ko`, `tr`, `cs`, `ar`.** Whenever you add a key or change the meaning of an English string, write the real translation in every locale file. Do not copy the English text, do not leave a key out and rely on the `en` fallback, and do not fill a locale with `...enX` spreads or `clone(en)`. Each of these falls back to English silently at runtime, which is how the ja/ko UI ended up mostly English.
- Catalog locations (each language has its own file):
  - `cad-editor/src/locale/<lang>/{main,command,dialog,entity}.ts`
  - `cad-simple-viewer/src/i18n/<lang>/{main,command,jig}.ts`
  - `cad-editor-demo/src/locale/<lang>.ts`
  - `cad-*-plugin/src/i18n/` (`<lang>.ts`, `command-<lang>.ts`, or per-locale records such as `command.ts` / `exampleCopy.ts`)
  - `cad-html-core/src/AcExHtmlI18n.ts` plus `src/i18n/<lang>.ts`
- Use AutoCAD's localized terminology for each language (e.g. zh 图层, ja 画層, ko 도면층). Keep `{placeholders}`, `|` plural parts and `\n` breaks, and never put a raw `@` in vue-i18n messages (write `{'@'}`). In jig keyword objects `{ display, local, global }`, `global` always stays English.
- `test/i18n/localeCompleteness.spec.ts` fails on any missing key, or any value identical to English, in any locale. Register every new catalog in its `CATALOGS` map. Only add to its `NEUTRAL_VALUES` / `SAME_AS_ENGLISH` allowlists for words that really are the same in that language (brand names, loanwords). Never use the allowlists to skip a translation.
- When adding a new locale, add it to `AcApLocale`, every catalog above, element-plus locale mapping in `useLocale.ts`, and `LOCALES` in the completeness test.
- ESLint `vue-i18n/no-unused-keys` also requires every language's files to stay in sync with the keys actually used.

## Testing

- Unit tests sit beside the source: `packages/<pkg>/__tests__/*.spec.ts` (Jest + ts-jest, environment `node`; add a `@jest-environment jsdom` docblock when DOM is needed).
- three.js is mocked via `moduleNameMapper` in `jest.config.ts`; when a workspace package becomes directly imported by tests, add its mapping there too.
- E2E: `packages/cad-editor-demo/e2e/` (Playwright, fixtures include a minimal DXF). Add E2E coverage for interaction/UI changes.
- Fix bugs with a failing test first; never make CI green by deleting or skipping tests.

## Versions and changesets

- **All `packages/*` versions must stay identical.** The single source of truth for dependency versions is `overrides` in the root `pnpm-workspace.yaml`; after editing it run `pnpm sync:versions` (CI enforces `sync:versions:check`).
- User-visible changes need a changeset: `pnpm changeset`; the `fixed` group in `.changeset/config.json` bumps them together. Release flow: `.cursor/skills/create-release/SKILL.md` (stable, or `-preview.N` prereleases published under the npm `preview` dist-tag).
- Commit messages follow Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, optionally scoped, e.g. `feat(ribbon): ...`.

## Other constraints

- Client secrets/config reach the build through `VITE_*` env vars (CI injects secrets/vars). **Never export empty `VITE_*` values** — Vite treats them as set and will not fall back to `.env`.
- Cross-repo debugging (`realdwg-web`, `mtext-renderer`) uses temporary `file:` overrides in `pnpm-workspace.yaml`, not `pnpm link`; revert before committing. See `docs/development/debugging-with-multiple-repo-changes.md`.
- Docs: development guides live in `docs/development/` (English) plus `docs/{zh,ja,ko,ar,cs,tr}/`; new dev docs should be added to the translations too. **After a large module split/move or a user-facing public API change, update the upgrade guide** (`docs/development/upgrade-guide.md` and every locale under `docs/{zh,ja,ko,ar,cs,tr}/development/upgrade-guide.md`): state which release the change lands in, what consumers must migrate, and keep related development guides / package READMEs in sync with the new names and package layout.
- `dist/`, `lib/`, `public/` are build output — never edit by hand.
