/**
 * The app's books, and which one a request is about.
 *
 * A book is one namespace (DESIGN.md "Several books in one app"). The books
 * are the namespaces the server's key can see that hold one of AA's own
 * templates: AA_BOOTSTRAP_RECORD, the first template a bootstrap creates, or
 * AA_PROJECT, for copies bootstrapped before the record was prefixed. Under
 * the app's own key those are exactly the namespaces it owns; under the
 * master key (development, tests) the scratch copies show up too.
 *
 * Every book-scoped route takes the book from the `book` query parameter,
 * which works the same for fetch, streamed responses and download links.
 */
import type { Request, Response, NextFunction } from 'express'
import { wipGet } from './wip-api.js'
import type { BookTarget } from './book-space.js'

/** A namespace name AA accepts as a book: lowercase, digits, hyphens. */
const BOOK_NAME = /^[a-z][a-z0-9-]{0,62}$/

export function isValidBookName(name: unknown): name is string {
  return typeof name === 'string' && BOOK_NAME.test(name) && name !== 'wip'
}

/** The book a request names when it names none: the deployment's default. */
export const defaultBook = (): string => process.env.WIP_NAMESPACE || 'aa'

/** The WIP connection for one book, read per call like the bootstrap. */
export const bookTarget = (namespace: string): BookTarget => ({
  namespace,
  baseUrl: process.env.WIP_BASE_URL || 'https://localhost:8443',
  apiKey: process.env.WIP_API_KEY || '',
})

const MARKER_TEMPLATES = ['AA_BOOTSTRAP_RECORD', 'AA_PROJECT']

async function hasTemplate(namespace: string, value: string): Promise<boolean> {
  try {
    await wipGet(`/api/template-store/templates/by-value/${value}?namespace=${encodeURIComponent(namespace)}`)
    return true
  } catch {
    return false
  }
}

async function isAaNamespace(namespace: string): Promise<boolean> {
  for (const value of MARKER_TEMPLATES) {
    if (await hasTemplate(namespace, value)) return true
  }
  return false
}

export interface BookInfo {
  name: string
  /** The book's title (its AA_PROJECT document), when it has one. */
  title?: string
}

async function bookTitle(namespace: string): Promise<string | undefined> {
  try {
    const tmpl = (await wipGet(
      `/api/template-store/templates/by-value/AA_PROJECT?namespace=${encodeURIComponent(namespace)}`,
    )) as { template_id: string }
    const docs = (await wipGet(
      `/api/document-store/documents?namespace=${encodeURIComponent(namespace)}&template_id=${tmpl.template_id}&status=active&page_size=1`,
    )) as { items?: Array<{ data?: { title?: string } }> }
    return docs.items?.[0]?.data?.title || undefined
  } catch {
    return undefined
  }
}

// The names are cached briefly: every book-scoped request checks its book,
// and the list costs one WIP call per visible namespace.
const CACHE_MS = 30_000
let cached: { names: string[]; at: number } | null = null

/** Names of the app's books, from WIP, sorted. Throws when WIP is unreachable. */
export async function listBookNames(): Promise<string[]> {
  const namespaces = (await wipGet('/api/registry/namespaces')) as Array<{ prefix: string; status?: string }>
  const candidates = namespaces
    .filter((n) => n.status !== 'inactive' && isValidBookName(n.prefix))
    .map((n) => n.prefix)
  const flags = await Promise.all(candidates.map(isAaNamespace))
  const names = candidates.filter((_, i) => flags[i]).sort()
  cached = { names, at: Date.now() }
  return names
}

/** The app's books with their titles, for the book list. */
export async function listBooks(): Promise<BookInfo[]> {
  const names = await listBookNames()
  const titles = await Promise.all(names.map(bookTitle))
  return names.map((name, i) => ({ name, ...(titles[i] ? { title: titles[i] } : {}) }))
}

/** Whether `name` is one of the app's books. Re-reads the list on a miss. */
export async function isBook(name: string): Promise<boolean> {
  if (cached && Date.now() - cached.at < CACHE_MS && cached.names.includes(name)) return true
  return (await listBookNames()).includes(name)
}

/** Forget the cached list, e.g. after a bootstrap made a new book. */
export function forgetBooks(): void {
  cached = null
}

/** The book a request is about, as set by requireBook(). */
export function bookOf(res: Response): string {
  return res.locals.book as string
}

/**
 * Express middleware: take the book from `?book=`, refuse a missing or
 * malformed name (400) and a name that is not one of the app's books (404,
 * `unknown_book`). With `allowNew`, any well-formed name passes: the
 * bootstrap routes are how a reserved name becomes a book.
 */
export function requireBook(opts: { allowNew?: boolean } = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const name = req.query.book
    if (!isValidBookName(name)) {
      res.status(400).json({
        error: 'invalid_book',
        message: 'A book name is required (?book=): lowercase letters, digits and hyphens, starting with a letter.',
      })
      return
    }
    if (!opts.allowNew) {
      try {
        if (!(await isBook(name))) {
          res.status(404).json({ error: 'unknown_book', message: `'${name}' is not one of this app's books.` })
          return
        }
      } catch (err) {
        res.status(503).json({ error: 'wip_unreachable', message: (err as Error).message })
        return
      }
    }
    res.locals.book = name
    next()
  }
}
