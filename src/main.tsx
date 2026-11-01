import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import BooksApp from './BooksApp'
import { fetchAppConfig } from './lib/app-config'
import { setNamespace } from './lib/constants'
import { bookHome, booksPage, chooseBook, fetchBooks, lastBook, parseBookLocation, rememberBook } from './lib/books'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root')!)

function renderBooks() {
  root.render(
    <React.StrictMode>
      <BooksApp />
    </React.StrictMode>,
  )
}

// The book must be known before anything queries WIP, so render nothing
// until it is: it comes from the URL (<base>/book/<ns>/…); a URL without one
// opens the last book used here or the server's default book (runtime
// config), and falls back to the book list. Fail loud rather than guess if
// the config can't be loaded.
fetchAppConfig()
  .then(async (config) => {
    const where = parseBookLocation(window.location.pathname)
    if (where.kind === 'books') return renderBooks()

    let book = where.kind === 'book' ? where.book : null
    if (where.kind === 'none') {
      const known = await fetchBooks().then((r) => r.books.map((b) => b.name)).catch(() => null)
      book = chooseBook([lastBook(), config.namespace], known)
      if (!book) {
        window.history.replaceState(null, '', booksPage())
        return renderBooks()
      }
      // Old links (<base>/scenes) keep working: same page, in that book.
      const { search, hash } = window.location
      window.history.replaceState(null, '', bookHome(book) + where.rest.replace(/^\//, '') + search + hash)
    }

    setNamespace(book!)
    rememberBook(book!)
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  })
  .catch((err: unknown) => {
    root.render(
      <div className="flex min-h-screen items-center justify-center bg-surface p-4">
        <div className="max-w-md rounded-md border border-red-200 bg-red-50 p-4">
          <p className="font-medium text-red-800">Cannot load app configuration</p>
          <p className="mt-1 text-sm text-red-600">{err instanceof Error ? err.message : String(err)}</p>
        </div>
      </div>,
    )
  })
