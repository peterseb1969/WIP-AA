import Anthropic from '@anthropic-ai/sdk'
import { requireTarget } from './lib/ai-settings.js'

// Prompts are built in the browser from the writer's own prompt library and
// the scene they are looking at; this caps what one request may send.
const MAX_PROMPT_CHARS = 200_000

/**
 * Run one scene analysis: the prompt's system text plus the rendered user
 * message (scene context + the writer's question). Returns the model's text;
 * the model is the one Settings assigns to scene analysis (lib/ai-settings.ts).
 */
export async function analyse(system: string, user: string): Promise<string> {
  if (!user.trim()) throw new Error('Empty prompt')
  if (system.length + user.length > MAX_PROMPT_CHARS) {
    throw new Error(`Prompt too long (${system.length + user.length} characters, limit ${MAX_PROMPT_CHARS})`)
  }

  const { client, model } = await requireTarget('ANALYSE')
  const response = await client.messages.create({
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
