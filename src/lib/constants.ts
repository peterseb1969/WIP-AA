/** WIP namespace for this book */
export const NAMESPACE = 'aa'

/** Template IDs — from Phase 3 implementation */
export const TEMPLATES = {
  PROJECT: '019d44bf-8ddf-74fd-9899-d208c3fa6309',
  CHARACTER: '019d44bf-fd49-7f01-8895-523eaffc2f90',
  CHAR_REL: '019d44bf-e5da-71e2-8a8d-45a5582639ca',
  LOCATION: '019d44bf-8de0-7389-b904-e44940f3d6a6',
  CHAPTER: '019d44bf-8de1-7f3a-8395-62e479b676be',
  EVENT: '019d44bf-8de2-7742-88d8-55997e7d37e3',
  PLOT_THREAD: '019d44bf-8de2-7e98-af76-9fc6850455a3',
  NOTE: '019d44bf-8de3-7afd-bc72-4fcc52522603',
  WORLD_RULE: '019d44bf-8de3-7bd0-a87a-b2475e6dae36',
} as const

/** Template values — for useTemplateByValue queries */
export const TEMPLATE_VALUES = {
  PROJECT: 'AA_PROJECT',
  CHARACTER: 'AA_CHARACTER',
  CHAR_REL: 'AA_CHAR_REL',
  LOCATION: 'AA_LOCATION',
  CHAPTER: 'AA_CHAPTER',
  EVENT: 'AA_EVENT',
  PLOT_THREAD: 'AA_PLOT_THREAD',
  NOTE: 'AA_NOTE',
  WORLD_RULE: 'AA_WORLD_RULE',
} as const

/** Terminology IDs — from Phase 3 implementation */
export const TERMINOLOGIES = {
  CHARACTER_ROLE: '019d44bd-aa82-799f-b4c1-fd89342e27bd',
  LOCATION_TYPE: '019d44bd-aaab-7ec2-8092-e0a49179b079',
  EVENT_TYPE: '019d44bd-aac3-7902-b1bc-ab466750d3ec',
  CHAPTER_STATUS: '019d44bd-aad8-7f61-b7ef-37b79c77c16b',
  PLOT_THREAD_STATUS: '019d44bd-aaea-7815-81b0-f5928bfe2246',
  RELATIONSHIP_TYPE: '019d44bd-aafe-70b0-be28-f7264bf66f98',
  NOTE_TYPE: '019d44bd-ab13-75d2-bc41-68f929b607ed',
  TIME_SYSTEM: '019d44bd-ab2a-7020-b810-da28cac1643e',
  GENRE: '019d44bd-ab3c-708e-9eae-40a6279d4c7a',
  CHARACTERS: '019d44bd-ab4f-7974-86f4-32c512e1035a',
  LOCATIONS: '019d44bd-ab61-746f-b91a-e2ed65ea29ce',
  PLOT_THREADS: '019d44bd-ab79-7ad9-a53a-ed5982e99b6f',
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
  MINOR: 'bg-gray-200 text-gray-700',
  MENTIONED: 'bg-gray-100 text-gray-500',
}
