import { parse } from 'acorn'

import { wrapScript } from './validateCadScript'

const LOOP_TYPES = new Set([
  'WhileStatement',
  'DoWhileStatement',
  'ForStatement',
  'ForInStatement',
  'ForOfStatement'
])

interface AstNode {
  type: string
  start: number
  end: number
  body?: AstNode
  [key: string]: unknown
}

/**
 * Inserts `cad.__tick()` at block entries and around non-block loop bodies.
 *
 * The tick lets the runtime stop infinite loops. Parsing uses the same wrapper
 * as validation so statement positions match the executed source.
 *
 * @param code - User script body.
 * @returns Wrapped function source with ticks inserted.
 */
export function instrumentCadScript(code: string): string {
  const wrapped = wrapScript(code)
  const ast = parse(wrapped, {
    ecmaVersion: 2022,
    sourceType: 'script'
  }) as unknown as AstNode

  const inserts: Array<{ index: number; text: string }> = []
  walk(ast, node => {
    if (node.type === 'BlockStatement') {
      inserts.push({ index: node.start + 1, text: 'cad.__tick();' })
    }
    if (LOOP_TYPES.has(node.type) && node.body && node.body.type !== 'BlockStatement') {
      inserts.push({ index: node.body.start, text: '{cad.__tick();' })
      inserts.push({ index: node.body.end, text: '}' })
    }
  })

  inserts.sort((left, right) => right.index - left.index)
  let source = wrapped
  for (const insert of inserts) {
    source = source.slice(0, insert.index) + insert.text + source.slice(insert.index)
  }
  return source
}

function walk(node: AstNode | undefined, visit: (node: AstNode) => void): void {
  if (!node || typeof node.type !== 'string') return
  visit(node)
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'start' || key === 'end') continue
    const value = node[key]
    if (Array.isArray(value)) {
      for (const item of value) {
        if (isAstNode(item)) walk(item, visit)
      }
    } else if (isAstNode(value)) {
      walk(value, visit)
    }
  }
}

function isAstNode(value: unknown): value is AstNode {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as AstNode).type === 'string' &&
    typeof (value as AstNode).start === 'number'
  )
}
