/**
 * The print view: the book as one HTML page laid out for paper, which the
 * browser's Print dialog saves as a PDF. A title page, every chapter on a
 * new page, page numbers at the foot of each page (CSS page margin boxes,
 * Chrome 131+ and Safari 18.2+), widows and orphans avoided. On screen a bar
 * above the book offers the Print button; it is not printed.
 */
import { chapterHeading, words, type ExportBook, type ExportLanguage } from './book.js'
import { blocksHtml, esc, SCENE_BREAK } from './html.js'

export type PageSize = 'a5' | 'a4' | 'letter'

export interface PrintOptions {
  lang: ExportLanguage
  sceneTitles: boolean
  size: PageSize
}

const PAGE: Record<PageSize, { size: string; margin: string; font: string }> = {
  a5: { size: 'A5', margin: '18mm 16mm 22mm', font: '10.5pt' },
  a4: { size: 'A4', margin: '25mm 25mm 28mm', font: '12pt' },
  letter: { size: 'letter', margin: '1in 1in 1.1in', font: '12pt' },
}

const TOOLBAR = {
  en: { print: 'Print / Save as PDF', hint: 'In the print dialog, choose “Save as PDF” as the destination. Turn off the browser’s own headers and footers for a clean page.' },
  de: { print: 'Drucken / Als PDF sichern', hint: 'Im Druckdialog „Als PDF speichern“ als Ziel wählen. Die Kopf- und Fußzeilen des Browsers ausschalten, damit die Seite sauber bleibt.' },
}

export function toPrintHtml(book: ExportBook, opts: PrintOptions) {
  const page = PAGE[opts.size]
  const bar = TOOLBAR[opts.lang]
  const chapters = book.chapters.map((chapter) => {
    const body = [`<section class="chapter">`, `<h1>${esc(chapterHeading(chapter, opts.lang))}</h1>`]
    chapter.scenes.forEach((scene, i) => {
      if (i > 0) body.push(SCENE_BREAK)
      if (opts.sceneTitles && scene.title) body.push(`<h2>${esc(scene.title)}</h2>`)
      body.push(...blocksHtml(scene.blocks))
    })
    body.push('</section>')
    return body.join('\n')
  })

  return `<!doctype html>
<html lang="${opts.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(book.title)}</title>
<style>
@page { size: ${page.size}; margin: ${page.margin};
  @bottom-center { content: counter(page); font: 9pt Georgia, 'Times New Roman', serif; color: #444; } }
@page :first { @bottom-center { content: none; } }
body { font-family: Georgia, 'Times New Roman', serif; font-size: ${page.font}; line-height: 1.45; color: #111; margin: 0; }
.title-page { text-align: center; padding-top: 35vh; break-after: page; }
.title-page h1 { font-size: 2em; font-weight: normal; margin: 0 0 1em; }
.chapter { break-before: page; }
.chapter h1 { text-align: center; font-weight: normal; font-size: 1.5em; margin: 4em 0 2em; }
h2 { font-size: 1em; margin: 1.5em 0 0.5em; break-after: avoid; }
p { margin: 0; text-indent: 1.5em; text-align: justify; hyphens: auto; orphans: 2; widows: 2; }
p.first, h2 + p, .title-page p { text-indent: 0; }
.title-page p { text-align: center; }
p.scene-break { text-indent: 0; text-align: center; margin: 0.8em 0; break-after: avoid; }
.toolbar { display: none; }
@media screen {
  html { background: #eef0f3; }
  body { max-width: 38em; margin: 0 auto 4em; padding: 3em 3.5em; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.12); }
  .title-page { padding-top: 6em; }
  .chapter { border-top: 1px solid #ddd; margin-top: 3em; }
  .toolbar { display: flex; gap: 1em; align-items: center; position: sticky; top: 0; z-index: 1; margin: -3em -3.5em 2em; padding: 0.8em 3.5em;
    background: #2B579A; color: #fff; font: 14px/1.4 Inter, system-ui, sans-serif; }
  .toolbar button { font: inherit; font-weight: 600; padding: 0.45em 1em; border: 0; border-radius: 6px; background: #fff; color: #2B579A; cursor: pointer; }
  .toolbar span { opacity: .85; font-size: 12px; }
}
</style>
</head>
<body>
<div class="toolbar"><button type="button" onclick="window.print()">${esc(bar.print)}</button><span>${esc(bar.hint)}</span></div>
<section class="title-page">
<h1>${esc(book.title)}</h1>
${book.author ? `<p>${esc(words(opts.lang).by)} ${esc(book.author)}</p>` : ''}
</section>
${chapters.join('\n')}
</body>
</html>
`
}
