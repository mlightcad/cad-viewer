// SPDX-License-Identifier: GPL-3.0-or-later
//
// Pasta de saída do gate G7 (`surfaceProof.node-test.ts`). Por omissão é uma
// pasta temporária: correr o gate não reescreve a evidência versionada.

/** Explícita (`FREEDOM_SURFACE_PROOF_OUT`) > evidência versionada (opt-in) > scratch. */
export function proofOutDir(
  env: Record<string, string | undefined>,
  evidenceDir: string,
  scratch: () => string
): string {
  if (env.FREEDOM_SURFACE_PROOF_OUT) return env.FREEDOM_SURFACE_PROOF_OUT
  if (env.FREEDOM_SURFACE_PROOF_EVIDENCE === '1') return evidenceDir
  return scratch()
}
