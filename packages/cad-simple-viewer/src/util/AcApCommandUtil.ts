/**
 * Kind of measure/markup drawing session tied to command global names.
 *
 * - `'measure'` — measurement tools (distance, area, angle, arc, point)
 * - `'markup'` — markup drawing tools (text, line, arrow, cloud, and so on)
 */
export type AcApDrawStyleKind = 'measure' | 'markup'

/** Global command names that enter a measurement drawing session. */
const MEASURE_DRAW_COMMANDS = new Set([
  'measuredistance',
  'measurecontinuous',
  'measurearea',
  'measureangle',
  'measurearc',
  'measurepoint'
])

/** Global command names that enter a markup drawing session. */
const MARKUP_DRAW_COMMANDS = new Set([
  'markuptext',
  'markupline',
  'markuparrow',
  'markupcloud',
  'markuprect',
  'markupcircle',
  'markuphighlight',
  'markupcallout',
  'markupstamp'
])

/**
 * Maps a command global name to the draw-style session kind.
 *
 * @param commandName - Command global name; comparison is case-insensitive.
 * @returns `'measure'` or `'markup'`, or `undefined` if the command is unrelated.
 */
export function acapDrawStyleKindForCommand(
  commandName: string | undefined
): AcApDrawStyleKind | undefined {
  const name = commandName?.trim().toLowerCase()
  if (!name) return undefined
  if (MEASURE_DRAW_COMMANDS.has(name)) return 'measure'
  if (MARKUP_DRAW_COMMANDS.has(name)) return 'markup'
  return undefined
}
