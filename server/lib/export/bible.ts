/**
 * The story bible: everything the book knows besides its prose — characters
 * (with their relationships), locations, plot threads, world rules and notes
 * — as Markdown or as a print view (PDF). Empty fields are left out;
 * references to characters, locations and threads show their names, and
 * roles, types and statuses their vocabulary labels.
 */
import { bookClient, type BookTarget } from '../book-space.js'
import { esc } from './html.js'
import type { ExportLanguage } from './book.js'

export interface BibleEntry {
  name: string
  /** Role, type or status, as its label. */
  kind: string
  fields: Array<{ label: string; text: string }>
  /** Names of related entries, grouped ("Characters: Tuck, Bramble"). */
  links: Array<{ label: string; names: string[] }>
}

export interface BibleSection {
  title: string
  entries: BibleEntry[]
}

export interface Bible {
  title: string
  author: string
  sections: BibleSection[]
}

const L = {
  en: {
    bible: 'Story Bible', characters: 'Characters', locations: 'Locations', threads: 'Plot Threads', rules: 'World Rules', notes: 'Notes',
    age: 'Age', description: 'Description', personality: 'Personality', backstory: 'Backstory', goals: 'Goals', flaws: 'Flaws', voice: 'Voice', arc: 'Arc',
    relationships: 'Relationships', atmosphere: 'Atmosphere', rulesField: 'Rules', significance: 'Significance', notesField: 'Notes',
    opened: 'Opened in chapter', resolved: 'Resolved in chapter', domain: 'Domain', rule: 'Rule', implications: 'Implications', exceptions: 'Exceptions',
    content: 'Content', linkedCharacters: 'Characters', linkedLocations: 'Locations', linkedThreads: 'Plot threads', tags: 'Tags', by: 'by',
  },
  de: {
    bible: 'Story-Bibel', characters: 'Figuren', locations: 'Orte', threads: 'Handlungsstränge', rules: 'Weltregeln', notes: 'Notizen',
    age: 'Alter', description: 'Beschreibung', personality: 'Persönlichkeit', backstory: 'Vorgeschichte', goals: 'Ziele', flaws: 'Schwächen', voice: 'Stimme', arc: 'Entwicklung',
    relationships: 'Beziehungen', atmosphere: 'Atmosphäre', rulesField: 'Regeln', significance: 'Bedeutung', notesField: 'Notizen',
    opened: 'Eröffnet in Kapitel', resolved: 'Aufgelöst in Kapitel', domain: 'Bereich', rule: 'Regel', implications: 'Folgen', exceptions: 'Ausnahmen',
    content: 'Inhalt', linkedCharacters: 'Figuren', linkedLocations: 'Orte', linkedThreads: 'Handlungsstränge', tags: 'Schlagwörter', by: 'von',
  },
}

const VOCABULARIES = ['AA_CHARACTER_ROLE', 'AA_LOCATION_TYPE', 'AA_PLOT_THREAD_STATUS', 'AA_NOTE_TYPE', 'AA_RELATIONSHIP_TYPE', 'AA_CHARACTERS', 'AA_LOCATIONS', 'AA_PLOT_THREADS'] as const

type Data = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')
const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

