/**
 * WIP namespace for this book. Served by the server's /api/app-config and
 * set by main.tsx before first render — every read happens inside a
 * component or hook, so importers always see the configured value (ES
 * module live binding). Empty until then.
 */
export let NAMESPACE = ''

export function setNamespace(ns: string) {
  NAMESPACE = ns
}

/** Template values (synonyms) — stable across bootstrap */
export const TEMPLATES = {
  PROJECT: 'AA_PROJECT',
  CHARACTER: 'AA_CHARACTER',
  CHAR_REL: 'AA_CHAR_REL',
  LOCATION: 'AA_LOCATION',
  CHAPTER: 'AA_CHAPTER',
  EVENT: 'AA_EVENT',
  PLOT_THREAD: 'AA_PLOT_THREAD',
  NOTE: 'AA_NOTE',
  WORLD_RULE: 'AA_WORLD_RULE',
  BOOK_STRUCTURE: 'AA_BOOK_STRUCTURE',
  CHAPTER_SLOT: 'AA_CHAPTER_SLOT',
  PROMPT: 'AA_PROMPT',
  MEDIA: 'AA_MEDIA',
  /** Edge type: media → the entity it is attached to */
  ATTACHED_TO: 'AA_ATTACHED_TO',
} as const

/** Terminology values (synonyms) — stable across bootstrap */
export const TERMINOLOGIES = {
  CHARACTER_ROLE: 'AA_CHARACTER_ROLE',
  LOCATION_TYPE: 'AA_LOCATION_TYPE',
  EVENT_TYPE: 'AA_EVENT_TYPE',
  CHAPTER_STATUS: 'AA_CHAPTER_STATUS',
  PLOT_THREAD_STATUS: 'AA_PLOT_THREAD_STATUS',
  RELATIONSHIP_TYPE: 'AA_RELATIONSHIP_TYPE',
  NOTE_TYPE: 'AA_NOTE_TYPE',
  TIME_SYSTEM: 'AA_TIME_SYSTEM',
  GENRE: 'AA_GENRE',
  CHARACTERS: 'AA_CHARACTERS',
  LOCATIONS: 'AA_LOCATIONS',
  PLOT_THREADS: 'AA_PLOT_THREADS',
  PROMPT_CONTEXT: 'AA_PROMPT_CONTEXT',
  MEDIA_ROLE: 'AA_MEDIA_ROLE',
} as const

/** Status colors for chapter status badges */
export const CHAPTER_STATUS_COLORS: Record<string, string> = {
  OUTLINE: 'bg-gray-200 text-gray-700',
  DRAFT: 'bg-amber-100 text-amber-800',
  REVISED: 'bg-blue-100 text-blue-800',
  FINAL: 'bg-green-100 text-green-800',
}

/** Status colors for plot thread status badges */
export const THREAD_STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  DEVELOPING: 'bg-amber-100 text-amber-800',
  CLIMAX: 'bg-red-100 text-red-800',
  RESOLVED: 'bg-green-100 text-green-800',
  ABANDONED: 'bg-gray-200 text-gray-700',
}

/** Character role colors */
export const ROLE_COLORS: Record<string, string> = {
  PROTAGONIST: 'bg-primary/10 text-primary',
  DEUTERAGONIST: 'bg-accent/10 text-accent',
  ANTAGONIST: 'bg-red-100 text-red-800',
  SUPPORTING: 'bg-blue-100 text-blue-800',
  NARRATOR: 'bg-violet-100 text-violet-800',
  MINOR: 'bg-gray-200 text-gray-700',
  MENTIONED: 'bg-gray-100 text-gray-500',
}
