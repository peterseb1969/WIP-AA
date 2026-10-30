import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { anthropicKey } from './lib/anthropic-key.js'
import { backoffMs, errorStatus, retryDecision } from './lib/agent-retry.js'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ---------- Configuration ----------

let mcpClient: Client | null = null
let mcpTools: Anthropic.Tool[] = []
let systemPrompt = ''

// Where the background connection stands (startAgent). `mcpClient` is set only
// once a connection fully succeeded, so it alone decides readiness.
type AgentState = 'no-key' | 'connecting' | 'ready' | 'failed'
let agentState: AgentState = 'no-key'
let agentError = ''
let agentLoop: Promise<void> | null = null

// Read env at call time so dotenv/config has loaded
const env = () => ({
  MCP_URL: process.env.MCP_URL || '',
  MCP_TRANSPORT: process.env.MCP_TRANSPORT || '',
  MCP_PYTHON: process.env.MCP_PYTHON || '',
  MCP_CWD: process.env.MCP_CWD || '',
  MCP_MODULE: process.env.MCP_MODULE || 'wip_mcp',
  WIP_API_KEY: process.env.WIP_API_KEY || '',
  CLAUDE_MODEL: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
  WIP_NAMESPACE: process.env.WIP_NAMESPACE || 'aa',
  MAX_TURNS: parseInt(process.env.MAX_TURNS || '15'),
  SESSION_TTL_MS: parseInt(process.env.SESSION_TTL_MINUTES || '30') * 60_000,
})

// Only expose read/query tools — no create, delete, or admin tools
const ALLOWED_TOOLS = new Set([
  'get_wip_status',
  'describe_data_model',
  'search',
  'search_registry',
  'list_namespaces',
  'get_namespace_stats',
  'list_terminologies',
  'get_terminology',
  'get_terminology_by_value',
  'list_terms',
  'get_term',
  'validate_term_value',
  'get_term_hierarchy',
  'list_templates',
  'get_template',
  'get_template_by_value',
  'get_template_fields',
  'list_documents',
  'get_document',
  'query_documents',
  'query_by_template',
  'get_document_versions',
  'get_file_metadata',
  'list_report_tables',
  'run_report_query',
])

// ---------- Session management ----------

interface Session {
  messages: Anthropic.MessageParam[]
  lastAccess: number
}

const sessions = new Map<string, Session>()

setInterval(() => {
  const now = Date.now()
  for (const [id, session] of sessions) {
    if (now - session.lastAccess > env().SESSION_TTL_MS) {
      sessions.delete(id)
    }
  }
}, 60_000)

// ---------- MCP connection ----------

function createTransport() {
  const e = env()
  if (e.MCP_URL) {
    const url = new URL(e.MCP_URL)
    // The platform MCP endpoint requires X-API-Key on every request
    // (CASE-451) — a transport without it dies at initialize with 401.
    const authHeaders = { 'X-API-Key': e.WIP_API_KEY }
    if (e.MCP_TRANSPORT === 'sse' || e.MCP_URL.endsWith('/sse')) {
      return new SSEClientTransport(url, {
        requestInit: { headers: authHeaders },
      })
    }
    // Default to Streamable HTTP for remote URLs
    return new StreamableHTTPClientTransport(url, {
      requestInit: { headers: authHeaders },
    })
  }

  // Stdio: spawn local MCP server process
  const pythonPath = e.MCP_PYTHON || 'python'
  const cwd = e.MCP_CWD || process.cwd()
  return new StdioClientTransport({
    command: pythonPath,
    args: ['-m', e.MCP_MODULE],
    cwd,
    env: {
      ...process.env as Record<string, string>,
      WIP_API_KEY: process.env.WIP_API_KEY || 'dev_master_key_for_testing',
      WIP_MCP_MODE: 'readonly',
      PYTHONPATH: join(cwd, 'components/mcp-server/src'),
    },
  })
}

/** True once the MCP client is connected and the agent can answer /api/ask. */
export function isAgentReady(): boolean {
  return mcpClient !== null
}

/** Why /api/ask cannot answer yet, or '' when it can. */
export function agentUnavailableReason(): string {
  if (mcpClient) return ''
  switch (agentState) {
    case 'no-key': return 'No Anthropic API key — set one in Settings.'
    case 'connecting': return `The assistant is still connecting to WIP${agentError ? ` (last attempt: ${agentError})` : ''}.`
    case 'failed': return `The assistant could not connect to WIP: ${agentError}. Check the WIP API key.`
    default: return 'The assistant is not ready.'
  }
}

/**
 * Connect the agent in the background, retrying until the platform answers
 * (see lib/agent-retry.ts). Never throws and never blocks the caller: the
 * server listens first, and Ask comes up when MCP does. A second call while
 * a connection is underway or done is a no-op.
 */
