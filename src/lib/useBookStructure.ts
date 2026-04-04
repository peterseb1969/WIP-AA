import { useMemo } from 'react'
import { useDocuments, useCreateDocument } from '@wip/react'
import { NAMESPACE, TEMPLATES } from './constants'

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

export { TEMPLATES }
