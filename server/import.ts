import Anthropic from '@anthropic-ai/sdk'
import { anthropicKey } from './lib/anthropic-key.js'

// ── Types ────────────────────────────────────────────────

export interface ParsedScene {
  sceneOrder: number
  title: string
  prose: string
}

export interface ParsedChapter {
  number: number
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

  function flushBuffer() {
    if (!currentChapter) return
    const prose = buffer.join('\n').trim()
    if (!prose) {
      buffer = []
      return
    }
    // Split buffer into scenes by scene breaks
    const sceneTexts = prose.split(SCENE_BREAK_RE).map(s => s.trim()).filter(Boolean)
    for (const sceneText of sceneTexts) {
      const sceneNum = currentChapter.scenes.length + 1
      currentChapter.scenes.push({
        sceneOrder: sceneNum,
        title: `Ch${currentChapter.number} Scene ${sceneNum}`,
        prose: sceneText,
      })
    }
    buffer = []
  }

  for (const line of lines) {
    const match = line.match(CHAPTER_RE)
    if (match) {
      // Flush previous chapter's buffer
      flushBuffer()

      const numRaw = match[1] || match[3] || '1'
      const titleRaw = (match[2] || match[4] || '').trim()
      const num = parseChapterNumber(numRaw)

      currentChapter = {
        number: num,
        title: titleRaw || `Chapter ${num}`,
        scenes: [],
      }
      chapters.push(currentChapter)
    } else {
      buffer.push(line)
    }
  }

  // Flush last chapter
  flushBuffer()

  // If no chapters detected, treat the whole text as chapter 1
  if (chapters.length === 0 && text.trim()) {
    const scenes = text.split(SCENE_BREAK_RE).map(s => s.trim()).filter(Boolean)
    chapters.push({
      number: 1,
      title: 'Chapter 1',
      scenes: scenes.map((prose, i) => ({
        sceneOrder: i + 1,
        title: `Ch1 Scene ${i + 1}`,
        prose,
      })),
    })
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
