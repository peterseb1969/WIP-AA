import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'

// A stand-in WIP: the namespaces the key sees, and the AA templates each holds.
const wip = vi.hoisted(() => ({
  namespaces: [] as Array<{ prefix: string; status?: string }>,
  templates: {} as Record<string, string[]>,
  down: false,
  // The Registry answers the namespace list but not template lookups: WIP
  // answers 503 registry_unavailable to a lookup it cannot resolve.
  registryDown: false,
  calls: 0,
}))

vi.mock('./wip-api.js', () => {
  class WipHttpError extends Error {
    constructor(readonly status: number, path: string) { super(`WIP GET ${path}: ${status}`) }
  }
  return {
    WipHttpError,
    wipGet: async (path: string) => {
      wip.calls++
      if (wip.down) throw new Error('WIP GET: connect ECONNREFUSED')
      if (path === '/api/registry/namespaces') return wip.namespaces
      if (wip.registryDown) throw new WipHttpError(503, path)
      const m = path.match(/^\/api\/template-store\/templates\/by-value\/(\w+)\?namespace=([\w-]+)$/)
      if (m && wip.templates[m[2]!]?.includes(m[1]!)) return { template_id: `${m[2]}-${m[1]}` }
      throw new WipHttpError(404, path)
    },
  }
})

const { bookNameProblem, isValidBookName, listBookNames, requireBook, forgetBooks } = await import('./books')

beforeEach(() => {
  wip.namespaces = [
    { prefix: 'wip' },
    { prefix: 'aa' },
    { prefix: 'second-book' },
    { prefix: 'kb' },
    { prefix: 'old-copy' },
    { prefix: 'retired', status: 'inactive' },
  ]
  wip.templates = {
    aa: ['AA_BOOTSTRAP_RECORD', 'AA_PROJECT'],
    'second-book': ['AA_BOOTSTRAP_RECORD'],
    kb: ['KB_BOOTSTRAP_RECORD', 'BOOTSTRAP_RECORD'],
    'old-copy': ['BOOTSTRAP_RECORD', 'AA_PROJECT'],
    retired: ['AA_BOOTSTRAP_RECORD'],
  }
  wip.down = false
  wip.registryDown = false
  wip.calls = 0
  forgetBooks()
})

describe('book names', () => {
  it('accepts lowercase namespace names', () => {
    for (const ok of ['aa', 'book-2', 'my-novel', 'a']) expect(isValidBookName(ok)).toBe(true)
  })

  it('refuses everything else, the platform namespace and the settings namespace', () => {
    for (const bad of ['', 'wip', 'aa-settings', 'Book', '2nd', '-x', 'a_b', 'a/b', 'a b', 'x'.repeat(64), undefined, ['aa'], 7]) {
      expect(isValidBookName(bad)).toBe(false)
    }
  })
})

describe('why a name is refused', () => {
  it('names the reason, not just the pattern', () => {
    expect(bookNameProblem(undefined)).toBe('A book name is required (?book=).')
    expect(bookNameProblem('Book')).toMatch(/use lowercase letters, digits and hyphens/)
    expect(bookNameProblem('wip')).toBe("'wip' can't be a book: it is the platform's own namespace.")
    expect(bookNameProblem('aa-settings')).toBe("'aa-settings' can't be a book: it is the app's settings namespace.")
    expect(bookNameProblem('my-novel')).toBeNull()
  })
})

describe('which namespaces are books', () => {
  it('keeps the namespaces holding an AA template, sorted', async () => {
    // kb has only the shared legacy record, not an AA template; wip and an
    // inactive namespace are never books.
    expect(await listBookNames()).toEqual(['aa', 'old-copy', 'second-book'])
  })

  it('fails, rather than dropping every book, when the Registry cannot answer', async () => {
    // Only a 404 says a namespace has no AA template. A 503 is no answer
    // about the namespace, and must not shrink the list to nothing.
    wip.registryDown = true
    await expect(listBookNames()).rejects.toThrow(/503/)
  })
})

function call(book: unknown, opts?: { allowNew?: boolean }) {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    locals: {} as Record<string, unknown>,
    status(code: number) { this.statusCode = code; return this },
    json(body: unknown) { this.body = body; return this },
  }
  let passed = false
  const req = { query: book === undefined ? {} : { book } } as unknown as Request
  return requireBook(opts)(req, res as unknown as Response, () => { passed = true }).then(() => ({ res, passed }))
}

describe('requireBook', () => {
  it('passes a known book on and records it', async () => {
    const { res, passed } = await call('second-book')
    expect(passed).toBe(true)
    expect(res.locals.book).toBe('second-book')
  })

  it('answers 400 with the reason', async () => {
    const { res } = await call('aa-settings')
    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({ error: 'invalid_book', message: "'aa-settings' can't be a book: it is the app's settings namespace." })
  })

  it('answers 400 for a missing or malformed name', async () => {
    for (const bad of [undefined, '', 'Wip', 'wip', ['aa', 'kb']]) {
      const { res, passed } = await call(bad)
      expect(passed).toBe(false)
      expect(res.statusCode).toBe(400)
    }
  })

  it('answers 404 for a namespace that is not a book', async () => {
    for (const other of ['kb', 'nowhere', 'retired']) {
      const { res, passed } = await call(other)
      expect(passed).toBe(false)
      expect(res.statusCode).toBe(404)
      expect((res.body as { error: string }).error).toBe('unknown_book')
    }
  })

  it('lets a new name through only where allowed (the bootstrap)', async () => {
    const { res, passed } = await call('reserved-next', { allowNew: true })
    expect(passed).toBe(true)
    expect(res.locals.book).toBe('reserved-next')
    expect(wip.calls).toBe(0)
  })

  it('finds a book created after the list was cached', async () => {
    await call('aa')
    wip.namespaces.push({ prefix: 'brand-new' })
    wip.templates['brand-new'] = ['AA_BOOTSTRAP_RECORD']
    expect((await call('brand-new')).passed).toBe(true)
  })

  it('answers a known book from the cache without asking WIP', async () => {
    await call('aa')
    const before = wip.calls
    await call('second-book')
    expect(wip.calls).toBe(before)
  })

  it('answers 503, not unknown_book, while the Registry is down', async () => {
    wip.registryDown = true
    const { res, passed } = await call('aa')
    expect(passed).toBe(false)
    expect(res.statusCode).toBe(503)
  })

  it('answers 503 when WIP cannot be asked', async () => {
    wip.down = true
    const { res, passed } = await call('aa')
    expect(passed).toBe(false)
    expect(res.statusCode).toBe(503)
  })
})
