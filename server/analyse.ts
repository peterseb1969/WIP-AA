import Anthropic from '@anthropic-ai/sdk'
import { anthropicKey } from './lib/anthropic-key.js'

// Prompts are built in the browser from the writer's own prompt library and
// the scene they are looking at; this caps what one request may send.
const MAX_PROMPT_CHARS = 200_000

/**
 * Run one scene analysis: the prompt's system text plus the rendered user
 * message (scene context + the writer's question). Returns Claude's text.
 */
export async function analyse(system: string, user: string): Promise<string> {
  const apiKey = anthropicKey()
  if (!apiKey) throw new Error('No Anthropic API key — set one in Settings')
  if (!user.trim()) throw new Error('Empty prompt')
  if (system.length + user.length > MAX_PROMPT_CHARS) {
    throw new Error(`Prompt too long (${system.length + user.length} characters, limit ${MAX_PROMPT_CHARS})`)
  }

  const model = process.env.ANALYSE_MODEL || process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001'
  const anthropic = new Anthropic({ apiKey })
  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: user }],
  })

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
}
