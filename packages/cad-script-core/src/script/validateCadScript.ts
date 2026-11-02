import { parse } from 'acorn'

import { CAD_SCRIPT_API_TREE } from './scriptApi'

/** Maximum accepted script source length, in characters. */
export const MAX_SCRIPT_SOURCE_CHARS = 100_000

const BANNED_IDENTIFIERS = new Set([
  'window',
  'document',
  'globalThis',
  'Function',
  'eval',
  'fetch',
  'navigator',
  'localStorage',
  'sessionStorage',
  'XMLHttpRequest',
  'WebSocket',
  'process',
  'require',
  'Deno',
  'Bun',
  'importScripts'
])

const BANNED_MEMBERS = new Set([
  'constructor',
  'prototype',
  '__proto__',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__'
])

const BANNED_NODE_TYPES = new Set([
  'ImportDeclaration',
  'ImportExpression',
  'ExportAllDeclaration',
  'ExportDefaultDeclaration',
  'ExportNamedDeclaration',
  'WithStatement',
  'ThisExpression',
  'MetaProperty',
  'Super'
])

interface AstNode {
  type: string
  start: number
  end: number
  name?: string
  value?: unknown
  computed?: boolean
  object?: AstNode
  property?: AstNode
  callee?: AstNode
  [key: string]: unknown
}

type ApiNode = { readonly [key: string]: ApiNode | true }

/**
 * Result of checking a script before it runs.
 */
export interface CadScriptValidation {
  /** Whether the script may be executed. */
  ok: boolean
  /** Machine-readable reason when `ok` is false. */
  error?: string
  /** True when the script reaches `cad.edit`. */
  usesEdit: boolean
}

/**
 * Parses and checks a script function body.
 *
 * @param code - Function body submitted by the model. `cad` is the only parameter.
 * @returns Validation status. A syntax or policy failure does not throw.
 */
export function validateCadScript(code: string): CadScriptValidation {
  if (typeof code !== 'string' || code.trim().length === 0) {
    return { ok: false, error: 'empty_script', usesEdit: false }
  }
  if (code.length > MAX_SCRIPT_SOURCE_CHARS) {
    return { ok: false, error: 'script_too_large', usesEdit: false }
  }

  let ast: AstNode
  try {
    ast = parse(wrapScript(code), {
      ecmaVersion: 2022,
      sourceType: 'script'
    }) as unknown as AstNode
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'script_syntax_error',
      usesEdit: false
    }
  }

  let usesEdit = false
  let error: string | undefined
  walk(ast, node => {
    if (error) return
    if (BANNED_NODE_TYPES.has(node.type)) {
      error = `forbidden_syntax:${node.type}`
      return
    }
    if (node.type === 'Identifier' && node.name && BANNED_IDENTIFIERS.has(node.name)) {
      error = `forbidden_identifier:${node.name}`
      return
    }
    if (node.type === 'MemberExpression') {
      const memberError = checkMember(node, flag => {
        usesEdit = usesEdit || flag
      })
      if (memberError) error = memberError
    }
    if (node.type === 'CallExpression' || node.type === 'NewExpression') {
      const callee = node.callee
      if (callee?.type === 'Identifier' && callee.name && BANNED_IDENTIFIERS.has(callee.name)) {
        error = `forbidden_identifier:${callee.name}`
      }
    }
  })

  if (error) return { ok: false, error, usesEdit }
  return { ok: true, usesEdit }
}

/**
 * Wraps a function body so top-level `return` parses.
 *
 * @param code - User script body.
 * @returns Source passed to the parser and the runtime.
 */
export function wrapScript(code: string): string {
  return `function __cadScript(cad) {\n${code}\n}`
}

function checkMember(
  node: AstNode,
  onEdit: (usesEdit: boolean) => void
): string | undefined {
  const chain = memberChain(node)
  if (!chain) return undefined
  for (const part of chain.parts) {
    if (part && BANNED_MEMBERS.has(part)) {
      return `forbidden_member:${part}`
    }
  }
  if (chain.root !== 'cad') return undefined
  if (chain.parts[0] === 'edit') onEdit(true)

  let cursor: ApiNode | true = CAD_SCRIPT_API_TREE
  for (const part of chain.parts) {
    if (cursor === true) return undefined
    if (part == null) return 'dynamic_host_access'
    const next: ApiNode | true | undefined = cursor[part]
    if (!next) return `unknown_api:${chain.parts.filter(Boolean).join('.')}`
    cursor = next
  }
  return undefined
}

function memberChain(node: AstNode): {
  root: string
  parts: Array<string | null>
} | undefined {
  const parts: Array<string | null> = []
  let current: AstNode | undefined = node
  while (current?.type === 'MemberExpression') {
    const property = current.property
    if (!property) return undefined
    if (current.computed) {
      if (property.type === 'Literal' && typeof property.value === 'string') {
        parts.unshift(property.value)
      } else {
        parts.unshift(null)
      }
    } else if (property.type === 'Identifier' && property.name) {
      parts.unshift(property.name)
    } else {
      return undefined
    }
    current = current.object
  }
  if (current?.type === 'Identifier' && current.name) {
    return { root: current.name, parts }
  }
  return undefined
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
