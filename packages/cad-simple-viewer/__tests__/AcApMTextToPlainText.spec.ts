import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import {
  acapFindTextInLayout,
  acapMTextToPlainText
} from '../src/find/findText'

describe('acapMTextToPlainText', () => {
  it.each([
    ['', ''],
    ['ordinary text', 'ordinary text'],
    [String.raw`{\fArial|b1;Sala\P\H2x;Técnica} \C1;A\~B`, 'Sala Técnica A B'],
    [String.raw`\U+00E7 \S1^2; %%c20%%d %%p`, 'ç 1/2 Ø20° ±'],
    [String.raw`a\{b\}\\c`, 'a{b}\\c'],
    [String.raw`\Lone\l \Otwo\o \Kthree\k`, 'one two three'],
    [String.raw`\Aunterminated\P{tail}`, String.raw`\Aunterminated tail`],
    [String.raw`\Afoo\P{bar};end`, 'end'],
    ['\\Afoo\nbar;end', 'end'],
    [String.raw`\\S1^2;`, String.raw`\S1^2;`],
    [String.raw`\S^2;`, '/2'],
    [String.raw`\S1^;`, '1'],
    [String.raw`\S^;`, ''],
    [String.raw`\S1^2^3;`, '1/2^3'],
    [String.raw`\S1#2;`, '1/2'],
    [String.raw`\S1/2;`, '1/2'],
    [String.raw`\Splain;`, 'plain'],
    [String.raw`\S;`, ''],
    [String.raw`\S1\P2;`, String.raw`1\P2`],
    [String.raw`\S1;\S2`, String.raw`1\S2`],
    [String.raw`\U+12345`, '\u12345'],
    [String.raw`\U+D83D\U+DE00`, '😀'],
    [String.raw`\U+00G1`, String.raw`\U+00G1`],
    [String.raw`\unknown \h; \w; \t;`, String.raw`\unknown \h; \w; \t;`],
    ['tail\\', 'tail\\'],
    [String.raw`\Xfirst\~second`, 'first second'],
    [String.raw`\P;`, ';']
  ])('preserves formatting semantics for %j', (input, expected) => {
    expect(acapMTextToPlainText(input)).toBe(expected)
  })

  it.each([...'fFHWTQCcAaRrp'])(
    'handles complete and incomplete %s codes',
    code => {
      expect(acapMTextToPlainText(`before\\${code}value;after`)).toBe(
        'beforeafter'
      )
      expect(acapMTextToPlainText(`before\\${code}value`)).toBe(
        `before\\${code}value`
      )
    }
  )

  it.each([String.raw`\S`, String.raw`\A`, String.raw`\S\A\f`])(
    'finishes long unterminated %j sequences in a bounded subprocess',
    prefix => {
      // A separate process makes the deadline effective even if a synchronous
      // regex regression blocks the event loop. Node 24 can import this pure TS API.
      const moduleUrl = pathToFileURL(
        resolve(__dirname, '../src/find/findText.ts')
      ).href
      const script = `
        import assert from 'node:assert/strict'
        import { acapMTextToPlainText } from ${JSON.stringify(moduleUrl)}
        const text = ${JSON.stringify(prefix)}.repeat(200000)
        assert.equal(acapMTextToPlainText(text), text)
        assert.equal(acapMTextToPlainText('\\\\S1^2;' + text), '1/2' + text)
        assert.equal(acapMTextToPlainText('Room\\\\P\\\\S1^2;'), 'Room 1/2')
      `
      expect(() =>
        execFileSync(
          process.execPath,
          ['--input-type=module', '--eval', script],
          {
            timeout: 10000,
            stdio: 'pipe'
          }
        )
      ).not.toThrow()
    }
  )

  it('keeps FIND usable after an entity with incomplete formatting', () => {
    const contents = String.raw`\S\A`.repeat(10000)
    const entities = [
      { objectId: 'm1', dxfTypeName: 'MTEXT', contents, layer: '0' },
      { objectId: 't1', dxfTypeName: 'TEXT', textString: 'Room', layer: '0' }
    ]
    const db = {
      tables: {
        blockTable: { getIdAt: () => ({ newIterator: () => entities }) }
      }
    }
    expect(
      acapFindTextInLayout(db, 'layout', 'room').hits.map(h => h.entityId)
    ).toEqual(['t1'])
  })
})
