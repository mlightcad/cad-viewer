/**
 * Copies hand-maintained public API declarations from `typings/` into `lib/`.
 *
 * Why not `tsc` like the other export plugins?
 * - `package.json` exposes types at `lib/index.d.ts` and `lib/register.d.ts`.
 * - Running `tsc` or `vue-tsc` over this package pulls in the `ai` / `@ai-sdk/*`
 *   dependency graph, which is large enough to hang or OOM during declaration emit.
 * - `vite-plugin-dts` hit the same memory limit in practice.
 *
 * Instead we keep a small, curated surface in `typings/` (only what consumers
 * need) and copy it here before `vite build`. Update those files when the
 * public API changes.
 */
import { cpSync, mkdirSync, rmSync } from 'node:fs'

rmSync('lib', { recursive: true, force: true })
mkdirSync('lib', { recursive: true })
cpSync('typings', 'lib', { recursive: true })