export async function loadBible(target: BookTarget, lang: ExportLanguage): Promise<Bible> {
  const wip = bookClient(target)
  const w = L[lang]
  const [projects, structures, characters, locations, threads, rules, notes, ...vocabs] = await Promise.all([
    wip.active('AA_PROJECT', 5), wip.active('AA_BOOK_STRUCTURE', 5), wip.active('AA_CHARACTER', 1000), wip.active('AA_LOCATION', 1000), wip.active('AA_PLOT_THREAD', 1000),
    wip.active('AA_WORLD_RULE', 1000), wip.active('AA_NOTE', 1000),
    ...VOCABULARIES.map(async (v) => {
      const { status, json } = await wip.call('GET', `/api/def-store/terminologies/${target.namespace}:${v}/terms?namespace=${target.namespace}&page_size=1000`)
      if (status !== 200) throw new Error(`reading ${v}: HTTP ${status}`)
      return new Map(((json as { items?: Array<{ value: string; label?: string }> }).items ?? []).map((t) => [t.value, t.label || t.value]))
    }),
  ])
  const vocab = Object.fromEntries(VOCABULARIES.map((v, i) => [v, vocabs[i]!])) as Record<(typeof VOCABULARIES)[number], Map<string, string>>
  const label = (v: (typeof VOCABULARIES)[number], value: unknown) => vocab[v].get(str(value)) ?? str(value)
  const names = (v: (typeof VOCABULARIES)[number], values: unknown) => list(values).map((x) => label(v, x))
  const fields = (d: Data, pairs: Array<[string, string]>) => pairs.map(([key, l]) => ({ label: l, text: str(d[key]) })).filter((f) => f.text)
  const links = (pairs: Array<[string, string[]]>) => pairs.filter(([, n]) => n.length).map(([l, n]) => ({ label: l, names: n }))
  const byName = (a: BibleEntry, b: BibleEntry) => a.name.localeCompare(b.name, lang)
  // Characters by the order of their role vocabulary (protagonist first), then by name.
  const roleOrder = [...vocab.AA_CHARACTER_ROLE.keys()]

  const characterEntries = characters.map(({ data: d }) => ({
    role: str(d.role),
    entry: {
      name: str(d.name), kind: d.role ? label('AA_CHARACTER_ROLE', d.role) : '',
      fields: [
        ...fields(d, [['age', w.age], ['description', w.description], ['personality', w.personality], ['backstory', w.backstory], ['goals', w.goals], ['flaws', w.flaws], ['voice_notes', w.voice], ['arc_summary', w.arc]]),
        ...((d.relationships as Data[] | undefined)?.length ? [{
          label: w.relationships,
          text: (d.relationships as Data[]).map((r) => {
            const years = [str(r.start_time), str(r.end_time)]
            const when = years[0] || years[1] ? ` (${years[0]}–${years[1]})` : ''
            const type = r.relationship_type ? `, ${label('AA_RELATIONSHIP_TYPE', r.relationship_type).toLowerCase()}` : ''
            return `${label('AA_CHARACTERS', r.character)}${type}${when}${str(r.description) ? `: ${str(r.description)}` : ''}`
          }).join('\n'),
        }] : []),
      ],
      links: [],
    } as BibleEntry,
  }))
  characterEntries.sort((a, b) => {
    const ra = roleOrder.indexOf(a.role), rb = roleOrder.indexOf(b.role)
    return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb) || byName(a.entry, b.entry)
  })

  const sections: BibleSection[] = [
    { title: w.characters, entries: characterEntries.map((c) => c.entry) },
    {
      title: w.locations,
      entries: locations.map(({ data: d }) => ({
        name: str(d.name), kind: d.type ? label('AA_LOCATION_TYPE', d.type) : '',
        fields: fields(d, [['description', w.description], ['atmosphere', w.atmosphere], ['rules', w.rulesField], ['significance', w.significance]]),
        links: [],
      })).sort(byName),
    },
    {
      title: w.threads,
      entries: threads.map(({ data: d }) => ({
        name: label('AA_PLOT_THREADS', d.title), kind: d.status ? label('AA_PLOT_THREAD_STATUS', d.status) : '',
        fields: fields(d, [['description', w.description], ['opened_chapter', w.opened], ['resolved_chapter', w.resolved], ['notes', w.notesField]]),
        links: links([[w.linkedCharacters, names('AA_CHARACTERS', d.characters)]]),
      })).sort(byName),
    },
    {
      title: w.rules,
      entries: rules.map(({ data: d }) => ({
        name: str(d.name), kind: str(d.domain),
        fields: fields(d, [['rule', w.rule], ['implications', w.implications], ['exceptions', w.exceptions]]),
        links: links([[w.linkedCharacters, names('AA_CHARACTERS', d.related_characters)], [w.linkedLocations, names('AA_LOCATIONS', d.related_locations)]]),
      })).sort(byName),
    },
    {
      title: w.notes,
      entries: notes.map(({ data: d }) => ({
        name: str(d.title), kind: d.note_type ? label('AA_NOTE_TYPE', d.note_type) : '',
        fields: fields(d, [['content', w.content]]),
        links: links([
          [w.linkedCharacters, names('AA_CHARACTERS', d.linked_characters)], [w.linkedLocations, names('AA_LOCATIONS', d.linked_locations)],
          [w.linkedThreads, names('AA_PLOT_THREADS', d.linked_plot_threads)], [w.tags, list(d.tags)],
        ]),
      })).sort(byName),
    },
  ]

  // The title as the manuscript export takes it: the project's, else the structure's.
  const project = projects[0]?.data ?? {}
  const title = str(project.title) || str(structures[0]?.data.book_title)
  return { title, author: str(project.author), sections: sections.filter((s) => s.entries.length) }
}

