/**
 * Reads a server-sent event stream from a fetch response (POST requests
 * cannot use EventSource). Calls `onEvent` for every `event:` / `data:` pair
 * with the parsed data; ends when the server closes the stream.
 */
export async function readSSE(response: Response, onEvent: (event: string, data: unknown) => void) {
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  if (!response.body) throw new Error('No response body')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let event = 'message'
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.startsWith('event: ')) event = line.slice(7).trim()
      else if (line.startsWith('data: ')) {
        let data: unknown
        try { data = JSON.parse(line.slice(6)) } catch { data = line.slice(6) }
        onEvent(event, data)
        event = 'message'
      }
    }
  }
}

/**
 * Loads the demo book into the current (empty) book: POST
 * /server-api/demo/load. Reports each step; resolves with the summary,
 * rejects with the server's message.
 */
export async function loadDemoBook(onProgress: (detail: string) => void): Promise<string> {
  let summary = ''
  let failure = ''
  const response = await fetch(`${import.meta.env.BASE_URL}server-api/demo/load`, { method: 'POST' })
  await readSSE(response, (event, data) => {
    const d = data as { detail?: string; message?: string }
    if (event === 'progress' && d.detail) onProgress(d.detail)
    else if (event === 'complete') summary = d.detail ?? ''
    else if (event === 'error') failure = d.message ?? 'The demo book could not be loaded.'
  })
  if (failure) throw new Error(failure)
  return summary
}
