import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
  snippetCompletion
} from '@codemirror/autocomplete'
import { CAD_EDIT_TX_METHODS } from '@mlightcad/cad-agent-core'

/**
 * Completion source for the script editor.
 *
 * CodeMirror draws the list, filters it, and inserts snippets. This module
 * only describes the `cad` host, transaction methods, and values those calls
 * return.
 *
 * @param context - Cursor and document from CodeMirror.
 * @returns Member or variable options, or `null` when this cursor is not an API completion.
 */
export function cadCompletionSource(
  context: CompletionContext
): CompletionResult | null {
  const word = context.matchBefore(/[A-Za-z_$][\w$]*/)
  const from = word?.from ?? context.pos
  const prefix = word?.text ?? ''
  const before = context.state.sliceDoc(0, from)
  const receiver = receiverBefore(before)
  const bindings = collectBindings(context.state.sliceDoc(0, context.pos))

  if (receiver == null) {
    if (!context.explicit && prefix.length === 0) return null
    const options = identifierCompletions(prefix, bindings)
    if (options.length === 0) return null
    return { from, options, validFor: /^[\w$]*$/ }
  }

  const type = typeOfExpression(receiver, bindings)
  if (!type) return null
  const options = membersOf(type).map(toCompletion)
  if (options.length === 0) return null
  return { from, options, validFor: /^[\w$]*$/ }
}

type TypeName =
  | 'cad'
  | 'drawing'
  | 'entities'
  | 'tables'
  | 'symbolTable'
  | 'symbolRecord'
  | 'symbolRecordArray'
  | 'blocks'
  | 'block'
  | 'selection'
  | 'view'
  | 'edit'
  | 'entity'
  | 'entityArray'
  | 'layer'
  | 'layerArray'
  | 'point'
  | 'pointArray'
  | 'extents'
  | 'box'
  | 'geometry'
  | 'tx'
  | 'string'
  | 'stringArray'
  | 'number'
  | 'boolean'
  | 'array'
  | 'unknown'
  | 'void'

interface MemberSpec {
  label: string
  kind: 'property' | 'method' | 'namespace'
  detail: string
  info: string
  returns: TypeName
  snippet?: string
}

interface BindingHit {
  index: number
  apply: (bindings: Map<string, TypeName>) => void
}

const TYPE_LABEL: Record<TypeName, string> = {
  cad: 'cad',
  drawing: 'Drawing',
  entities: 'Entities',
  tables: 'Tables',
  symbolTable: 'SymbolTable',
  symbolRecord: 'SymbolRecord',
  symbolRecordArray: 'SymbolRecord[]',
  blocks: 'Block[]',
  block: 'Block',
  selection: 'Selection',
  view: 'View',
  edit: 'Edit',
  entity: 'Entity',
  entityArray: 'Entity[]',
  layer: 'Layer',
  layerArray: 'Layer[]',
  point: 'Point',
  pointArray: 'Point[]',
  extents: 'Extents',
  box: 'Extents',
  geometry: 'Geometry',
  tx: 'Transaction',
  string: 'string',
  stringArray: 'string[]',
  number: 'number',
  boolean: 'boolean',
  array: 'array',
  unknown: 'value',
  void: 'void'
}

const CALLBACK_METHODS = new Set([
  'where',
  'filter',
  'map',
  'find',
  'forEach',
  'some',
  'every',
  'flatMap'
])

/**
 * Suggests `cad` and names declared earlier in the script.
 *
 * @param prefix - Identifier typed so far. Empty when completion was requested explicitly.
 * @param bindings - Names visible before the cursor.
 * @returns Options whose labels start with `prefix`.
 */
function identifierCompletions(
  prefix: string,
  bindings: Map<string, TypeName>
): Completion[] {
  const options: Completion[] = []
  if (!bindings.has('cad') && (!prefix || 'cad'.startsWith(prefix))) {
    options.push({
      label: 'cad',
      type: 'namespace',
      detail: 'script host',
      info: 'The only argument. Drawing, entities, tables, blocks, selection, view, edit, and log.',
      boost: 2
    })
  }
  for (const [name, type] of bindings) {
    if (prefix && !name.startsWith(prefix)) continue
    options.push({
      label: name,
      type: 'variable',
      detail: TYPE_LABEL[type]
    })
  }
  return options
}

/**
 * Reads declarations that appear before the cursor.
 *
 * Later declarations replace earlier ones with the same name.
 *
 * @param source - Script text from the start through the cursor.
 * @returns Name to value type.
 */
function collectBindings(source: string): Map<string, TypeName> {
  const hits: BindingHit[] = []
  collectAssignments(source, hits)
  collectForOf(source, hits)
  collectCallbacks(source, hits)
  collectTransactions(source, hits)
  hits.sort((a, b) => a.index - b.index)
  const bindings = new Map<string, TypeName>()
  for (const hit of hits) hit.apply(bindings)
  return bindings
}

