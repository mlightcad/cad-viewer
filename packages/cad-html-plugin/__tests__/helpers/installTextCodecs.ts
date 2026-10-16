import { TextDecoder, TextEncoder } from 'node:util'

// jsdom does not provide the Node text codecs. `@mlightcad/data-model` reads
// them while the cad-html-core barrel is evaluated, so this must be imported
// before any value import of that package.
Object.assign(globalThis, { TextDecoder, TextEncoder })
