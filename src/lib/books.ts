/**
 * Books in the browser: which book a URL is about, the URLs of a book, and
 * the server calls that carry it (DESIGN.md "Several books in one app").
 *
 * A book is one WIP namespace. Its pages live under `<base>/book/<ns>/`;
 * main.tsx reads the book from the URL before the first render and sets
 * NAMESPACE, which every WIP call passes. The server's own book-scoped routes
 * take it as `?book=<ns>` (bookApi). Switching books is a full page load, so
 * nothing cached for one book shows in another.
 */
import { NAMESPACE } from './constants'

// Vite's BASE_URL always ends in '/': '/' in local dev, '/apps/aa/' deployed.
const BASE = import.meta.env.BASE_URL

/** Same rule as the server (server/lib/books.ts). */
const BOOK_NAME = /^[a-z][a-z0-9-]{0,62}$/

export function isValidBookName(name: string): boolean {
  return BOOK_NAME.test(name) && name !== 'wip'
}

/** What the browser's path asks for. `rest` is the page path without the book. */
export type BookLocation =
  | { kind: 'book'; book: string; rest: string }
  | { kind: 'books' }
  | { kind: 'none'; rest: string }

export function parseBookLocation(pathname: string, base = BASE): BookLocation {
  const rel = pathname.startsWith(base) ? pathname.slice(base.length) : pathname.replace(/^\//, '')
  if (/^books\/?$/.test(rel)) return { kind: 'books' }
  const m = rel.match(/^book\/([^/]+)(\/.*)?$/)
  if (m) return { kind: 'book', book: decodeURIComponent(m[1]!), rest: m[2] || '/' }
  return { kind: 'none', rest: `/${rel}` }
}

/** The browser path of a book's pages, e.g. /apps/aa/book/aa/ */
export function bookHome(book: string, base = BASE): string {
  return `${base}book/${encodeURIComponent(book)}/`
}

/** The router basename for the current book: bookHome without its slash. */
export function bookBasename(): string {
  return bookHome(NAMESPACE).replace(/\/$/, '')
}

/** The browser path of the book list. */
export function booksPage(base = BASE): string {
  return `${base}books`
}

/** URL of one of this server's book-scoped routes, for the current book. */
export function bookApi(path: string): string {
  const sep = path.includes('?') ? '&' : '?'
  return `${BASE}${path}${sep}book=${encodeURIComponent(NAMESPACE)}`
}

export interface BookInfo {
  name: string
  title?: string
}

/** The app's books, from the server. */
export async function fetchBooks(): Promise<{ books: BookInfo[]; default: string | null }> {
  const res = await fetch(`${BASE}server-api/books`)
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { message?: string } | null
    throw new Error(body?.message || `HTTP ${res.status}`)
  }
  return res.json()
}

// The last book opened in this browser: a per-viewer convenience, so storage
// may be missing or blocked without harm.
const LAST_BOOK_KEY = 'authorassist.lastBook'

export function rememberBook(book: string): void {
  try { localStorage.setItem(LAST_BOOK_KEY, book) } catch { /* not kept */ }
}

export function lastBook(): string | null {
  try { return localStorage.getItem(LAST_BOOK_KEY) } catch { return null }
}

/**
 * The book a URL without one opens: the last book used here, else the
 * server's default, whichever is still a book. Null when there is none.
 * Without a book list (WIP unreachable) the first candidate is taken; the
 * book's own gate then says what is wrong.
 */
export function chooseBook(candidates: Array<string | null | undefined>, known: string[] | null): string | null {
  const names = candidates.filter((c): c is string => !!c && isValidBookName(c))
  if (!known) return names[0] ?? null
  return names.find((c) => known.includes(c)) ?? null
}
