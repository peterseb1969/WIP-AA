/**
 * Scene analysis with the writer's prompt library (AA_PROMPT documents).
 *
 * A prompt names which parts of the book to send (`context`, terms from
 * AA_PROMPT_CONTEXT) plus a system prompt and a user prompt. The browser
 * renders the context from what the scene editor already has loaded —
 * including unsaved prose — and the server only forwards it to Claude.
 */

export interface PromptData {
  name: string
  description?: string
  context?: string[]
  system_prompt: string
  user_prompt: string
}

type Doc = Record<string, unknown>

export interface SceneContextSources {
  scene: Doc
  /** Current editor text — may be newer than the saved prose. */
  proseText: string
  characters: Doc[]
  location?: Doc
  plotThreads: Doc[]
  worldRules: Doc[]
  chapter?: Doc
  prevScene?: Doc
  nextScene?: Doc
}

const LANGUAGE_RULE = 'Answer in the language the manuscript is written in.'

export const STARTER_PROMPTS: PromptData[] = [
  {
    name: 'Continuity Check',
    description: 'Contradictions with characters, places, world rules and the neighbouring scenes',
    context: ['SCENE_PROSE', 'SCENE_DETAILS', 'CHARACTERS', 'LOCATION', 'WORLD_RULES', 'ADJACENT_SCENES'],
    system_prompt: `You are a meticulous continuity editor for a novel. Compare the scene against the reference material and point out concrete contradictions: facts about characters, places, timing, objects, and the world's rules. Quote the passage for each issue and say what it conflicts with. Do not comment on style. If you find nothing, say so. ${LANGUAGE_RULE}`,
    user_prompt: '{{context}}\n\nCheck the scene "{{scene_title}}" for continuity problems.',
  },
  {
    name: 'Character Voice',
    description: 'Does each character sound like themselves?',
    context: ['SCENE_PROSE', 'CHARACTERS'],
    system_prompt: `You are a developmental editor focused on characterisation. For each character who speaks or acts in the scene, judge whether their dialogue and behaviour fit their profile (personality, voice notes, goals, flaws). Quote lines that feel off and suggest how they could sound more like the character. ${LANGUAGE_RULE}`,
    user_prompt: '{{context}}\n\nReview the character voices in "{{scene_title}}".',
  },
  {
    name: 'Style Polish',
    description: 'Line-level suggestions: rhythm, repetition, clarity',
    context: ['SCENE_PROSE'],
    system_prompt: `You are a line editor. Suggest the ten most valuable improvements to the prose: rhythm, repetition, clarity, filter words, weak verbs. For each, quote the original and give a revised version. Keep the author's voice; do not rewrite the scene. ${LANGUAGE_RULE}`,
    user_prompt: '{{context}}\n\nPolish the prose of "{{scene_title}}".',
  },
  {
    name: 'Plot Intelligence',
    description: 'What the scene does for the plot threads and the chapter',
    context: ['SCENE_PROSE', 'SCENE_DETAILS', 'PLOT_THREADS', 'CHAPTER', 'ADJACENT_SCENES'],
    system_prompt: `You are a story editor. Explain what this scene contributes: which plot threads it advances or neglects, what changes for the characters, how it connects to the scenes before and after, and whether its purpose in the chapter is clear. End with up to three concrete suggestions. ${LANGUAGE_RULE}`,
    user_prompt: '{{context}}\n\nAnalyse the role of "{{scene_title}}" in the story.',
  },
]

/** Render a document's fields as "label: value" lines, skipping empties. */
function fields(doc: Doc | undefined, keys: string[]): string {
  if (!doc) return ''
  return keys
    .map((k) => {
      const v = doc[k]
      if (v == null || v === '' || (Array.isArray(v) && !v.length)) return null
      return `${k.replace(/_/g, ' ')}: ${Array.isArray(v) ? v.join(', ') : String(v)}`
    })
    .filter(Boolean)
    .join('\n')
}

const SECTIONS: Record<string, (s: SceneContextSources) => string> = {
  SCENE_DETAILS: (s) => fields(s.scene, ['title', 'event_type', 'story_time_raw', 'location', 'characters', 'plot_threads', 'summary', 'emotional_beat']),
  SCENE_PROSE: (s) => s.proseText.trim(),
  CHARACTERS: (s) => s.characters
    .map((c) => fields(c, ['name', 'role', 'age', 'description', 'personality', 'goals', 'flaws', 'voice_notes', 'arc_summary']))
    .join('\n\n'),
  LOCATION: (s) => fields(s.location, ['name', 'type', 'description', 'atmosphere', 'rules', 'significance']),
  PLOT_THREADS: (s) => s.plotThreads.map((t) => fields(t, ['title', 'status', 'description', 'notes'])).join('\n\n'),
  WORLD_RULES: (s) => s.worldRules.map((r) => fields(r, ['name', 'domain', 'rule', 'implications', 'exceptions'])).join('\n\n'),
  CHAPTER: (s) => fields(s.chapter, ['title', 'summary', 'status', 'pov_character', 'themes']),
  ADJACENT_SCENES: (s) => [
    s.prevScene ? `Previous scene:\n${fields(s.prevScene, ['title', 'summary'])}` : 'Previous scene: none (start of chapter)',
    s.nextScene ? `Next scene:\n${fields(s.nextScene, ['title', 'summary'])}` : 'Next scene: none (end of chapter)',
  ].join('\n\n'),
}

const SECTION_TITLES: Record<string, string> = {
  SCENE_DETAILS: 'SCENE DETAILS',
  SCENE_PROSE: 'SCENE TEXT',
  CHARACTERS: 'CHARACTERS IN THE SCENE',
  LOCATION: 'LOCATION',
  PLOT_THREADS: 'PLOT THREADS IN THE SCENE',
  WORLD_RULES: 'WORLD RULES',
  CHAPTER: 'CHAPTER',
  ADJACENT_SCENES: 'NEIGHBOURING SCENES',
}

/**
 * The user message for a prompt: its user_prompt with {{context}} and
 * {{scene_title}} filled in. Without a {{context}} placeholder the context
 * goes first.
 */
export function buildUserMessage(prompt: PromptData, sources: SceneContextSources): string {
  const context = (prompt.context ?? [])
    .map((key) => {
      const body = SECTIONS[key]?.(sources)
      return body ? `=== ${SECTION_TITLES[key] ?? key} ===\n${body}` : null
    })
    .filter(Boolean)
    .join('\n\n')
  const title = String(sources.scene.title ?? '')
  const user = prompt.user_prompt.replaceAll('{{scene_title}}', title)
  return user.includes('{{context}}')
    ? user.replaceAll('{{context}}', context)
    : [context, user].filter(Boolean).join('\n\n')
}

export async function runAnalysis(system: string, user: string): Promise<string> {
  const res = await fetch(`${import.meta.env.BASE_URL}api/analyse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, user }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Analysis failed (HTTP ${res.status})`)
  return body.text as string
}