export function startAgent(): void {
  if (!anthropicKey()) {
    agentState = 'no-key'
    console.warn('⚠ No Anthropic key (override/file/env) — /api/ask unavailable until one is set via Settings')
    return
  }
  if (agentLoop || mcpClient) return
  agentState = 'connecting'
  agentLoop = (async () => {
    for (let attempt = 0; ; attempt++) {
      try {
        await connectAgent()
        agentState = 'ready'
        agentError = ''
        return
      } catch (err) {
        agentError = (err as Error)?.message || String(err)
        if (retryDecision(err) === 'stop') {
          agentState = 'failed'
          console.error(`✗ MCP connect refused (HTTP ${errorStatus(err)}): ${agentError} — check the WIP API key; Ask stays unavailable`)
          return
        }
        const delay = backoffMs(attempt)
        console.warn(`⚠ MCP connect attempt ${attempt + 1} failed: ${agentError} — retrying in ${delay / 1000}s`)
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  })().finally(() => { agentLoop = null })
}

/** Resolves when the agent is ready, gave up, or `ms` passed — whichever comes first. */
export async function agentSettled(ms: number): Promise<void> {
  if (!agentLoop) return
  await Promise.race([agentLoop, new Promise((r) => setTimeout(r, ms))])
}

/**
 * One connection attempt: a fresh transport and client, published (client,
 * tools, prompt) only after connect and listTools succeed. A failed attempt
 * closes its client, so a dead client is never taken for a ready agent.
 */
async function connectAgent() {
  const client = new Client({ name: 'wip-query-agent', version: '0.1.0' })
  try {
    await client.connect(createTransport())
  } catch (err) {
    await client.close().catch(() => {})
    throw err
  }
  console.log('✓ MCP client connected')

  // Fetch and filter tools
  let toolsResult: Awaited<ReturnType<Client['listTools']>>
  try {
    toolsResult = await client.listTools()
  } catch (err) {
    await client.close().catch(() => {})
    throw err
  }
  const tools = toolsResult.tools
    .filter(t => ALLOWED_TOOLS.has(t.name))
    .map(t => ({
      name: t.name,
      description: t.description || '',
      input_schema: t.inputSchema as Anthropic.Tool['input_schema'],
    }))
  console.log(`✓ ${tools.length} tools available (filtered from ${toolsResult.tools.length})`)

  // Read the query assistant prompt resource for system prompt
  let prompt = ''
  try {
    const resource = await client.readResource({ uri: 'wip://query-assistant-prompt' })
    prompt = (resource.contents[0] as any)?.text || ''
    console.log(`✓ System prompt loaded from wip://query-assistant-prompt (${prompt.length} chars)`)
  } catch {
    console.warn('⚠ Could not read wip://query-assistant-prompt — using fallback')
    prompt = 'You are a helpful query assistant for a WIP data store. Use the available tools to answer questions about the data.'
  }

  // Append app-specific instructions if available
  try {
    const extra = readFileSync(join(__dirname, 'prompts', 'assistant.md'), 'utf-8')
    if (extra.trim()) {
      prompt += '\n\n' + extra
    }
  } catch {
    // No app-specific prompt — that's fine
  }

  mcpTools = tools
  systemPrompt = prompt
  mcpClient = client
}

// ---------- Ask ----------

export async function ask(
  question: string,
  sessionId?: string,
): Promise<{ answer: string; toolCalls: number; sessionId: string }> {
  if (!mcpClient) {
    throw new Error(agentUnavailableReason())
  }

  const id = sessionId || crypto.randomUUID()
  let session = sessions.get(id)
  if (!session) {
    session = { messages: [], lastAccess: Date.now() }
    sessions.set(id, session)
  }
  session.lastAccess = Date.now()

  // Add user message
  session.messages.push({ role: 'user', content: question })

  const e = env()
  const anthropic = new Anthropic({ apiKey: anthropicKey() })
  let totalToolCalls = 0

  for (let turn = 0; turn < e.MAX_TURNS; turn++) {
    const response = await anthropic.messages.create({
      model: e.CLAUDE_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      tools: mcpTools,
      messages: session.messages,
    })

    if (response.stop_reason === 'end_turn' || response.stop_reason !== 'tool_use') {
      // Extract text from response
      const answer = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('\n')

      session.messages.push({ role: 'assistant', content: response.content })
      return { answer, toolCalls: totalToolCalls, sessionId: id }
    }

    // Handle tool calls
    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const block of response.content) {
      if (block.type !== 'tool_use') continue
      totalToolCalls++

      const args = block.input as Record<string, unknown>

      // Inject namespace if configured and the tool accepts it
      if (e.WIP_NAMESPACE && 'namespace' in (args || {})) {
        args.namespace = e.WIP_NAMESPACE
      } else if (e.WIP_NAMESPACE && args && !('namespace' in args)) {
        // Only inject if the tool likely accepts namespace
        const toolDef = mcpTools.find(t => t.name === block.name)
        const props = (toolDef?.input_schema as any)?.properties || {}
        if ('namespace' in props) {
          args.namespace = e.WIP_NAMESPACE
        }
      }

      try {
        const result = await mcpClient!.callTool({ name: block.name, arguments: args })
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: typeof result.content === 'string'
            ? result.content
            : JSON.stringify(result.content),
          is_error: result.isError === true,
        })
      } catch (err: any) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: `Tool error: ${err.message}`,
          is_error: true,
        })
      }
    }

    // Feed tool results back
    session.messages.push({ role: 'assistant', content: response.content })
    session.messages.push({ role: 'user', content: toolResults })
  }

  return {
    answer: 'Reached maximum number of tool-call turns. Try a more specific question.',
    toolCalls: totalToolCalls,
    sessionId: id,
  }
}
