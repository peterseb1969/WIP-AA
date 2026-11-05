import { describe, expect, it } from 'vitest'
import { bookApi, bookHome, bookNameProblem, chooseBook, parseBookLocation, setSettingsNamespace } from './books'
import { setNamespace } from './constants'

describe('reading the book from the URL', () => {
  it('finds the book and the page within it, under any base path', () => {
    expect(parseBookLocation('/apps/aa/book/my-novel/scenes', '/apps/aa/')).toEqual({ kind: 'book', book: 'my-novel', rest: '/scenes' })
    expect(parseBookLocation('/book/aa/', '/')).toEqual({ kind: 'book', book: 'aa', rest: '/' })
    expect(parseBookLocation('/book/aa', '/')).toEqual({ kind: 'book', book: 'aa', rest: '/' })
  })

  it('recognises the book list', () => {
    expect(parseBookLocation('/apps/aa/books', '/apps/aa/')).toEqual({ kind: 'books' })
    expect(parseBookLocation('/books/', '/')).toEqual({ kind: 'books' })
  })

  it('keeps the page of a URL without a book, so old links still open it', () => {
    expect(parseBookLocation('/apps/aa/scenes', '/apps/aa/')).toEqual({ kind: 'none', rest: '/scenes' })
    expect(parseBookLocation('/apps/aa/', '/apps/aa/')).toEqual({ kind: 'none', rest: '/' })
    // "bookshelf" is a page path, not the book list or a book
    expect(parseBookLocation('/bookshelf', '/')).toEqual({ kind: 'none', rest: '/bookshelf' })
  })

  it('round-trips a book home', () => {
    expect(parseBookLocation(bookHome('second-book', '/apps/aa/') + 'export', '/apps/aa/')).toEqual({ kind: 'book', book: 'second-book', rest: '/export' })
  })
})

describe('names that cannot be books, before asking the server', () => {
  it('refuses the platform namespace and the settings namespace the server names', () => {
    setSettingsNamespace('aa-settings')
    expect(bookNameProblem('wip')).toBe('wip')
    expect(bookNameProblem('aa-settings')).toBe('settings')
    expect(bookNameProblem('Not A Name')).toBe('pattern')
    expect(bookNameProblem('my-novel')).toBeNull()
    setSettingsNamespace('other-settings')
    expect(bookNameProblem('aa-settings')).toBeNull()
    expect(bookNameProblem('other-settings')).toBe('settings')
  })
})

describe('the book a URL without one opens', () => {
  it('prefers the last book used, if it is still a book', () => {
    expect(chooseBook(['second', 'aa'], ['aa', 'second'])).toBe('second')
    expect(chooseBook(['gone', 'aa'], ['aa', 'second'])).toBe('aa')
  })

  it('has none when no candidate is a book', () => {
    expect(chooseBook([null, 'aa'], ['other'])).toBeNull()
    expect(chooseBook([null, null], ['aa'])).toBeNull()
  })

  it('takes the first well-formed candidate when the list is unknown', () => {
    expect(chooseBook(['Not A Name', 'aa'], null)).toBe('aa')
  })
})

describe('server calls carry the current book', () => {
  it('adds book= to a path, with or without a query', () => {
    setNamespace('second-book')
    expect(bookApi('api/book/contents')).toBe('/api/book/contents?book=second-book')
    expect(bookApi('api/export/md?lang=de')).toBe('/api/export/md?lang=de&book=second-book')
  })
})
