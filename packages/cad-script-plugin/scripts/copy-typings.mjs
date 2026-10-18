/**
 * Copies hand-maintained public API declarations from `typings/` into `lib/`.
 *
 * The public surface is the panel component and the lazy-register entry.
 * `vue-tsc` is unnecessary for that surface, so the declarations stay curated.
 */
import { cpSync, mkdirSync, rmSync } from 'node:fs'

rmSync('lib', { recursive: true, force: true })
mkdirSync('lib', { recursive: true })
cpSync('typings', 'lib', { recursive: true })
