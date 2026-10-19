import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Markdown from './Markdown'

const html = (source: string) => renderToStaticMarkup(<Markdown>{source}</Markdown>)

describe('Markdown (Claude’s answers)', () => {
  it('renders the usual formatting', () => {
    const out = html('## Plan\n\n**bold**, *italic*, `code`, ~~gone~~\n\n- one\n- two\n\n> quoted')
    expect(out).toContain('<h4')
    expect(out).toContain('<strong class="font-semibold">bold</strong>')
    expect(out).toContain('<em class="italic">italic</em>')
    expect(out).toContain('<del>gone</del>')
    expect(out).toMatch(/<ul[^>]*>\s*<li[^>]*>one<\/li>/)
    expect(out).toContain('<blockquote')
  })

  it('renders tables (GitHub-flavoured)', () => {
    const out = html('| Name | Role |\n|---|---|\n| Ada | lead |')
    expect(out).toContain('<table')
    expect(out).toMatch(/<td[^>]*>Ada<\/td>/)
  })

  it('never renders raw HTML from the source', () => {
    const out = html('Hello <script>alert(1)</script> <b>bold?</b> <img src=x onerror=alert(1)>')
    expect(out).not.toMatch(/<script|<b>|<img/i)
    // shown as text instead
    expect(out).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(out).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('opens links in a new tab without handing over the opener', () => {
    const out = html('[docs](https://example.com)')
    expect(out).toContain('href="https://example.com"')
    expect(out).toContain('target="_blank"')
    expect(out).toContain('rel="noopener noreferrer"')
  })

  it('drops javascript: link targets', () => {
    const out = html('[click](javascript:alert(1))')
    expect(out).not.toContain('javascript:')
  })
})
