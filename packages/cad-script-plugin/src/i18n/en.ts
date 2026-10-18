/**
 * English UI strings for the CAD script console.
 *
 * Flat keys under `main.toolPalette.script`.
 */
export const scriptEn = {
  scriptTab: 'Script',
  scriptTitle: 'CAD Script',
  scriptRun: 'Run',
  scriptRunning: 'Running…',
  scriptApi: 'API',
  scriptPlaceholder: 'Write a function body. The only argument is cad.',
  scriptHint: 'Ctrl+Enter runs the script. The only argument is cad.',
  scriptSuccess: 'Succeeded',
  scriptFailed: 'Failed',
  scriptReturnValue: 'Return value',
  scriptNoReturn: 'The script returned no value.',
  scriptLog: 'Log',
  scriptHighlighted: 'Highlighted',
  scriptCreated: 'Created',
  scriptEmptyResult:
    'Run the script to see the return value, log, and errors.',
  scriptNoDocument: 'Open or create a drawing first.',
  scriptReadOnly: 'The drawing is open in read-only mode.',
  scriptNoView: 'Drawing view is not available.',
  scriptTimeout:
    'The script exceeded its time or step limit and was stopped.',
  scriptNotJson: 'The return value is not JSON.',
  scriptEmptyCode: 'The script is empty.',
  scriptTooLarge: 'The script is too long.',
  scriptDynamicAccess: 'Computed access on cad is not allowed.',
  scriptForbiddenSyntax: 'Forbidden syntax',
  scriptForbiddenIdentifier: 'Forbidden identifier',
  scriptForbiddenMember: 'Forbidden member',
  scriptUnknownApi: 'Unknown cad API'
} as const
