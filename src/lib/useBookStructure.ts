import { useMemo } from 'react'
import { useDocuments, useCreateDocument, useUpdateDocument } from '@wip/react'
import { NAMESPACE, TEMPLATES } from './constants'
import { useStructureUndo } from './structureUndo'

export interface ChapterSlot {
  chapter_id: string
  scene_ids: string[]
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
  /** Get 1-based chapter number for a chapter document_id */
  getChapterNumber(chapterId: string): number | undefined
  /** Get chapter_id and indices for a scene document_id */
  getScenePosition(sceneId: string): { chapterIndex: number; sceneIndex: number; chapterId: string } | undefined
  /** Get chapter_id that contains a scene */
  getChapterForScene(sceneId: string): string | undefined
  /** Get 1-based chapter number for a scene */
  getChapterNumberForScene(sceneId: string): number | undefined
  /** Get ordered scene_ids for a chapter document_id */
  getScenesForChapter(chapterId: string): string[]
  /** Get all chapter_ids in order */
  getChapterIds(): string[]
  /** Get all scene_ids in order (flat) */
  getAllSceneIds(): string[]
}

function buildStructure(data: BookStructureData): BookStructure {
  // Build reverse lookup maps
  const chapterIndexMap = new Map<string, number>()
  const scenePositionMap = new Map<string, { chapterIndex: number; sceneIndex: number; chapterId: string }>()

  data.chapters.forEach((slot, ci) => {
    chapterIndexMap.set(slot.chapter_id, ci)
    slot.scene_ids.forEach((sid, si) => {
      scenePositionMap.set(sid, { chapterIndex: ci, sceneIndex: si, chapterId: slot.chapter_id })
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
    getScenesForChapter: (id) => {
      const idx = chapterIndexMap.get(id)
      return idx !== undefined ? data.chapters[idx]!.scene_ids : []
    },
    getChapterIds: () => data.chapters.map((s) => s.chapter_id),
    getAllSceneIds: () => data.chapters.flatMap((s) => s.scene_ids),
  }
}

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
 * Scene moves are recorded for undo (see structureUndo.tsx).
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
    const chapters = currentChapters().map((slot) => ({
      ...slot,
      scene_ids: slot.scene_ids.filter((id) => id !== sceneId),
    }))
    let target = chapters.find((slot) => slot.chapter_id === chapterId)
    if (!target) {
      target = { chapter_id: chapterId, scene_ids: [] }
      chapters.push(target)
    }
    const at = beforeId ? target.scene_ids.indexOf(beforeId) : -1
    target.scene_ids.splice(at >= 0 ? at : target.scene_ids.length, 0, sceneId)
    const saved = await save(chapters)
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

  return { moveScene, addChapter, isSaving: createDoc.isPending || updateDoc.isPending }
}

export { TEMPLATES }