function collectAssignments(source: string, hits: BindingHit[]): void {
  const pattern = /(?:^|[^\w$])(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*/g
  for (const match of maskNonCode(source).matchAll(pattern)) {
    const name = match[1]
    const expr = readExpression(source, (match.index ?? 0) + match[0].length)
    hits.push({
      index: bindingIndex(match, name),
      apply(bindings) {
        const type = typeOfExpression(expr, bindings)
        if (type) bindings.set(name, type)
      }
    })
  }
}

function collectForOf(source: string, hits: BindingHit[]): void {
  const pattern =
    /(?:^|[^\w$])for\s*\(\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s+of\s+/g
  for (const match of maskNonCode(source).matchAll(pattern)) {
    const name = match[1]
    const expr = readExpression(source, (match.index ?? 0) + match[0].length)
    hits.push({
      index: bindingIndex(match, name),
      apply(bindings) {
        const type = elementOf(typeOfExpression(expr, bindings))
        if (type) bindings.set(name, type)
      }
    })
  }
}

function collectCallbacks(source: string, hits: BindingHit[]): void {
  walkCode(source, index => {
    if (source[index] !== '.') return
    const name = readIdent(source, index + 1)
    if (!name || !CALLBACK_METHODS.has(name)) return
    const cursor = skipSpace(source, index + 1 + name.length)
    if (source[cursor] !== '(') return
    const param = readCallbackName(source, cursor + 1)
    if (!param) return
    hits.push({
      index: param.at,
      apply(bindings) {
        if (name === 'where') {
          bindings.set(param.name, 'entity')
          return
        }
        const receiver = receiverBefore(source.slice(0, index + 1))
        const element = receiver
          ? elementOf(typeOfExpression(receiver, bindings))
          : null
        if (element) bindings.set(param.name, element)
      }
    })
  })
}

function collectTransactions(source: string, hits: BindingHit[]): void {
  walkCode(source, index => {
    if (source[index] !== '.') return
    const name = readIdent(source, index + 1)
    if (name !== 'transaction') return
    let cursor = skipSpace(source, index + 1 + name.length)
    if (source[cursor] !== '(') return
    cursor = skipArgument(source, cursor + 1)
    cursor = skipSpace(source, cursor)
    if (source[cursor] !== ',') return
    const param = readCallbackName(source, cursor + 1)
    if (!param) return
    hits.push({
      index: param.at,
      apply(bindings) {
        bindings.set(param.name, 'tx')
      }
    })
  })
}

function toCompletion(member: MemberSpec): Completion {
  const completion: Completion = {
    label: member.label,
    type:
      member.kind === 'method'
        ? 'method'
        : member.kind === 'namespace'
          ? 'namespace'
          : 'property',
    detail: member.detail,
    info: member.info,
    commitCharacters: member.kind === 'method' ? ['('] : ['.']
  }
  if (!member.snippet) return completion
  return snippetCompletion(member.snippet, completion)
}

function membersOf(type: TypeName): MemberSpec[] {
  switch (type) {
    case 'cad':
      return CAD_MEMBERS
    case 'drawing':
      return DRAWING_MEMBERS
    case 'entities':
      return ENTITY_QUERY_MEMBERS
    case 'tables':
      return TABLE_MEMBERS
    case 'symbolTable':
      return SYMBOL_TABLE_MEMBERS
    case 'symbolRecord':
      return SYMBOL_RECORD_MEMBERS
    case 'block':
      return BLOCK_MEMBERS
    case 'selection':
      return SELECTION_MEMBERS
    case 'view':
      return VIEW_MEMBERS
    case 'edit':
      return EDIT_MEMBERS
    case 'entity':
      return ENTITY_MEMBERS
    case 'layer':
      return LAYER_MEMBERS
    case 'point':
      return POINT_MEMBERS
    case 'extents':
      return EXTENTS_MEMBERS
    case 'box':
      return BOX_MEMBERS
    case 'geometry':
      return GEOMETRY_MEMBERS
    case 'tx':
      return txMembers()
    case 'string':
      return STRING_MEMBERS
    case 'entityArray':
    case 'layerArray':
    case 'pointArray':
    case 'stringArray':
    case 'symbolRecordArray':
    case 'blocks':
    case 'array':
      return arrayMembers(type)
    default:
      return []
  }
}

function elementOf(type: TypeName | null): TypeName | null {
  switch (type) {
    case 'entityArray':
      return 'entity'
    case 'layerArray':
      return 'layer'
    case 'pointArray':
      return 'point'
    case 'stringArray':
      return 'string'
    case 'symbolRecordArray':
      return 'symbolRecord'
    case 'blocks':
      return 'block'
    case 'array':
      return 'unknown'
    default:
      return null
  }
}

function typeOfExpression(
  expr: string,
  bindings: Map<string, TypeName>
): TypeName | null {
  const chain = parseChain(expr.trim())
  if (!chain) return null
  let type: TypeName | null =
    chain.root === 'cad' ? 'cad' : (bindings.get(chain.root) ?? null)
  if (!type) return null
  for (const step of chain.steps) {
    if (step.kind === 'index') {
      type = elementOf(type)
    } else {
      const member: MemberSpec | undefined = membersOf(type).find(
        item => item.label === step.name
      )
      if (!member || step.call !== (member.kind === 'method')) return null
      type = member.returns
    }
    if (!type || type === 'void') return null
  }
  return type
}

interface Chain {
  root: string
  steps: Array<
    { kind: 'member'; name: string; call: boolean } | { kind: 'index' }
  >
}

function parseChain(expr: string): Chain | null {
  let index = 0
  const skip = () => {
    while (index < expr.length && /\s/.test(expr[index])) index++
  }
  skip()
  const root = readIdent(expr, index)
  if (!root) return null
  index += root.length
  const steps: Chain['steps'] = []
  while (index < expr.length) {
    skip()
    if (index >= expr.length) break
    if (
      expr[index] === '?' &&
      (expr[index + 1] === '.' || expr[index + 1] === '[')
    ) {
      index++
    }
    if (expr[index] === '.') {
      index++
      skip()
      const name = readIdent(expr, index)
      if (!name) return null
      index += name.length
      skip()
      let call = false
      if (expr[index] === '(') {
        const end = skipBalanced(expr, index)
        if (end == null) return null
        index = end
        call = true
      }
      steps.push({ kind: 'member', name, call })
      continue
    }
    if (expr[index] === '[') {
      const end = skipBalanced(expr, index)
      if (end == null) return null
      index = end
      steps.push({ kind: 'index' })
      continue
    }
    return null
  }
  return { root, steps }
}

/**
 * Expression to the left of the dot that starts the member being typed.
 *
 * @param source - Text before that member name.
 * @returns Receiver source, or `null` when the cursor is not after a dot.
 */
function receiverBefore(source: string): string | null {
  let index = source.length
  while (index > 0 && /\s/.test(source[index - 1])) index--
  if (index === 0 || source[index - 1] !== '.') return null
  let end = index - 1
  if (end > 0 && source[end - 1] === '?') end -= 1
  const start = scanBackwardExpr(source, end)
  if (start == null || start === end) return null
  return source.slice(start, end).trim()
}

function scanBackwardExpr(source: string, end: number): number | null {
  let index = end
  while (index > 0) {
    while (index > 0 && /\s/.test(source[index - 1])) index--
    if (index === 0) return 0
    const ch = source[index - 1]
    if (ch === ')' || ch === ']' || ch === '}') {
      const open = skipBackwardBalanced(source, index)
      if (open == null) return null
      index = open
      continue
    }
    if (ch === '?' && source[index] === '.') {
      index -= 1
      continue
    }
    if (/[\w$]/.test(ch)) {
      while (index > 0 && /[\w$]/.test(source[index - 1])) index--
      let previous = index
      while (previous > 0 && /\s/.test(source[previous - 1])) previous--
      if (previous > 0 && source[previous - 1] === '.') {
        index = previous - 1
        continue
      }
      return index
    }
    return null
  }
  return index
}

const STATEMENT_START =
  /^(?:const|let|var|return|if|for|while|function|class|throw|try|switch|do|break|continue|import|export|debugger)\b/

function readExpression(source: string, start: number): string {
  let index = skipTrivia(source, start)
  if (STATEMENT_START.test(source.slice(index))) return ''
  const exprStart = index
  let depth = 0
  while (index < source.length) {
    const ch = source[index]
    if (ch === '"' || ch === "'" || ch === '`') {
      const end = skipString(source, index)
      if (end < 0) break
      index = end + 1
      continue
    }
    if (ch === '/' && source[index + 1] === '/') {
      while (index < source.length && source[index] !== '\n') index++
      continue
    }
    if (ch === '/' && source[index + 1] === '*') {
      const close = source.indexOf('*/', index + 2)
      if (close < 0) break
      index = close + 2
      continue
    }
    if (ch === '(' || ch === '[' || ch === '{') depth++
    else if (ch === ')' || ch === ']' || ch === '}') {
      if (depth === 0) break
      depth--
    } else if ((ch === ',' || ch === ';') && depth === 0) {
      break
    } else if ((ch === '\n' || ch === '\r') && depth === 0) {
      const next = skipTrivia(source, index + 1)
      const nextCh = source[next]
      if (
        nextCh !== '.' &&
        nextCh !== '[' &&
        nextCh !== '(' &&
        nextCh !== '?'
      ) {
        break
      }
    }
    index++
  }
  return source.slice(exprStart, index).trim()
}

function readCallbackName(
  source: string,
  start: number
): { name: string; at: number } | null {
  let index = skipSpace(source, start)
  if (
    source.startsWith('async', index) &&
    /[\s(]/.test(source[index + 5] ?? '')
  ) {
    index = skipSpace(source, index + 5)
  }
  if (
    source.startsWith('function', index) &&
    /[\s(]/.test(source[index + 8] ?? '')
  ) {
    index = skipSpace(source, index + 8)
    if (source[index] !== '(') return null
    index = skipSpace(source, index + 1)
    const name = readIdent(source, index)
    return name ? { name, at: index } : null
  }
  if (source[index] === '(') {
    const at = skipSpace(source, index + 1)
    const name = readIdent(source, at)
    if (!name) return null
    const after = skipSpace(source, at + name.length)
    if (source[after] !== ')' && source[after] !== ',') return null
    return { name, at }
  }
  const name = readIdent(source, index)
  if (!name) return null
  const after = skipSpace(source, index + name.length)
  if (source[after] !== '=' || source[after + 1] !== '>') return null
  return { name, at: index }
}

function walkCode(source: string, visit: (index: number) => void): void {
  for (let index = 0; index < source.length; index++) {
    const ch = source[index]
    if (ch === '"' || ch === "'" || ch === '`') {
      const end = skipString(source, index)
      if (end < 0) return
      index = end
      continue
    }
    if (ch === '/' && source[index + 1] === '/') {
      while (index < source.length && source[index] !== '\n') index++
      continue
    }
    if (ch === '/' && source[index + 1] === '*') {
      const close = source.indexOf('*/', index + 2)
      if (close < 0) return
      index = close + 1
      continue
    }
    visit(index)
  }
}

/**
 * Copy of `source` with comments and strings blanked out.
 *
 * Length and indexes stay the same so a match can be read from the original.
 *
 * @param source - Script text.
 * @returns Text safe to scan with a declaration regex.
 */
function maskNonCode(source: string): string {
  let out = ''
  for (let index = 0; index < source.length; index++) {
    const ch = source[index]
    if (ch === '"' || ch === "'" || ch === '`') {
      const end = skipString(source, index)
      if (end < 0) {
        out += ' '.repeat(source.length - index)
        break
      }
      out += ' '.repeat(end - index + 1)
      index = end
      continue
    }
    if (ch === '/' && source[index + 1] === '/') {
      const start = index
      while (index < source.length && source[index] !== '\n') index++
      out += ' '.repeat(index - start)
      index--
      continue
    }
    if (ch === '/' && source[index + 1] === '*') {
      const close = source.indexOf('*/', index + 2)
      const end = close < 0 ? source.length : close + 2
      out += source.slice(index, end).replace(/[^\n]/g, ' ')
      index = end - 1
      continue
    }
    out += ch
  }
  return out
}

function skipArgument(source: string, start: number): number {
  let index = start
  let depth = 0
  while (index < source.length) {
    const ch = source[index]
    if (ch === '"' || ch === "'" || ch === '`') {
      const end = skipString(source, index)
      if (end < 0) return source.length
      index = end + 1
      continue
    }
    if (ch === '(' || ch === '[' || ch === '{') depth++
    else if (ch === ')' || ch === ']' || ch === '}') {
      if (depth === 0) return index
      depth--
    } else if (ch === ',' && depth === 0) return index
    index++
  }
  return index
}

function skipBalanced(source: string, openIndex: number): number | null {
  const open = source[openIndex]
  const close =
    open === '(' ? ')' : open === '[' ? ']' : open === '{' ? '}' : ''
  if (!close) return null
  let depth = 0
  for (let index = openIndex; index < source.length; index++) {
    const ch = source[index]
    if (ch === '"' || ch === "'" || ch === '`') {
      const end = skipString(source, index)
      if (end < 0) return null
      index = end
      continue
    }
    if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) return index + 1
    }
  }
  return null
}

function skipBackwardBalanced(source: string, end: number): number | null {
  const close = source[end - 1]
  const open = close === ')' ? '(' : close === ']' ? '[' : '{'
  let depth = 0
  for (let index = end - 1; index >= 0; index--) {
    const ch = source[index]
    if (ch === '"' || ch === "'" || ch === '`') {
      const start = findStringStart(source, index)
      if (start == null) return null
      index = start
      continue
    }
    if (ch === close) depth++
    else if (ch === open) {
      depth--
      if (depth === 0) return index
    }
  }
  return null
}

function skipString(source: string, start: number): number {
  const quote = source[start]
  let index = start + 1
  if (quote !== '`') {
    while (index < source.length) {
      if (source[index] === '\\') {
        index += 2
        continue
      }
      if (source[index] === quote) return index
      index++
    }
    return -1
  }
  while (index < source.length) {
    if (source[index] === '\\') {
      index += 2
      continue
    }
    if (source[index] === '`') return index
    if (source[index] === '$' && source[index + 1] === '{') {
      const end = skipBalanced(source, index + 1)
      if (end == null) return -1
      index = end
      continue
    }
    index++
  }
  return -1
}

function findStringStart(source: string, closeIndex: number): number | null {
  const quote = source[closeIndex]
  for (let index = closeIndex - 1; index >= 0; index--) {
    if (source[index] !== quote) continue
    let slashes = 0
    for (let slash = index - 1; slash >= 0 && source[slash] === '\\'; slash--) {
      slashes++
    }
    if (slashes % 2 === 0) return index
  }
  return null
}

function skipSpace(source: string, index: number): number {
  while (index < source.length && /\s/.test(source[index])) index++
  return index
}

function skipTrivia(source: string, index: number): number {
  while (index < source.length) {
    if (/\s/.test(source[index])) {
      index++
      continue
    }
    if (source[index] === '/' && source[index + 1] === '/') {
      while (index < source.length && source[index] !== '\n') index++
      continue
    }
    if (source[index] === '/' && source[index + 1] === '*') {
      const close = source.indexOf('*/', index + 2)
      if (close < 0) return source.length
      index = close + 2
      continue
    }
    break
  }
  return index
}

function bindingIndex(match: RegExpMatchArray, name: string): number {
  return (match.index ?? 0) + match[0].lastIndexOf(name)
}

function readIdent(source: string, index: number): string | null {
  if (!/[A-Za-z_$]/.test(source[index] ?? '')) return null
  let end = index + 1
  while (end < source.length && /[\w$]/.test(source[end])) end++
  return source.slice(index, end)
}

function prop(
  label: string,
  detail: string,
  info: string,
  returns: TypeName,
  kind: 'property' | 'namespace' = 'property'
): MemberSpec {
  return { label, kind, detail, info, returns }
}

function method(
  label: string,
  detail: string,
  info: string,
  returns: TypeName,
  snippet?: string
): MemberSpec {
  return {
    label,
    kind: 'method',
    detail,
    info,
    returns,
    snippet: snippet ?? `${label}(\${})`
  }
}

function arrayMembers(type: TypeName): MemberSpec[] {
  const element = elementOf(type) ?? 'unknown'
  return [
    prop('length', 'number', 'Number of items.', 'number'),
    method(
      'map',
      '(fn) => array',
      'Maps each item.',
      'array',
      'map(${item} => ${})'
    ),
    method(
      'filter',
      '(fn) => array',
      'Keeps items that match.',
      type,
      'filter(${item} => ${})'
    ),
    method(
      'find',
      '(fn) => item | undefined',
      'First matching item.',
      element,
      'find(${item} => ${})'
    ),
    method(
      'some',
      '(fn) => boolean',
      'True when any item matches.',
      'boolean',
      'some(${item} => ${})'
    ),
    method(
      'every',
      '(fn) => boolean',
      'True when every item matches.',
      'boolean',
      'every(${item} => ${})'
    ),
    method(
      'forEach',
      '(fn) => void',
      'Calls fn for each item.',
      'void',
      'forEach(${item} => ${})'
    ),
    method(
      'flatMap',
      '(fn) => array',
      'Maps and flattens one level.',
      'array',
      'flatMap(${item} => ${})'
    ),
    method(
      'slice',
      '(start?, end?) => array',
      'Copies a range.',
      type,
      'slice(${start}, ${end})'
    ),
    method(
      'concat',
      '(items) => array',
      'Appends items.',
      type,
      'concat(${items})'
    ),
    method(
      'includes',
      '(item) => boolean',
      'True when the item is present.',
      'boolean',
      'includes(${item})'
    ),
    method(
      'indexOf',
      '(item) => number',
      'Index of the item, or -1.',
      'number',
      'indexOf(${item})'
    ),
    method(
      'findIndex',
      '(fn) => number',
      'Index of the first match, or -1.',
      'number',
      'findIndex(${item} => ${})'
    ),
    method(
      'at',
      '(index) => item',
      'Item at index. Negative counts from the end.',
      element,
      'at(${index})'
    ),
    method(
      'join',
      '(separator?) => string',
      'Joins items into one string.',
      'string',
      'join(${separator})'
    ),
    method(
      'reduce',
      '(fn, initial?) => value',
      'Reduces items to one value.',
      'unknown',
      'reduce(${fn}, ${initial})'
    )
  ]
}

const CAD_MEMBERS: MemberSpec[] = [
  prop(
    'drawing',
    'Drawing',
    'Title, current layer, units, layers, and extents.',
    'drawing',
    'namespace'
  ),
  prop(
    'entities',
    'Entities',
    'Query every entity in the database as a snapshot.',
    'entities',
    'namespace'
  ),
  prop(
    'tables',
    'Tables',
    'Symbol tables: layers, linetypes, text styles, blocks, and the rest.',
    'tables',
    'namespace'
  ),
  prop(
    'blocks',
    'Block[]',
    'Every block definition, including model space, with its entities.',
    'blocks'
  ),
  prop(
    'selection',
    'Selection',
    'Read or replace the highlighted entities.',
    'selection',
    'namespace'
  ),
  prop('view', 'View', 'Change the drawing view.', 'view', 'namespace'),
  prop(
    'edit',
    'Edit',
    'Change the drawing inside one undo group.',
    'edit',
    'namespace'
  ),
  method(
    'log',
    '(...values) => void',
    'Prints values in the result pane.',
    'void',
    'log(${value})'
  )
]

const DRAWING_MEMBERS: MemberSpec[] = [
  prop('title', 'string', 'Document title.', 'string'),
  prop('currentLayer', 'string', 'Name of the current layer.', 'string'),
  prop('units', 'number', 'INSUNITS code.', 'number'),
  prop(
    'layers',
    'Layer[]',
    'Layers with name, isOn, isFrozen, and isLocked.',
    'layerArray'
  ),
  prop(
    'extents',
    'Extents',
    'Bounds of drawable geometry. min, max, and isEmpty.',
    'box'
  )
]

const TABLE_MEMBERS: MemberSpec[] = [
  prop(
    'appIdTable',
    'SymbolTable',
    'Registered application names.',
    'symbolTable'
  ),
  prop(
    'blockTable',
    'SymbolTable',
    'Block definitions. Entity lists are on cad.blocks.',
    'symbolTable'
  ),
  prop('dimStyleTable', 'SymbolTable', 'Dimension styles.', 'symbolTable'),
  prop('linetypeTable', 'SymbolTable', 'Linetype definitions.', 'symbolTable'),
  prop('textStyleTable', 'SymbolTable', 'Text styles.', 'symbolTable'),
  prop(
    'ucsTable',
    'SymbolTable',
    'Named user coordinate systems.',
    'symbolTable'
  ),
  prop('viewTable', 'SymbolTable', 'Named views.', 'symbolTable'),
  prop(
    'layerTable',
    'SymbolTable',
    'Layers, including color, linetype, and on/off state.',
    'symbolTable'
  ),
  prop(
    'viewportTable',
    'SymbolTable',
    'Model-space viewport records (*Active and named VPORTs).',
    'symbolTable'
  )
]

const SYMBOL_TABLE_MEMBERS: MemberSpec[] = [
  prop('id', 'string', 'Symbol table object id.', 'string'),
  prop(
    'records',
    'SymbolRecord[]',
    'Records in this table.',
    'symbolRecordArray'
  )
]

const SYMBOL_RECORD_MEMBERS: MemberSpec[] = [
  prop('id', 'string', 'Record object id.', 'string'),
  prop('name', 'string', 'Record name.', 'string'),
  prop('isOff', 'boolean', 'Layer is off.', 'boolean'),
  prop('isFrozen', 'boolean', 'Layer is frozen.', 'boolean'),
  prop('isLocked', 'boolean', 'Layer is locked.', 'boolean'),
  prop('isPlottable', 'boolean', 'Layer is plottable.', 'boolean'),
  prop('color', 'value', 'Layer or style color.', 'unknown'),
  prop('linetype', 'string', 'Layer linetype name.', 'string'),
  prop('lineWeight', 'number', 'Layer lineweight code.', 'number'),
  prop('isModelSpace', 'boolean', 'True for *Model_Space.', 'boolean'),
  prop('isPaperSpace', 'boolean', 'True for a paper-space block.', 'boolean'),
  prop('origin', 'Point', 'Block or UCS origin.', 'point'),
  prop('fileName', 'string', 'Text style font file.', 'string'),
  prop('textSize', 'number', 'Text style height.', 'number'),
  prop('flags', 'number', 'Block flags.', 'number'),
  prop('pathName', 'string', 'Xref path.', 'string')
]

const BLOCK_MEMBERS: MemberSpec[] = [
  prop('id', 'string', 'Block table record id.', 'string'),
  prop('name', 'string', 'Block name.', 'string'),
  prop('origin', 'Point', 'Block base point.', 'point'),
  prop('isModelSpace', 'boolean', 'True for model space.', 'boolean'),
  prop(
    'isPaperSpace',
    'boolean',
    'True for a paper-space layout block.',
    'boolean'
  ),
  prop('flags', 'number', 'DXF group 70 flags.', 'number'),
  prop('pathName', 'string', 'Xref path. Empty for a local block.', 'string'),
  prop('isXref', 'boolean', 'True when the block is an xref.', 'boolean'),
  prop('layoutId', 'string', 'Layout id for a paper-space block.', 'string'),
  prop('entities', 'Entity[]', 'Entities stored in this block.', 'entityArray')
]

const ENTITY_QUERY_MEMBERS: MemberSpec[] = [
  method(
    'where',
    '(predicate) => Entity[]',
    'Snapshots for which the predicate returns true. The argument has id, ownerId, type, layer, extents, and geometry.',
    'entityArray',
    'where(${entity} => ${})'
  ),
  method(
    'byId',
    '(id) => Entity | undefined',
    'One snapshot, or undefined when the id is missing.',
    'entity',
    'byId(${id})'
  ),
  method(
    'inBox',
    '(min, max) => Entity[]',
    'Snapshots whose world extents hit the box. min and max are { x, y }.',
    'entityArray',
    'inBox(${min}, ${max})'
  )
]

const SELECTION_MEMBERS: MemberSpec[] = [
  prop('ids', 'string[]', 'Selected entity ids.', 'stringArray'),
  prop(
    'entities',
    'Entity[]',
    'Snapshots of the current selection.',
    'entityArray'
  ),
  method(
    'replace',
    '(ids) => void',
    'Replaces the selection.',
    'void',
    'replace(${ids})'
  ),
  method(
    'add',
    '(ids) => void',
    'Adds ids to the selection.',
    'void',
    'add(${ids})'
  ),
  method(
    'remove',
    '(ids) => void',
    'Removes ids from the selection.',
    'void',
    'remove(${ids})'
  ),
  method('clear', '() => void', 'Clears the selection.', 'void', 'clear()')
]

const VIEW_MEMBERS: MemberSpec[] = [
  method(
    'zoomExtents',
    '() => void',
    'Zooms to the drawing extents.',
    'void',
    'zoomExtents()'
  )
]

const EDIT_MEMBERS: MemberSpec[] = [
  method(
    'transaction',
    '(label, tx => void) => void',
    'Runs tx methods in one undo group. Draw methods return the new entity id.',
    'void',
    'transaction(${label}, tx => {\n  ${}\n})'
  )
]

const ENTITY_MEMBERS: MemberSpec[] = [
  prop('id', 'string', 'Entity object id.', 'string'),
  prop(
    'ownerId',
    'string',
    'Id of the owning block, or of the insert when this is an attribute.',
    'string'
  ),
  prop(
    'type',
    'string',
    'Type without the AcDb prefix, such as Circle or Line.',
    'string'
  ),
  prop('layer', 'string', 'Layer name.', 'string'),
  prop(
    'extents',
    'Extents',
    'World bounds, when the entity can report them.',
    'extents'
  ),
  prop(
    'geometry',
    'Geometry',
    'Type-specific fields. Circle has center and radius. Line has start and end.',
    'geometry'
  )
]

const LAYER_MEMBERS: MemberSpec[] = [
  prop('name', 'string', 'Layer name.', 'string'),
  prop('isOn', 'boolean', 'True when the layer is on.', 'boolean'),
  prop('isFrozen', 'boolean', 'True when the layer is frozen.', 'boolean'),
  prop('isLocked', 'boolean', 'True when the layer is locked.', 'boolean')
]

const POINT_MEMBERS: MemberSpec[] = [
  prop('x', 'number', 'X coordinate.', 'number'),
  prop('y', 'number', 'Y coordinate.', 'number'),
  prop('z', 'number', 'Z coordinate.', 'number')
]

const EXTENTS_MEMBERS: MemberSpec[] = [
  prop('min', 'Point', 'Minimum corner.', 'point'),
  prop('max', 'Point', 'Maximum corner.', 'point')
]

const BOX_MEMBERS: MemberSpec[] = [
  ...EXTENTS_MEMBERS,
  prop(
    'isEmpty',
    'boolean',
    'True when the drawing has no drawable bounds.',
    'boolean'
  )
]

const GEOMETRY_MEMBERS: MemberSpec[] = [
  prop('center', 'Point', 'Circle, Arc, or Ellipse center.', 'point'),
  prop('radius', 'number', 'Circle or Arc radius.', 'number'),
  prop('start', 'Point', 'Line start point.', 'point'),
  prop('end', 'Point', 'Line end point.', 'point'),
  prop('startAngle', 'number', 'Arc start angle in radians.', 'number'),
  prop('endAngle', 'number', 'Arc end angle in radians.', 'number'),
  prop('startAngleDeg', 'number', 'Arc start angle in degrees.', 'number'),
  prop('endAngleDeg', 'number', 'Arc end angle in degrees.', 'number'),
  prop('majorRadius', 'number', 'Ellipse major radius.', 'number'),
  prop('minorRadius', 'number', 'Ellipse minor radius.', 'number'),
  prop('points', 'Point[]', 'Polyline vertices.', 'pointArray'),
  prop('closed', 'boolean', 'True when the polyline is closed.', 'boolean'),
  prop('position', 'Point', 'Text, point, or insert position.', 'point'),
  prop('text', 'string', 'Text or MText contents.', 'string'),
  prop('height', 'number', 'Text height.', 'number'),
  prop('basePoint', 'Point', 'Ray or xline base point.', 'point'),
  prop('unitDir', 'Point', 'Ray or xline direction.', 'point'),
  prop('name', 'string', 'Insert or shape name.', 'string'),
  prop('rotation', 'number', 'Rotation in radians.', 'number'),
  prop('scale', 'Point', 'Insert scale factors.', 'point'),
  prop('tag', 'string', 'Attribute tag.', 'string'),
  prop('patternName', 'string', 'Hatch pattern name.', 'string'),
  prop('patternScale', 'number', 'Hatch pattern scale.', 'number'),
  prop('boundary', 'Point[]', 'Hatch boundary points.', 'pointArray'),
  prop('vertices', 'Point[]', 'Leader or mline vertices.', 'pointArray'),
  prop('measurement', 'number', 'Dimension measurement.', 'number'),
  prop(
    'styleName',
    'string',
    'Text, mtext, or dimension style name.',
    'string'
  ),
  prop('textPosition', 'Point', 'Dimension text position.', 'point')
]

const STRING_MEMBERS: MemberSpec[] = [
  prop('length', 'number', 'Number of characters.', 'number'),
  method(
    'includes',
    '(text) => boolean',
    'True when the text occurs.',
    'boolean',
    'includes(${text})'
  ),
  method(
    'startsWith',
    '(text) => boolean',
    'True when the string starts with text.',
    'boolean',
    'startsWith(${text})'
  ),
  method(
    'endsWith',
    '(text) => boolean',
    'True when the string ends with text.',
    'boolean',
    'endsWith(${text})'
  ),
  method(
    'slice',
    '(start?, end?) => string',
    'Copies a range of characters.',
    'string',
    'slice(${start}, ${end})'
  ),
  method(
    'trim',
    '() => string',
    'Removes surrounding whitespace.',
    'string',
    'trim()'
  ),
  method(
    'toLowerCase',
    '() => string',
    'Returns the string in lower case.',
    'string',
    'toLowerCase()'
  ),
  method(
    'toUpperCase',
    '() => string',
    'Returns the string in upper case.',
    'string',
    'toUpperCase()'
  ),
  method(
    'indexOf',
    '(text) => number',
    'Index of text, or -1.',
    'number',
    'indexOf(${text})'
  ),
  method(
    'split',
    '(separator) => string[]',
    'Splits into parts.',
    'stringArray',
    'split(${separator})'
  )
]

const TX_DOCS: Record<string, MemberSpec> = {
  drawLine: method(
    'drawLine',
    '({ start, end, layer? }) => id',
    'Draws a line and returns the new entity id.',
    'string',
    'drawLine({ start: { x: ${sx}, y: ${sy} }, end: { x: ${ex}, y: ${ey} } })'
  ),
  drawCircle: method(
    'drawCircle',
    '({ center, radius, layer? }) => id',
    'Draws a circle and returns the new entity id.',
    'string',
    'drawCircle({ center: { x: ${cx}, y: ${cy} }, radius: ${radius} })'
  ),
  drawArc: method(
    'drawArc',
    '({ center, radius, startAngleDeg, endAngleDeg, layer? }) => id',
    'Draws an arc and returns the new entity id. Angles are degrees.',
    'string',
    'drawArc({ center: { x: ${cx}, y: ${cy} }, radius: ${radius}, startAngleDeg: ${start}, endAngleDeg: ${end} })'
  ),
  drawRectangle: method(
    'drawRectangle',
    '({ corner1, corner2, layer? }) => id',
    'Draws a rectangle and returns the new entity id.',
    'string',
    'drawRectangle({ corner1: { x: ${x1}, y: ${y1} }, corner2: { x: ${x2}, y: ${y2} } })'
  ),
  drawPolyline: method(
    'drawPolyline',
    '({ points, closed?, layer? }) => id',
    'Draws a polyline and returns the new entity id.',
    'string',
    'drawPolyline({ points: [{ x: ${x}, y: ${y} }], closed: ${closed} })'
  ),
  drawText: method(
    'drawText',
    '({ position, text, height?, layer? }) => id',
    'Draws text and returns the new entity id.',
    'string',
    'drawText({ position: { x: ${x}, y: ${y} }, text: ${text}, height: ${height} })'
  ),
  erase: method(
    'erase',
    '(ids) => number',
    'Erases entities and returns how many were erased.',
    'number',
    'erase(${ids})'
  ),
  setLayer: method(
    'setLayer',
    '(ids, layer) => void',
    'Moves entities onto a layer that already exists.',
    'void',
    'setLayer(${ids}, ${layer})'
  ),
  move: method(
    'move',
    '(ids, dx, dy) => number',
    'Moves entities by dx and dy.',
    'number',
    'move(${ids}, ${dx}, ${dy})'
  ),
  rotate: method(
    'rotate',
    '(ids, center, angleDeg) => number',
    'Rotates entities around center by angleDeg.',
    'number',
    'rotate(${ids}, ${center}, ${angleDeg})'
  ),
  createLayer: method(
    'createLayer',
    '(name) => void',
    'Creates a layer.',
    'void',
    'createLayer(${name})'
  ),
  setCurrentLayer: method(
    'setCurrentLayer',
    '(name) => void',
    'Sets the current layer.',
    'void',
    'setCurrentLayer(${name})'
  )
}

function txMembers(): MemberSpec[] {
  return CAD_EDIT_TX_METHODS.map(
    name =>
      TX_DOCS[name] ??
      method(name, '()', 'Transaction method.', 'unknown', `${name}(\${})`)
  )
}
