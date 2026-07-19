/**
 * Returns true when the name is a user-insertable block (not anonymous / system).
 *
 * @param blockName - Candidate block table record name.
 */
export function isInsertableBlockName(blockName: string): boolean {
  const name = blockName.trim()
  if (!name) return false
  // Newlines would break command-script piping (`sendStringToExecute`).
  if (/[\r\n]/.test(name)) return false
  // Skip anonymous / system blocks (*D, *U, *X, *T, *Model_Space, …).
  return !name.startsWith('*')
}