const heading = (bible: Bible, lang: ExportLanguage) => (bible.title ? `${bible.title} — ${L[lang].bible}` : L[lang].bible)

export function toBibleMarkdown(bible: Bible, lang: ExportLanguage) {
  const md = (text: string) => text.replace(/([\\`*_~[\]<])/g, '\\$1')
  const out = [`# ${md(heading(bible, lang))}`]
  if (bible.author) out.push(`*${L[lang].by} ${md(bible.author)}*`)
  for (const section of bible.sections) {
    out.push(`## ${md(section.title)}`)
    for (const e of section.entries) {
      out.push(`### ${md(e.name)}${e.kind ? ` · ${md(e.kind)}` : ''}`)
      for (const f of e.fields) out.push(`**${md(f.label)}:** ${md(f.text).replace(/\n+/g, '  \n')}`)
      for (const l of e.links) out.push(`**${md(l.label)}:** ${l.names.map(md).join(', ')}`)
    }
  }
  return out.join('\n\n') + '\n'
}

export function toBiblePrintHtml(bible: Bible, lang: ExportLanguage) {
  const para = (text: string) => esc(text).replace(/\n+/g, '<br>')
  const sections = bible.sections.map((s) => [
    `<section><h2>${esc(s.title)}</h2>`,
    ...s.entries.map((e) => [
      `<article><h3>${esc(e.name)}${e.kind ? ` <span class="kind">${esc(e.kind)}</span>` : ''}</h3><dl>`,
      ...e.fields.map((f) => `<dt>${esc(f.label)}</dt><dd>${para(f.text)}</dd>`),
      ...e.links.map((l) => `<dt>${esc(l.label)}</dt><dd>${esc(l.names.join(', '))}</dd>`),
      '</dl></article>',
    ].join('')),
    '</section>',
  ].join('\n'))
  const print = lang === 'de' ? 'Drucken / Als PDF sichern' : 'Print / Save as PDF'

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(heading(bible, lang))}</title>
<style>
@page { size: A4; margin: 20mm 18mm 22mm; @bottom-center { content: counter(page); font: 9pt system-ui, sans-serif; color: #555; } }
body { font: 10.5pt/1.45 Georgia, 'Times New Roman', serif; color: #111; margin: 0; }
h1 { font-size: 22pt; font-weight: normal; margin: 0 0 0.2em; }
.by { margin: 0 0 2em; color: #444; }
h2 { font: 600 15pt system-ui, sans-serif; color: #2B579A; border-bottom: 1px solid #2B579A; padding-bottom: 0.2em; margin: 1.6em 0 0.8em; break-after: avoid; }
section + section { break-before: page; }
article { break-inside: avoid; margin: 0 0 1.2em; }
h3 { font: 600 12pt system-ui, sans-serif; margin: 0 0 0.3em; break-after: avoid; }
.kind { font-weight: normal; font-size: 9.5pt; color: #2B579A; background: #eaf0f8; border-radius: 3px; padding: 0.05em 0.45em; margin-left: 0.3em; }
dl { display: grid; grid-template-columns: 9em 1fr; gap: 0.2em 1em; margin: 0; }
dt { font: 600 9pt system-ui, sans-serif; color: #555; padding-top: 0.15em; }
dd { margin: 0; }
.toolbar { display: none; }
@media screen {
  html { background: #eef0f3; }
  body { max-width: 46em; margin: 0 auto 4em; padding: 3em; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.12); }
  .toolbar { display: flex; position: sticky; top: 0; margin: -3em -3em 2em; padding: 0.8em 3em; background: #2B579A; }
  .toolbar button { font: 600 14px system-ui, sans-serif; padding: 0.45em 1em; border: 0; border-radius: 6px; background: #fff; color: #2B579A; cursor: pointer; }
}
@media (max-width: 600px) { dl { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="toolbar"><button type="button" onclick="window.print()">${esc(print)}</button></div>
<h1>${esc(heading(bible, lang))}</h1>
${bible.author ? `<p class="by">${esc(L[lang].by)} ${esc(bible.author)}</p>` : ''}
${sections.join('\n')}
</body>
</html>
`
}
