/**
 * The book list (`<base>/books`): every book of this app, and setting up a
 * new one (DESIGN.md "Several books in one app").
 *
 * Rendered by main.tsx instead of App, outside any book: it talks only to the
 * server's book list, never to WIP directly. Opening or setting up a book is a
 * full page load of that book's URL; a new book's own bootstrap gate then
 * offers to set it up. The name must be one the operator reserved for the
 * app, which WIP enforces when the bootstrap creates the namespace.
 */
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookOpen, Library, Loader2, Plus, RefreshCw } from 'lucide-react'
import './i18n'
import LanguageSwitcher from './components/LanguageSwitcher'
import CommandLine from './components/CommandLine'
import { bookHome, bookNameProblem, fetchBooks, type BookInfo } from './lib/books'

export default function BooksApp() {
  const { t } = useTranslation()
  const [books, setBooks] = useState<BookInfo[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')

  const load = useCallback(() => {
    setError(null)
    setBooks(null)
    fetchBooks()
      .then((r) => setBooks(r.books))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }, [])

  useEffect(load, [load])

  const trimmed = name.trim()
  const problem = trimmed ? bookNameProblem(trimmed) : null
  const invalid = problem !== null
  const shownName = trimmed && !invalid ? trimmed : '<name>'
  const taken = !!books?.some((b) => b.name === trimmed)

  return (
    <div className="min-h-screen bg-surface">
      <header className="h-14 bg-primary text-white flex items-center px-4 gap-3">
        <Library className="w-5 h-5" />
        <span className="font-bold text-lg tracking-tight">AuthorAssist</span>
        <div className="ml-auto w-32">
          <LanguageSwitcher />
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-text">{t('books.title')}</h1>
          <p className="mt-1 text-sm text-text-muted">{t('books.intro')}</p>
        </div>

        {error && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{t('books.load_error', { message: error })}</p>
            <button
              onClick={load}
              className="mt-3 inline-flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-sm border border-red-200 hover:bg-red-100"
            >
              <RefreshCw className="w-4 h-4" /> {t('books.retry')}
            </button>
          </div>
        )}

        {!books && !error && (
          <p className="flex items-center gap-2 text-sm text-text-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('books.loading')}
          </p>
        )}

        {books && books.length === 0 && <p className="text-sm text-text-muted">{t('books.empty')}</p>}

        {books && books.length > 0 && (
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white" aria-label={t('books.title')}>
            {books.map((b) => (
              <li key={b.name} className="flex items-center gap-3 p-4">
                <BookOpen className="w-5 h-5 text-primary flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text truncate">{b.title || t('books.untitled')}</p>
                  <p className="text-xs text-text-muted">{b.name}</p>
                </div>
                <a
                  href={bookHome(b.name)}
                  aria-label={`${t('books.open')}: ${b.title || b.name}`}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-light"
                >
                  {t('books.open')}
                </a>
              </li>
            ))}
          </ul>
        )}

        <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <h2 className="font-semibold text-text">{t('books.add_title')}</h2>
          <p className="text-sm text-text-muted">{t('books.add_hint')}</p>
          <ul className="space-y-2 text-sm text-text-muted">
            <li>
              {t('books.via_deploy')}
              <CommandLine className="mt-1 bg-gray-100 px-3 py-2 text-text" command={`wip-deploy app-namespace add wip-aa ${shownName} --setting deletion_mode=full`} />
            </li>
            <li>{t('books.via_console', { name: shownName })}</li>
          </ul>
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault()
              if (trimmed && !invalid && !taken) window.location.assign(bookHome(trimmed))
            }}
          >
            <label className="flex-1 text-sm">
              <span className="block text-text-muted mb-1">{t('books.name_label')}</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={invalid || taken}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={!trimmed || invalid || taken}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-light disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> {t('books.add')}
            </button>
          </form>
          {problem && <p className="text-xs text-red-600">{t(problem === 'pattern' ? 'books.name_invalid' : `books.name_${problem}`, { name: trimmed })}</p>}
          {taken && <p className="text-xs text-red-600">{t('books.name_taken')}</p>}
        </section>
      </main>
    </div>
  )
}
