import Anthropic from '@anthropic-ai/sdk'
import { anthropicKey } from './lib/anthropic-key.js'

// ── Types ────────────────────────────────────────────────

export interface ParsedScene {
  sceneOrder: number
  title: string
  prose: string
}

/** `front`: text before the first heading (a title page, an unheaded prologue). */
export type ChapterKind = 'chapter' | 'prologue' | 'interlude' | 'epilogue' | 'front'

export interface ParsedChapter {
  /** Position in the manuscript (0, 1, …): unique, unlike `number`. */
  key: number
  /** The number in the heading; null for a prologue, interlude, epilogue or front matter. */
  number: number | null
  kind: ChapterKind
  title: string
  scenes: ParsedScene[]
}

export interface ExtractedEntities {
  characters: Array<{
    name: string
    role: string
    description: string
  }>
  locations: Array<{
    name: string
    type: string
    atmosphere: string
  }>
  plotThreads: Array<{
    title: string
    description: string
  }>
  summary: string
}

// ── Parse: split text into chapters and scenes ───────────

const CHAPTER_RE =
  /^(?:(?:chapter|kapitel)\s+(\d+|[ivxlcdm]+)(?:\s*[:\-–—.]\s*(.*))?|#{1,2}\s+(?:(?:chapter|kapitel)\s+)?(\d+|[ivxlcdm]+)(?:\s*[:\-–—.]\s*(.*))?)$/im

// Unnumbered parts of a book, English and German: "Prologue", "Interlude: The
// Bell", "## Epilog". Only a line that is nothing but the heading counts.
const UNNUMBERED_RE =
  /^\s*(?:#{1,2}\s+)?(prologue|prolog|interlude|zwischenspiel|epilogue|epilog)(?:\s*[:\-–—.]\s*(.*?))?\s*$/i

const KIND_OF: Record<string, ChapterKind> = {
  prologue: 'prologue', prolog: 'prologue',
  interlude: 'interlude', zwischenspiel: 'interlude',
  epilogue: 'epilogue', epilog: 'epilogue',
}

const SCENE_BREAK_RE = /^(?:\s*(?:\*\s*){3,}\s*|\s*(?:-\s*){3,}\s*|\s*~{3,}\s*|\s*#\s*$)/m

function romanToInt(s: string): number | null {
  const roman: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 }
  const lower = s.toLowerCase()
  if (!/^[ivxlcdm]+$/.test(lower)) return null
  let result = 0
  for (let i = 0; i < lower.length; i++) {
    const curr = roman[lower[i]!]!
    const next = roman[lower[i + 1]!]
    if (next && curr < next) {
      result -= curr
    } else {
      result += curr
    }
  }
  return result
}

function parseChapterNumber(raw: string): number {
  const asInt = parseInt(raw)
  if (!isNaN(asInt)) return asInt
  return romanToInt(raw) ?? 1
}

export function parseText(text: string): ParsedChapter[] {
  const lines = text.split('\n')
  const chapters: ParsedChapter[] = []
  let currentChapter: ParsedChapter | null = null
  let buffer: string[] = []
  // A scene's title is its identity: two scenes with one title would be one
  // scene after the import (the second write updates the first). Numbers can
  // repeat (a Part Two that starts again at Chapter 1), so titles are made
  // unique here.
  const usedTitles = new Set<string>()
  const uniqueTitle = (base: string) => {
    let title = base
    for (let n = 2; usedTitles.has(title.toLowerCase()); n++) title = `${base} (${n})`
    usedTitles.add(title.toLowerCase())
    return title
  }

  const startChapter = (number: number | null, kind: ChapterKind, title: string) => {
    currentChapter = { key: chapters.length, number, kind, title, scenes: [] }
    chapters.push(currentChapter)
  }

  function flushBuffer() {
    const prose = buffer.join('\n').trim()
    buffer = []
    if (!prose) return
    // Text before the first heading is never glued onto Chapter 1: it becomes
    // its own front-matter part, which the writer can include or leave out.
    if (!currentChapter) startChapter(null, 'front', 'Front matter')
    const chapter = currentChapter!
    const prefix = chapter.number != null ? `Ch${chapter.number}` : chapter.title
    const sceneTexts = prose.split(SCENE_BREAK_RE).map(s => s.trim()).filter(Boolean)
    for (const sceneText of sceneTexts) {
      const sceneNum = chapter.scenes.length + 1
      chapter.scenes.push({
        sceneOrder: sceneNum,
        title: uniqueTitle(`${prefix} Scene ${sceneNum}`),
        prose: sceneText,
      })
    }
  }

  for (const line of lines) {
    const match = line.match(CHAPTER_RE)
    const unnumbered = match ? null : line.match(UNNUMBERED_RE)
    if (match) {
      flushBuffer()
      const numRaw = match[1] || match[3] || '1'
      const titleRaw = (match[2] || match[4] || '').trim()
      const num = parseChapterNumber(numRaw)
      startChapter(num, 'chapter', titleRaw || `Chapter ${num}`)
    } else if (unnumbered) {
      flushBuffer()
      const word = unnumbered[1]!
      const titleRaw = (unnumbered[2] || '').trim()
      // As written: "Prologue", "Epilog"; "Interlude: The Bell" → "The Bell".
      startChapter(null, KIND_OF[word.toLowerCase()]!, titleRaw || word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    } else {
      buffer.push(line)
    }
  }

  flushBuffer()

  // No headings at all: the whole text is chapter 1.
  if (chapters.length === 1 && chapters[0]!.kind === 'front') {
    const only = chapters[0]!
    only.number = 1
    only.kind = 'chapter'
    only.title = 'Chapter 1'
    only.scenes.forEach((s, i) => { s.title = `Ch1 Scene ${i + 1}` })
  }

  return chapters
}

// ── Extract: AI entity detection from chapter text ───────

function buildExtractPrompt(roles: string[], locationTypes: string[]): string {
  return `You are analysing a chapter from a novel. Extract all characters, locations, and plot threads mentioned.

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "characters": [
    { "name": "Full Name", "role": "${roles.join('|')}", "description": "One sentence" }
  ],
  "locations": [
    { "name": "Location Name", "type": "${locationTypes.join('|')}", "atmosphere": "One sentence" }
  ],
  "plotThreads": [
    { "title": "Short Thread Title", "description": "One sentence" }
  ],
  "summary": "2-3 sentence chapter summary"
}

Rules:
- Use the character's most complete name form
- For role, pick the best fit from the enum values
- For location type, pick the best fit from the enum values
- Only include entities that actually appear or are meaningfully referenced
- Deduplicate: if a character appears by first name and full name, use the full name once
- summary should capture the key events and emotional arc`
}

export async function extractEntities(
  chapterText: string,
  chapterTitle: string,
  termEnums?: { roles?: string[], locationTypes?: string[] },
): Promise<ExtractedEntities> {
  const apiKey = anthropicKey()
  if (!apiKey) throw new Error('No Anthropic API key — set one in Settings')

  const model = process.env.IMPORT_MODEL || process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001'
  const anthropic = new Anthropic({ apiKey })

  const response = await anthropic.messages.create({
    model,
    max_tokens: 2048,
    system: buildExtractPrompt(
      termEnums?.roles || ['PROTAGONIST', 'ANTAGONIST', 'SUPPORTING', 'MINOR', 'MENTIONED'],
      termEnums?.locationTypes || ['CITY', 'TOWN', 'BUILDING', 'ROOM', 'OUTDOOR', 'VEHICLE', 'REALM', 'VIRTUAL', 'OTHER'],
    ),
    messages: [
      {
        role: 'user',
        content: `Chapter: "${chapterTitle}"\n\n${chapterText}`,
      },
    ],
  })

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')

  try {
    // Strip any markdown code fences the model might add
    const cleaned = text.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '')
    return JSON.parse(cleaned)
  } catch {
    console.error('Failed to parse extraction response:', text)
    return { characters: [], locations: [], plotThreads: [], summary: '' }
  }
}
