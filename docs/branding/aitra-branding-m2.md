# OBJ-0103 M2 — Aitra branding (spec + plan)

## Spec
- Shell: `packages/cad-viewer-example` (the hosted app). Title/description/OpenGraph/favicon/apple-touch icon in `index.html`; Aitra logo + name and a visible, clickable upstream credit on the landing panel (`FileUpload.vue`), i18n in `src/locale/*`.
- Assets: derived from the existing Aitra org mark (`aitradevflow/public/favicon.png`), resized to `public/{favicon.png,favicon.ico,apple-touch-icon.png}` and `src/assets/aitra-logo.png`.
- Credit: link "Based on the open-source mlightcad/cad-viewer" -> https://github.com/mlightcad/cad-viewer (`rel="noopener noreferrer"`, 44px touch target).
- Not touched: LICENSE/COPYRIGHT/NOTICE, `@mlightcad/*` names, FIND/engine, internal packages (About dialog in `cad-simple-viewer` keeps upstream links/credits).
- History: d02d03fd was reverted by fc707000 and inspected, not cherry-picked; this reimplements only the shell part (no change to cad-simple-viewer i18n, no changeset).

## Plan
1. Assets + index.html metadata. 2. Landing brand/credit + locales. 3. e2e `branding.spec.ts`. 4. Gates (build, lint, prettier delta, browser desktop/390px, FIND regression).

## Known limitations
- `og:image` omitted: no absolute production URL is known (relative URLs are not valid for crawlers).
- The credit is on the landing panel; once a drawing is open the viewer UI (upstream About dialog, unchanged) carries the upstream credit.
