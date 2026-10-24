import { describe, expect, it } from 'vitest'
import { proseFromText } from './prose'

describe('proseFromText', () => {
  it('makes a paragraph of each block between blank lines', () => {
    expect(proseFromText('One.\n\nTwo.\n\n\nThree.')).toBe('<p>One.</p><p>Two.</p><p>Three.</p>')
  })

  it('keeps a line break inside a paragraph', () => {
    expect(proseFromText('FROM: a\nTO: b\n\nDear Mr. Kessler,')).toBe('<p>FROM: a<br>TO: b</p><p>Dear Mr. Kessler,</p>')
  })

  it('reads every line as a paragraph when there is no blank line', () => {
    expect(proseFromText('One.\nTwo.\r\nThree.')).toBe('<p>One.</p><p>Two.</p><p>Three.</p>')
  })

  it('escapes HTML', () => {
    expect(proseFromText('a < b & <script>x</script>')).toBe('<p>a &lt; b &amp; &lt;script&gt;x&lt;/script&gt;</p>')
  })

  it('ignores surrounding and whitespace-only lines', () => {
    expect(proseFromText('\n  \nOne.\n \t\nTwo.\n\n')).toBe('<p>One.</p><p>Two.</p>')
    expect(proseFromText('  \n ')).toBe('')
  })
})
