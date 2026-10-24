import { useMemo } from 'react'
import { useDocuments, useCreateDocument, useUpdateDocument } from '@wip/react'
import { NAMESPACE, TEMPLATES } from './constants'
import { useStructureUndo } from './structureUndo'
import { buildStructure, type BookStructureData, type ChapterSlot, type NumberingRule } from './bookStructure'

export { buildStructure, ruleOf, type BookStructure, type BookStructureData, type ChapterSlot, type NumberingRule } from './bookStructure'

export function useBookStructure() {
  const { data: docs, isLoading, error, refetch } = useDocuments({
    template_id: TEMPLATES.BOOK_STRUCTURE,
    namespace: NAMESPACE,
    status: 'active',
  })

  const structure = useMemo(() => {
    if (!docs?.items?.length) return undefined
    const doc = docs.items[0]!
    return buildStructure(doc.data as unknown as BookStructureData)
  }, [docs])

  const structureDocId = docs?.items?.[0]?.document_id as string | undefined

  return { structure, structureDocId, isLoading, error, refetch }
}

/**
 * Where a chapter dropped on chapter `overId` goes, given the chapter order
 * `ids`: the id it is inserted before, null for the end of the book, or
 * undefined when the drop would leave the order unchanged.
 */
export function chapterDropBefore(ids: string[], draggedId: string, overId: string, upperHalf: boolean) {
  const over = ids.indexOf(overId)
  if (over < 0) return undefined
  const before = upperHalf ? overId : ids[over + 1] ?? null
  const from = ids.indexOf(draggedId)
  if (before === draggedId || before === (ids[from + 1] ?? null)) return undefined
  return before
}

/**
 * The number `draggedId` will show after moving before `before` (null = the
 * end), with the book's numbering rules applied; null when it is unnumbered.
 */
export function displayNumberAfterMove(chapters: ChapterSlot[], draggedId: string, before: string | null) {
  const moving = chapters.find((slot) => slot.chapter_id === draggedId)
  if (!moving) return undefined
  const rest = chapters.filter((slot) => slot.chapter_id !== draggedId)
  const at = before ? rest.findIndex((slot) => slot.chapter_id === before) : -1
  rest.splice(at >= 0 ? at : rest.length, 0, moving)
  return buildStructure({ book_title: '', chapters: rest }).getDisplayNumber(draggedId)
}

const copySlots = (chapters: ChapterSlot[]) => chapters.map((slot) => ({ ...slot, scene_ids: [...slot.scene_ids] }))

/**
 * `chapters` with a scene moved into `chapterId` — before `beforeId`, or at
 * the end when it is null or not in that chapter. A chapter missing from the
 * structure is appended. The input is not modified.
 */
export function withSceneMoved(chapters: ChapterSlot[], sceneId: string, chapterId: string, beforeId: string | null): ChapterSlot[] {
  const next = copySlots(chapters).map((slot) => ({ ...slot, scene_ids: slot.scene_ids.filter((id) => id !== sceneId) }))
  let target = next.find((slot) => slot.chapter_id === chapterId)
  if (!target) {
    target = { chapter_id: chapterId, scene_ids: [] }
    next.push(target)
  }
  const at = beforeId ? target.scene_ids.indexOf(beforeId) : -1
  target.scene_ids.splice(at >= 0 ? at : target.scene_ids.length, 0, sceneId)
  return next
}

/**
 * `chapters` with a chapter (and its scenes) moved before `beforeId`, or to
 * the end. undefined when the chapter is not in the structure or the order
 * would not change.
 */
export function withChapterMoved(chapters: ChapterSlot[], chapterId: string, beforeId: string | null): ChapterSlot[] | undefined {
  const moving = chapters.find((slot) => slot.chapter_id === chapterId)
  if (!moving || chapterId === beforeId) return undefined
  const next = copySlots(chapters).filter((slot) => slot.chapter_id !== chapterId)
  const at = beforeId ? next.findIndex((slot) => slot.chapter_id === beforeId) : -1
  next.splice(at >= 0 ? at : next.length, 0, { ...moving, scene_ids: [...moving.scene_ids] })
  return next.every((slot, i) => slot.chapter_id === chapters[i]!.chapter_id) ? undefined : next
}

/** `chapters` without a scene (scene merge). */
export function withSceneRemoved(chapters: ChapterSlot[], sceneId: string): ChapterSlot[] {
  return copySlots(chapters).map((slot) => ({ ...slot, scene_ids: slot.scene_ids.filter((id) => id !== sceneId) }))
}

/**
 * `chapters` with one chapter's numbering rule set. The `chapters` array is
 * replaced whole by the PATCH, so leaving the fields out of a slot clears them.
 */
