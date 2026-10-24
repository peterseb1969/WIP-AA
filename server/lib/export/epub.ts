/**
 * EPUB 3 export: a title page and one XHTML file per chapter, a navigation
 * document (plus the EPUB 2 NCX that older readers still look for), and a
 * small stylesheet in the manner of a printed novel — indented paragraphs,
 * none after a heading or scene break, "* * *" between scenes. Readers and
 * stores (Apple Books, Kobo, KDP) take it as is.
 */
import { createHash } from 'crypto'
import JSZip from 'jszip'
import { chapterHeading, words, type ExportBook, type ExportLanguage } from './book.js'
import type { Block, Run } from './prose.js'

export interface EpubOptions {
  lang: ExportLanguage
  sceneTitles: boolean
}

const esc = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function runHtml(run: Run) {
  if ('break' in run) return '<br/>'
  let html = esc(run.text)
  if (run.strike) html = `<s>${html}</s>`
  if (run.italic) html = `<em>${html}</em>`
  if (run.bold) html = `<strong>${html}</strong>`
  return html
}

const SCENE_BREAK = '<p class="scene-break">* * *</p>'

function blocksHtml(blocks: Block[]) {
  let first = true
  return blocks.map((block) => {
    if (block.kind === 'rule') { first = true; return SCENE_BREAK }
    const html = `<p${first ? ' class="first"' : ''}>${block.runs.map(runHtml).join('')}</p>`
    first = false
    return html
  })
}

const page = (lang: string, title: string, body: string[]) => `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" lang="${lang}">
<head>
<meta charset="utf-8"/>
<title>${esc(title)}</title>
<link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
${body.join('\n')}
</body>
</html>
`

const CSS = `body { margin: 0 5%; font-family: Georgia, serif; line-height: 1.5; }
h1 { text-align: center; font-weight: normal; font-size: 1.5em; margin: 3em 0 2em; page-break-before: always; }
h2 { font-size: 1em; font-weight: bold; margin: 1.5em 0 0.5em; }
p { margin: 0; text-indent: 1.5em; text-align: justify; }
p.first, h2 + p { text-indent: 0; }
p.scene-break { text-indent: 0; text-align: center; margin: 1em 0; }
.title-page { text-align: center; margin-top: 30%; }
.title-page h1 { font-size: 2em; margin: 0 0 1em; page-break-before: avoid; }
.title-page p { text-indent: 0; text-align: center; }
`

/** A stable identifier per title and author, so readers update a re-exported book instead of adding a copy. */
function bookId(book: ExportBook) {
  const hex = createHash('sha1').update(`${book.title}\u0000${book.author}`).digest('hex')
  return `urn:uuid:${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

export async function toEpub(book: ExportBook, opts: EpubOptions, now = new Date()): Promise<Buffer> {
  const lang = opts.lang
  const chapters = book.chapters.map((chapter, i) => {
    const heading = chapterHeading(chapter, lang)
    const body = [`<section epub:type="chapter" role="doc-chapter">`, `<h1>${esc(heading)}</h1>`]
    chapter.scenes.forEach((scene, s) => {
      if (s > 0) body.push(SCENE_BREAK)
      if (opts.sceneTitles && scene.title) body.push(`<h2>${esc(scene.title)}</h2>`)
      body.push(...blocksHtml(scene.blocks))
    })
    body.push('</section>')
    return { file: `chapter-${String(i + 1).padStart(3, '0')}.xhtml`, heading, html: page(lang, heading, body) }
  })

  const titleHtml = page(lang, book.title, [
    '<section class="title-page" epub:type="titlepage">',
    `<h1>${esc(book.title)}</h1>`,
    ...(book.author ? [`<p>${esc(words(lang).by)} ${esc(book.author)}</p>`] : []),
    '</section>',
  ])

  const contents = lang === 'de' ? 'Inhalt' : 'Contents'
  const nav = page(lang, contents, [
    `<nav epub:type="toc" id="toc"><h1>${contents}</h1><ol>`,
    ...chapters.map((c) => `<li><a href="${c.file}">${esc(c.heading)}</a></li>`),
    '</ol></nav>',
  ])

  const id = bookId(book)
  const ncx = `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
<head><meta name="dtb:uid" content="${id}"/></head>
<docTitle><text>${esc(book.title)}</text></docTitle>
<navMap>
${chapters.map((c, i) => `<navPoint id="nav-${i + 1}" playOrder="${i + 1}"><navLabel><text>${esc(c.heading)}</text></navLabel><content src="${c.file}"/></navPoint>`).join('\n')}
</navMap>
</ncx>
`

  const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="${lang}">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="book-id">${id}</dc:identifier>
<dc:title>${esc(book.title)}</dc:title>
${book.author ? `<dc:creator>${esc(book.author)}</dc:creator>\n` : ''}<dc:language>${lang}</dc:language>
<meta property="dcterms:modified">${now.toISOString().replace(/\.\d+Z$/, 'Z')}</meta>
</metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
<item id="css" href="style.css" media-type="text/css"/>
<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>
${chapters.map((c, i) => `<item id="ch${i + 1}" href="${c.file}" media-type="application/xhtml+xml"/>`).join('\n')}
</manifest>
<spine toc="ncx">
<itemref idref="title"/>
<itemref idref="nav" linear="no"/>
${chapters.map((_, i) => `<itemref idref="ch${i + 1}"/>`).join('\n')}
</spine>
</package>
`

  const zip = new JSZip()
  // The mimetype entry must come first and be stored uncompressed.
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })
  zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>
`)
  zip.file('OEBPS/content.opf', opf)
  zip.file('OEBPS/nav.xhtml', nav)
  zip.file('OEBPS/toc.ncx', ncx)
  zip.file('OEBPS/style.css', CSS)
  zip.file('OEBPS/title.xhtml', titleHtml)
  for (const c of chapters) zip.file(`OEBPS/${c.file}`, c.html)
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', mimeType: 'application/epub+zip' })
}
