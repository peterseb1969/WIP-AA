/**
 * The book structure (chapter order, scenes per chapter, chapter numbering)
 * as plain functions, without React or WIP: the app's hooks build on it
 * (useBookStructure.ts), and the server's export uses the same numbering.
 */

export interface ChapterSlot {
  chapter_id: string
  scene_ids: string[]
  /** Numbering restarts at this number here (and counts on from it). */
  number_start?: number | null
  /** This chapter has no number (prologue, interlude, epilogue); the count skips it. */
  unnumbered?: boolean | null
}

/** A chapter's numbering rule, as the Numbering dialog offers it. */
export type NumberingRule = { kind: 'continue' } | { kind: 'start'; number: number } | { kind: 'none' }

export function ruleOf(slot: ChapterSlot): NumberingRule {
  if (slot.unnumbered) return { kind: 'none' }
  if (slot.number_start != null) return { kind: 'start', number: slot.number_start }
  return { kind: 'continue' }
}

export interface BookStructureData {
  book_title: string
  chapters: ChapterSlot[]
}

export interface BookStructure {
  raw: BookStructureData
  /** Chapter count */
  chapterCount: number
  /** Total scene count across all chapters */
  sceneCount: number
  /**
   * 1-based POSITION of a chapter in the book. For ordering, grouping and
   * filtering; what the writer sees is getDisplayNumber.
   */
  getChapterNumber(chapterId: string): number | undefined
  /** Get chapter_id and indices for a scene document_id */
  getScenePosition(sceneId: string): { chapterIndex: number; sceneIndex: number; chapterId: string } | undefined
  /** Get chapter_id that contains a scene */
  getChapterForScene(sceneId: string): string | undefined
  /** 1-based POSITION of the chapter containing a scene (see getChapterNumber). */
  getChapterNumberForScene(sceneId: string): number | undefined
  /**
   * The chapter's number as shown: counted in book order, restarting where a
   * chapter sets number_start, skipping unnumbered chapters. null = no
   * number; undefined = not in the structure.
   */
  getDisplayNumber(chapterId: string): number | null | undefined
  /** Display number of the chapter containing a scene. */
  getDisplayNumberForScene(sceneId: string): number | null | undefined
  /** Get ordered scene_ids for a chapter document_id */
  getScenesForChapter(chapterId: string): string[]
  /** Get all chapter_ids in order */
  getChapterIds(): string[]
  /** Get all scene_ids in order (flat) */
  getAllSceneIds(): string[]
  /**
   * The scene before or after a scene in reading order, across chapter
   * boundaries (empty chapters are skipped), and the chapter it is in.
   * undefined at the start or end of the book, or for a scene in no chapter.
   */
  getSceneInReadingOrder(sceneId: string, direction: 'prev' | 'next'): { sceneId: string; chapterId: string } | undefined
}

export function buildStructure(data: BookStructureData): BookStructure {
  // Build reverse lookup maps
  const chapterIndexMap = new Map<string, number>()
  const scenePositionMap = new Map<string, { chapterIndex: number; sceneIndex: number; chapterId: string }>()

  const readingOrder: Array<{ sceneId: string; chapterId: string }> = []

  const displayNumbers = new Map<string, number | null>()
  let next = 1
  data.chapters.forEach((slot, ci) => {
    if (slot.unnumbered) {
      displayNumbers.set(slot.chapter_id, null)
    } else {
      if (slot.number_start != null) next = slot.number_start
      displayNumbers.set(slot.chapter_id, next++)
    }
    chapterIndexMap.set(slot.chapter_id, ci)
    slot.scene_ids.forEach((sid, si) => {
      scenePositionMap.set(sid, { chapterIndex: ci, sceneIndex: si, chapterId: slot.chapter_id })
      readingOrder.push({ sceneId: sid, chapterId: slot.chapter_id })
    })
  })

  return {
    raw: data,
    chapterCount: data.chapters.length,
    sceneCount: data.chapters.reduce((sum, ch) => sum + ch.scene_ids.length, 0),
    getChapterNumber: (id) => {
      const idx = chapterIndexMap.get(id)
      return idx !== undefined ? idx + 1 : undefined
    },
    getScenePosition: (id) => scenePositionMap.get(id),
    getChapterForScene: (id) => scenePositionMap.get(id)?.chapterId,
    getChapterNumberForScene: (id) => {
      const pos = scenePositionMap.get(id)
      return pos !== undefined ? pos.chapterIndex + 1 : undefined
    },
    getDisplayNumber: (id) => displayNumbers.get(id),
    getDisplayNumberForScene: (id) => {
      const pos = scenePositionMap.get(id)
      return pos !== undefined ? displayNumbers.get(pos.chapterId) : undefined
    },
    getScenesForChapter: (id) => {
      const idx = chapterIndexMap.get(id)
      return idx !== undefined ? data.chapters[idx]!.scene_ids : []
    },
    getChapterIds: () => data.chapters.map((s) => s.chapter_id),
    getAllSceneIds: () => data.chapters.flatMap((s) => s.scene_ids),
    getSceneInReadingOrder: (id, direction) => {
      const idx = readingOrder.findIndex((s) => s.sceneId === id)
      if (idx < 0) return undefined
      return readingOrder[idx + (direction === 'prev' ? -1 : 1)]
    },
  }
}
