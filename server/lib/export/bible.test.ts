import { describe, expect, it } from 'vitest'
import { toBibleMarkdown, toBiblePrintHtml, type Bible } from './bible'

const bible: Bible = {
  title: 'Low Water',
  author: 'Marta Lindqvist',
  sections: [
    { title: 'Characters', entries: [{
      name: 'Tuck', kind: 'Protagonist',
      fields: [{ label: 'Description', text: 'A cautious mouse.' }, { label: 'Relationships', text: 'Bramble, sibling: older by a day\nKev, ally' }],
      links: [],
    }] },
    { title: 'Plot Threads', entries: [{ name: 'The <Poison>', kind: 'Open', fields: [], links: [{ label: 'Characters', names: ['Tuck', 'Mrs. Okafor'] }] }] },
  ],
}

describe('story bible', () => {
  it('Markdown: a section per kind, an entry per heading, fields and links in bold labels', () => {
    expect(toBibleMarkdown(bible, 'en')).toBe([
      '# Low Water — Story Bible', '*by Marta Lindqvist*',
      '## Characters', '### Tuck · Protagonist', '**Description:** A cautious mouse.',
      '**Relationships:** Bramble, sibling: older by a day  \nKev, ally',
      '## Plot Threads', '### The \\<Poison> · Open', '**Characters:** Tuck, Mrs. Okafor',
    ].join('\n\n') + '\n')
  })

  it('print view: escaped, labelled, one page per section, German headings', () => {
    const html = toBiblePrintHtml(bible, 'de')
    expect(html).toContain('<title>Low Water — Story-Bibel</title>')
    expect(html).toContain('<h3>The &lt;Poison&gt; <span class="kind">Open</span></h3>')
    expect(html).toContain('<dt>Relationships</dt><dd>Bramble, sibling: older by a day<br>Kev, ally</dd>')
    expect(html).toContain('section + section { break-before: page; }')
    expect(html).toContain('Drucken / Als PDF sichern')
  })
})
