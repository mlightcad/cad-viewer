/**
 * Copies hand-maintained public API declarations from `typings/` into `lib/`.
 *
 * The public surface is the panel class and the lazy-register entry.
 * Declarations stay curated instead of being generated from the sources.
 */
import { cpSync, mkdirSync, rmSync } from 'node:fs'

rmSync('lib', { recursive: true, force: true })
mkdirSync('lib', { recursive: true })
cpSync('typings', 'lib', { recursive: true })