export function withNumbering(chapters: ChapterSlot[], chapterId: string, rule: NumberingRule): ChapterSlot[] {
  return copySlots(chapters).map((slot) => {
    if (slot.chapter_id !== chapterId) return slot
    const { number_start: _n, unnumbered: _u, ...rest } = slot
    if (rule.kind === 'start') return { ...rest, number_start: rule.number }
    if (rule.kind === 'none') return { ...rest, unnumbered: true }
    return rest
  })
}

/** Hook to get the createDocument mutator for updating the structure */
export function useUpdateStructure() {
  return useCreateDocument()
}

/**
 * Edits to the book structure (chapter order and each chapter's scenes).
 *
 * Writes are a merge PATCH of `chapters` on the existing AA_BOOK_STRUCTURE
 * document. A book that has none yet (no import was ever run) gets one
 * created on the first edit, titled after the project. Chapters that exist
 * as documents but are missing from the structure (created on the Chapters
 * page before chapters were added to it) are appended when first used.
 * Scene and chapter moves are recorded for undo (see structureUndo.tsx).
 */
export function useStructureEditor() {
  const { structure, structureDocId } = useBookStructure()
  const { data: projects } = useDocuments({ template_id: TEMPLATES.PROJECT, status: 'active', namespace: NAMESPACE })
  const createDoc = useCreateDocument()
  const updateDoc = useUpdateDocument()
  const undo = useStructureUndo()

  /** Write `chapters`; returns the structure document and its new version. */
  const save = async (chapters: ChapterSlot[]) => {
    const result = structureDocId
      ? await updateDoc.mutateAsync({ documentId: structureDocId, patch: { chapters } })
      : await createDoc.mutateAsync({
          template_id: TEMPLATES.BOOK_STRUCTURE,
          namespace: NAMESPACE,
          data: {
            book_title: (projects?.items?.[0]?.data as { title?: string } | undefined)?.title || 'Book',
            chapters,
          },
        })
    return { documentId: result.document_id ?? structureDocId, version: result.version }
  }

  const currentChapters = () =>
    (structure?.raw.chapters ?? []).map((slot) => ({ ...slot, scene_ids: [...slot.scene_ids] }))

  /**
   * Move a scene into `chapterId` — before `beforeId`, or at the end — and
   * offer undo with `label` as the notice text.
   */
  const moveScene = async (sceneId: string, chapterId: string, beforeId: string | null, label: string) => {
    if (sceneId === beforeId) return
    const previous = currentChapters()
    const saved = await save(withSceneMoved(previous, sceneId, chapterId, beforeId))
    if (saved.documentId && saved.version != null) {
      undo?.record({ label, documentId: saved.documentId, previous, version: saved.version })
    }
  }

  /**
   * Move a chapter (with its scenes) before `beforeId`, or to the end, and
   * offer undo with `label`. Chapter numbers are positions, so every
   * chapter from the old to the new position is renumbered by this.
   */
  const moveChapter = async (chapterId: string, beforeId: string | null, label: string) => {
    const previous = currentChapters()
    const chapters = withChapterMoved(previous, chapterId, beforeId)
    if (!chapters) return
    const saved = await save(chapters)
    if (saved.documentId && saved.version != null) {
      undo?.record({ label, documentId: saved.documentId, previous, version: saved.version })
    }
  }

  /**
   * Take a scene out of the structure (used by scene merge). Returns what
   * undo needs; the caller records the undo entry, which spans documents.
   */
  const removeScene = async (sceneId: string) => {
    const previous = currentChapters()
    const saved = await save(withSceneRemoved(previous, sceneId))
    return { previous, documentId: saved.documentId, version: saved.version }
  }

  /**
   * Set a chapter's numbering rule (Numbering dialog). Numbers are computed,
   * so this one slot changes and every later number follows; undoable like
   * a move.
   */
  const setNumbering = async (chapterId: string, rule: NumberingRule, label: string) => {
    const previous = currentChapters()
    const saved = await save(withNumbering(previous, chapterId, rule))
    if (saved.documentId && saved.version != null) {
      undo?.record({ label, documentId: saved.documentId, previous, version: saved.version })
    }
  }

  /** Append a chapter (no-op if it is already in the structure). */
  const addChapter = (chapterId: string) => {
    const chapters = currentChapters()
    if (chapters.some((slot) => slot.chapter_id === chapterId)) return Promise.resolve()
    return save([...chapters, { chapter_id: chapterId, scene_ids: [] }]).then(() => undefined)
  }

  return { moveScene, moveChapter, setNumbering, removeScene, addChapter, isSaving: createDoc.isPending || updateDoc.isPending }
}

export { TEMPLATES }
