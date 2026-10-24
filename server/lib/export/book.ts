/**
 * The book as every export sees it: title page data and the chapters in
 * reading order, numbered as the app shows them, each with its scenes'
 * prose as blocks. Scenes in no chapter (backstory events) are not part of
 * the manuscript and are left out.
 */
import { buildStructure, type BookStructureData } from '../../../src/lib/bookStructure'
import { chapterTitleShown, sceneTitleShown } from '../../../src/lib/titles'
import { bookClient, type BookTarget } from '../book-space.js'
import { parseProse, type Block } from './prose.js'

export type ExportLanguage = 'en' | 'de'

export interface ExportScene {
  /** As shown in the app: an imported "Ch2 Scene 1" without its "Ch2". */
  title: string
  blocks: Block[]
}

export interface ExportChapter {
  /** The displayed number; null for an unnumbered chapter (prologue, interlude, epilogue). */
  number: number | null
  /** '' when the stored title is only a number ("Chapter 5"). */
  title: string
  scenes: ExportScene[]
}

export interface ExportBook {
  title: string
  author: string
  chapters: ExportChapter[]
}

const WORDS: Record<ExportLanguage, { chapter: string; untitled: string; by: string; book: string }> = {
  en: { chapter: 'Chapter', untitled: 'Untitled chapter', by: 'by', book: 'Untitled book' },
  de: { chapter: 'Kapitel', untitled: 'Unbenanntes Kapitel', by: 'von', book: 'Unbenanntes Buch' },
}

export const words = (lang: ExportLanguage) => WORDS[lang]

/** "Chapter 5: Low Water", "Chapter 5", "Prologue", or "Untitled chapter". */
export function chapterHeading(chapter: ExportChapter, lang: ExportLanguage) {
  if (chapter.number == null) return chapter.title || WORDS[lang].untitled
  const label = `${WORDS[lang].chapter} ${chapter.number}`
  return chapter.title ? `${label}: ${chapter.title}` : label
}

/** A file name for the book: its title, lower case, dashes for anything else. */
export function fileStem(book: Pick<ExportBook, 'title'>) {
  return book.title.replace(/ß/g, 'ss').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'book'
}

// One query per template; a book has far fewer chapters and scenes than this.
const PAGE = 1000

export async function loadBook(target: BookTarget, lang: ExportLanguage): Promise<ExportBook> {
  const wip = bookClient(target)
  const [projects, structures, chapterDocs, sceneDocs] = await Promise.all([
    wip.active('AA_PROJECT', 5),
    wip.active('AA_BOOK_STRUCTURE', 5),
    wip.active('AA_CHAPTER', PAGE),
    wip.active('AA_EVENT', PAGE),
  ])
  const project = projects[0]?.data ?? {}
  const structureData = structures[0]?.data as unknown as BookStructureData | undefined
  const chapterById = new Map(chapterDocs.map((d) => [d.document_id, d.data]))
  const sceneById = new Map(sceneDocs.map((d) => [d.document_id, d.data]))

  const chapters: ExportChapter[] = []
  if (structureData) {
    const structure = buildStructure(structureData)
    for (const slot of structureData.chapters) {
      const chapter = chapterById.get(slot.chapter_id)
      if (!chapter) continue
      chapters.push({
        number: structure.getDisplayNumber(slot.chapter_id) ?? null,
        title: chapterTitleShown(chapter.title as string),
        scenes: slot.scene_ids.flatMap((id) => {
          const scene = sceneById.get(id)
          return scene ? [{ title: sceneTitleShown(scene.title as string), blocks: parseProse(scene.prose as string) }] : []
        }),
      })
    }
  }

  return {
    title: String(project.title || structureData?.book_title || '').trim() || WORDS[lang].book,
    author: String(project.author ?? '').trim(),
    chapters,
  }
}
