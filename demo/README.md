# Demo book: *The Lantern Keeper's Tide*

A short mystery (8 chapters including prologue, interlude and epilogue; 16 scenes and one backstory event; ~1,400 words) written to touch every AuthorAssist feature. `server/demo/book.ts` holds all of it; `server/lib/demo-book.ts` loads it.

## Load it in the app

An empty book offers it: on the first-launch screen ("Bootstrap with the demo book"), and on the Dashboard and the Import page as "Load the demo book" while the book has no documents and no names. A book with content never offers it, so the demo cannot mix into a real novel. To get rid of it, use "Delete book" in the Dashboard's danger zone: it removes everything and the book offers the demo again. To try it next to a real book, give it its own instance and namespace (CASE-913 tracks one instance per book).

## Load it from the command line

```bash
npx tsx tools/load-demo-book.ts                        # creates, bootstraps and fills aa-demo-book (never aa)
npx tsx tools/load-demo-book.ts --namespace aa-demo-2  # another copy
```

It needs WIP running and `WIP_API_KEY_FILE` in `.env`, and refuses `aa` and any namespace that already exists. Use a new name for a fresh copy: on WIP as of 2026-10-22, a namespace deleted and created again under the same name still resolves names to the deleted terminologies (CASE-927).

## Open it

A second app instance on the demo namespace (the dev container stays on `aa`):

```bash
WIP_NAMESPACE=aa-demo-book PORT=3018 VITE_PORT=5183 \
  WIP_API_KEY=$(cat ~/.wip-deploy/default/secrets/api-key) \
  NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev
# then http://localhost:5183/
```

`WIP_API_KEY` is passed explicitly because the server does not read `WIP_API_KEY_FILE` yet (KNOWN_ISSUES).

## Import it

`demo/manuscript.txt` is the same prose as plain text (regenerate with `npx tsx tools/load-demo-book.ts --manuscript`). Import it on a fresh namespace's Import page. It uses every chapter heading form the parser reads (`Chapter 1: …`, a number-only `Chapter 2`, Roman `Chapter III: …`, an em dash, `## 5. …`) and every scene break (`***`, `* * *`, `---`, `~~~`). The prologue, interlude and epilogue import as unnumbered parts, and the title page as unticked front matter. The AI extraction (characters, locations, threads) needs an Anthropic key; `tests/e2e/import.spec.ts` imports this manuscript with a stubbed extraction.

## What to look at

| Feature | Where in the book |
|---|---|
| Chapter numbering: no number, continue, restart | Prologue, The Bell (interlude) and Epilogue have no number; "Part Two: The Logbook" restarts at 1, Low Water continues at 2 |
| Number-only chapter title | Chapter 2 |
| Imported scene title ("Ch2 Scene 1", shown without the prefix) | first scene of Chapter 2 |
| Every event type | prologue, scenes, flashback ("Two Keepers, 1911"), dream, interlude, epilogue, backstory ("Wreck of the Marguerite", in no chapter: Timeline only) |
| Story time out of book order | the flashback and the 1911 backstory sort before chapter 1 on the Timeline |
| Merge | characters Old Wick → Edmund Wick; locations The Lighthouse → Cape Varn Light; threads Missing logbook → The missing logbook |
| Scene check: names inside names, accents | "Tam" and "Tamsin"; Inès Duval, Café Morvan, Margit Söll |
| Scene check suggestion | "The Salvage Claim" mentions Tamsin without tagging her |
| Dismissed suggestion | "The Bow at Low Water" has dismissed Margit Söll |
| Relationships | 12 across 6 characters (Wren has 4); some with a start year, an end year, both or neither |
| Every role, location type in use, every thread status, every note type | Characters, Locations, Plot Threads, Notes |
| World rules with related characters and locations | 3 rules |
| Prompts | 2 custom prompts; the Prompts page can still add the starters |
| Images | portraits (avatars) for Wren and Edmund; a map on two locations; one illustration on a scene, a thread and a chapter; a reference on a note and a world rule; one image attached nowhere |
| Rename, Move, drag-and-drop, split, merge scenes | any chapter or scene |
| German UI | the language switch at the bottom of the sidebar |

Not covered: a scene titled like its chapter. WIP refuses a scene whose title is also a chapter's title in the same namespace (2026-10-22), so the demo avoids it.

## A second manuscript: *The Crumbs of Meridian Tower*

`demo/the-crumbs-of-meridian-tower.txt` (~6,800 words; prologue, 9 chapters, interlude, epilogue; 25 scenes) is a test manuscript for the import, not a demo book: two mice leave their office tower's basement, one is killed by a cat, the other comes home to the pest control's bait. The interlude is an email exchange, the front matter is a title and byline. Imported into `aa` on 2026-10-24 with the real AI extraction (about a minute); see ROADMAP Backlog for what that run showed about duplicate entities.
