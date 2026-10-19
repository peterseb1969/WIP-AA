import { readFileSync } from 'fs'
import { describe, expect, it } from 'vitest'

// JSON keeps only the last of two equal keys, silently. A second "merge"
// block once hid every scene-merge string, so the dialog showed raw keys.
const raw = (lang: string) => readFileSync(new URL(`./locales/${lang}.json`, import.meta.url), 'utf8')

/** Every dotted key path, from nested objects. */
function paths(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? paths(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`])
}

describe.each(['en', 'de'])('locale %s', (lang) => {
  it('has no duplicate top-level sections', () => {
    const sections = [...raw(lang).matchAll(/^ {2}"([^"]+)": \{/gm)].map((m) => m[1])
    expect(sections.filter((s, i) => sections.indexOf(s) !== i)).toEqual([])
  })
})

it('English and German define the same keys', () => {
  const en = new Set(paths(JSON.parse(raw('en'))))
  const de = new Set(paths(JSON.parse(raw('de'))))
  expect([...en].filter((k) => !de.has(k))).toEqual([])
  expect([...de].filter((k) => !en.has(k))).toEqual([])
})
