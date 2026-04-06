# AuthorAssist User Manual

AuthorAssist is a novel writing assistant. You import a manuscript, and it extracts your chapters, scenes, characters, locations, and plot threads. From there, you manage everything through a set of purpose-built pages — write prose, track storylines, organize your world, and keep your novel consistent.

This manual covers every page and feature in the app.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard](#dashboard)
3. [Importing a Manuscript](#importing-a-manuscript)
4. [Scenes & Prose Editor](#scenes--prose-editor)
5. [Corkboard](#corkboard)
6. [Chapters](#chapters)
7. [Timeline](#timeline)
8. [Characters](#characters)
9. [Locations](#locations)
10. [Plot Threads](#plot-threads)
11. [Notes](#notes)
12. [World Rules](#world-rules)
13. [Ask Bar (AI Assistant)](#ask-bar-ai-assistant)
14. [Managing Aliases](#managing-aliases)
15. [Scene Validation](#scene-validation)
16. [Drafts & Auto-Save](#drafts--auto-save)
17. [Resetting Your Book](#resetting-your-book)

---

## Getting Started

When you first open AuthorAssist, the Dashboard shows an empty project. You have two ways to begin:

1. **Import a manuscript** — Paste or upload your existing text on the Import page. AuthorAssist will parse chapters and scenes, extract characters, locations, and plot threads using AI, and create everything for you.
2. **Build from scratch** — Create chapters, scenes, characters, locations, and plot threads one by one using the "New" buttons on each page.

Most authors start with an import and then refine from there.

---

## Dashboard

The Dashboard is your home page. It shows:

- **Project header** — Your book's title, author, genre, time system, and description.
- **Stats cards** — Quick counts for Characters, Locations, Chapters, Scenes, and Plot Threads. Click any card to jump to that page.
- **Recent Scenes** — The five most recently edited scenes, with chapter and location info. Click to open in the editor.
- **Open Plot Threads** — All threads with status "Open" or "Developing," with color-coded status badges.
- **Chapter Progress** — Visual cards for every chapter showing its status (Outline, Draft, Revised, or Final).

At the bottom is the **Danger Zone** — see [Resetting Your Book](#resetting-your-book).

---

## Importing a Manuscript

The Import page walks you through a multi-step process to bring an existing manuscript into AuthorAssist.

### Step 1: Upload Your Text

Paste your manuscript into the text area, or click **Upload .txt** to load a plain text or Markdown file. A word count appears below the text area. When ready, click **Parse Structure**.

AuthorAssist detects chapters by looking for headings like "Chapter 1," "CHAPTER ONE," "KAPITEL 3," Roman numerals, and similar patterns. Each chapter is split into scenes at section breaks (blank lines, `***`, `---`, etc.).

### Step 2: Review Structure

You'll see your detected chapters and scenes. For each chapter:

- **Checkbox** — Uncheck to exclude a chapter from import.
- **Title** — Editable. Fix any titles the parser got wrong.
- **Scene count** — Click to expand and see individual scenes. Each scene has its own checkbox and editable title.

When satisfied, click **Extract Entities**.

### Step 3: Review Entities

AuthorAssist uses AI to extract characters, locations, and plot threads from your text. This happens chapter by chapter — you'll see a progress bar.

Once extraction finishes, you'll see three tabs: **Characters**, **Locations**, and **Plot Threads**. For each entity:

- **Name** — The extracted name.
- **Role / Type** — A dropdown for character role (Protagonist, Antagonist, Supporting, etc.) or location type (City, Building, Room, etc.). If the AI extracted an invalid value, it appears with a red background and "(invalid)" label — select a valid option before importing.
- **Description** — Editable text from the AI extraction.
- **Remove** — Click the X to exclude an entity.
- **Expand/Collapse** — Click to show or hide details.

#### Merging Duplicates

If the AI extracted "Dr. Smith" and "Smith" as separate characters, you can merge them:

1. Check the boxes next to both entities.
2. Click **Merge**.
3. The merged entity keeps the longest name and combines descriptions.

Use **Select All** / **Deselect All** to manage selections quickly.

When everything looks right, click **Create & Import**. AuthorAssist creates all entities and scenes in sequence. On completion, you'll see links to the Dashboard and Chapters page.

---

## Scenes & Prose Editor

The Scenes page is where you write. It has two panes:

### Left Pane: Scene List

All scenes grouped by chapter. Each entry shows the scene title, location, and participating characters. Click a scene to open it in the editor. Use the **New Scene** button at the top to create a new scene.

### Right Pane: Scene Editor

When a scene is selected, the editor loads with a toolbar and a rich text area.

#### Toolbar

- **Title** — Click to edit the scene title.
- **Arrow buttons** — Navigate to the previous or next scene.
- **Split** — Splits the scene at the current cursor position (paragraph boundary). The text before the cursor stays in the current scene; the text after becomes a new scene.
- **Maximize** — Hides the context panels for a wider editing area. Click again to restore.
- **Composition Mode** — Full-screen distraction-free writing. Press Escape to exit.
- **Save** — Saves your prose to the server. Creates a new version of the scene document.

#### Writing

The editor supports rich text with keyboard shortcuts:

| Shortcut | Effect |
|----------|--------|
| **Ctrl+B** | Bold |
| **Ctrl+I** | Italic |
| **Ctrl+Shift+1** | Heading 1 |
| **Ctrl+Shift+2** | Heading 2 |
| **Ctrl+Shift+8** | Bullet list |
| **Ctrl+Shift+9** | Numbered list |

Your work is automatically saved to your browser's local storage every few seconds. See [Drafts & Auto-Save](#drafts--auto-save) for details.

#### Context Panels (Right Sidebar)

The sidebar shows contextual information about the current scene. Use the tabs to switch between:

**Metadata** — Edit the scene's properties:
- Event Type (Scene, Backstory, Flashback, Flash Forward, Dream, Prologue, Epilogue, Interlude)
- Story Time (text description, e.g., "Day 3, evening")
- Story Time Sort (a number for timeline ordering)
- Location (select from your locations)
- Summary
- Emotional Beat (a one-line mood/tone note)

**Relationships** — Link characters and plot threads to this scene. Select from dropdowns to add; click X to remove.

**Context tabs** — Quick-reference cards for characters, locations, plot threads, notes, and world rules related to this scene. Click any card to navigate to that entity's detail page.

**Validate** — See [Scene Validation](#scene-validation).

#### Actions

- **Edit** (pencil icon) — Opens the edit form for the scene's metadata.
- **Delete** (trash icon) — Deletes the scene after confirmation.

---

## Corkboard

The Corkboard shows all scenes as visual cards — a bird's-eye view of your novel.

### Controls

- **Group By** — Organize cards by Chapter, Character, Plot Thread, or show them flat (ungrouped).
- **Color By** — Color-code card borders by Status, Event Type, or POV Character.
- **Chapter Filter** — Show only scenes from a specific chapter.

### Scene Cards

Each card shows:
- Title
- Summary (truncated)
- Word count
- Event type badge (if not a regular scene)
- Character avatars (up to 3, with a "+N" indicator for more)

Click any card to open that scene in the editor.

---

## Chapters

The Chapters page shows your novel's structure as expandable cards.

### Chapter Card

Each chapter shows:
- Chapter number
- Title
- Status badge (Outline, Draft, Revised, Final)
- POV character (if set)
- Scene count

Click a chapter to expand it and see its scenes listed below. Each scene shows its title, location, characters, and emotional beat. Click a scene to jump to the editor.

### Actions

- **New Chapter** — Creates a new chapter.
- **New Scene** — Creates a new scene (you'll pick the chapter in the form).
- **Edit** (pencil icon) — Edit the chapter's title, summary, status, POV, themes, and notes.
- **Delete** (trash icon) — Deletes the chapter. Scenes within it are unassigned but not deleted.

---

## Timeline

The Timeline shows your scenes in chronological order, visualized as a vertical timeline.

### View Modes

- **By Time** — Groups scenes by their Story Time Sort value. Scenes at the same time point appear together under a "Parallel events" indicator.
- **By Chapter** — Groups scenes by chapter order.

### Filters

- **Character** — Show only scenes involving a specific character.
- **Location** — Show only scenes at a specific location.

Filters can be combined. If no scenes match, a "No events" message appears.

### Timeline Cards

Each card shows the scene title, event type, location, time, emotional beat, and character avatars. Click a card to open the scene in the editor.

---

## Characters

### List View

Shows all characters as cards in a responsive grid. Each card displays:
- Name
- Role badge (color-coded: Protagonist, Deuteragonist, Antagonist, Supporting, Narrator, Minor, Mentioned)
- Age
- Description (truncated)
- Relationship count

Click a card to see the full detail view.

### Detail View

The detail view shows everything about a character:

- **Header** — Avatar (initial), name, role badge, age.
- **Description** — Full character description.
- **Aliases** — See [Managing Aliases](#managing-aliases).
- **Character Bible** — Sections for Personality, Backstory, Goals, Flaws, Voice Notes, and Arc Summary. Only sections with content are shown.
- **Relationships** — Related characters with relationship type, description, and time range.

### Actions

- **New Character** — Opens the create form. Required fields: Name and Role.
- **Edit** (pencil) — Opens the edit form with current data pre-filled.
- **Delete** (trash) — Deletes the character after confirmation.

---

## Locations

### List View

Shows locations as cards with name, type badge (City, Town, Building, Room, Outdoor, Vehicle, Realm, Virtual, Other), description, and atmosphere.

### Detail View

Full location details including:
- Type badge
- Description
- Aliases (see [Managing Aliases](#managing-aliases))
- Atmosphere, Rules, Significance (shown if content exists)

### Actions

- **New Location** — Create form. Required: Name.
- **Edit** / **Delete** — Same pattern as Characters.

---

## Plot Threads

Plot threads are grouped by status:

- **Open** — Newly introduced threads.
- **Developing** — Threads being actively explored.
- **Climax** — Threads at their peak.
- **Resolved** — Completed threads.
- **Abandoned** — Threads that were dropped.

Each thread card shows:
- Title and description
- Opening and resolution chapter numbers (if set)
- Linked characters
- Aliases (see [Managing Aliases](#managing-aliases))

### Actions

- **New Thread** — Create form. Required: Title and Status.
- **Edit** (pencil) — Inline edit button.
- **Delete** (trash) — Inline delete with "Yes/No" confirmation.

---

## Notes

Notes are free-form entries for ideas, research, and reminders. They can be filtered by type:

- **Idea** — Story ideas and "what if" notes.
- **Research** — Reference material and facts.
- **Voice** — Character voice notes and dialogue experiments.
- **Theme** — Thematic notes and motifs.
- **Revision** — Notes for future editing passes.
- **Brainstorm** — Open-ended brainstorming.

Click a type button to filter, or click **All** to see everything.

Each note shows its full content, type badge, and any linked entities:
- Tags (free-form labels)
- Linked Characters, Locations, and Plot Threads (as colored pills)

### Actions

- **New Note** — Create form. Required: Title, Type, Content.
- **Edit** / **Delete** — Inline buttons.

---

## World Rules

World Rules define the rules and constraints of your story's world — magic systems, social structures, physical laws, etc. They're grouped by domain (e.g., "Magic," "Society," "Geography").

Each rule shows:
- Name and domain heading
- Rule text
- Implications and Exceptions (if set)
- Related Characters and Locations (as colored pills)

### Actions

- **New Rule** — Create form. Required: Name, Rule text.
- **Edit** / **Delete** — Inline buttons.

---

## Ask Bar (AI Assistant)

The Ask Bar is a floating chat button in the bottom-right corner of every page. Click it to open a conversation with an AI assistant that has read access to all your book data.

Use it to:
- Ask questions about your characters, plot, or world ("Tell me everything about Sunny")
- Get summaries across your novel ("Which scenes involve both Carter and Alpha?")
- Explore your story data without navigating between pages

### How to Use

1. Click the blue chat bubble in the bottom-right corner.
2. Type your question and press Enter or click Send.
3. The assistant reads your book data and responds.
4. Continue the conversation — it remembers context within the session.
5. Click **New** to start a fresh conversation.
6. Click **X** to close the panel.

The assistant can read your data but cannot modify it — it's a safe way to explore your novel.

---

## Managing Aliases

Characters, Locations, and Plot Threads can have **aliases** — alternative names that your prose might use. For example, a character named "Seran" might have the alias "Sunny."

Aliases appear in the **"Also known as"** section on detail pages.

### Adding an Alias

1. Navigate to the entity's detail page (e.g., click a character card).
2. In the "Also known as" section, type the new alias in the input field.
3. Click the **+** button or press Enter.
4. The alias is saved immediately.

### Removing an Alias

Click the **X** on any alias pill to remove it. The change is saved immediately.

### Why Aliases Matter

Aliases are used by [Scene Validation](#scene-validation) to match mentions in your prose. If your character "Elizabeth" is sometimes called "Liz" in the text, adding "Liz" as an alias ensures validation can find those mentions.

---

## Scene Validation

Scene Validation scans your prose for mentions of characters, locations, and plot thread names, then checks whether those entities are linked to the scene.

### How It Works

1. Open a scene in the editor.
2. Click the **shield icon** in the toolbar, or open the **Validate** tab in the context panel.
3. The validator scans the prose for entity names and aliases.

### Validation States

Each detected mention gets one of four states:

- **Confirmed** — The entity is mentioned in the prose AND linked to the scene. Everything is consistent.
- **Missing** — The entity is linked to the scene but NOT mentioned in the prose. You may have removed a reference or the entity appears under a name not in its aliases.
- **Detected** — The entity is mentioned in the prose but NOT linked to the scene. You probably need to add it to the scene's metadata.
- **Suppressed** — A mention you've explicitly dismissed (e.g., a false positive where "March" is a month, not a character).

### Actions

- **Add** — Link a detected entity to the scene.
- **Dismiss** — Suppress a false positive. It won't appear as a warning again.
- **Remove** — Unlink an entity from the scene.
- **Restore** — Un-suppress a previously dismissed mention.

---

## Drafts & Auto-Save

AuthorAssist has two layers of saving for scene prose:

### Auto-Save (Local)

Every few seconds, your work is saved to your browser's local storage. This protects against:
- Accidental tab closure
- Browser crashes
- Navigating away without saving

If you have unsaved drafts, an **Unsaved Draft Banner** appears at the top of the page with a link to resume editing. You can:
- **Click the link** to return to the scene and continue editing.
- **Discard** to clear the local draft.

Local drafts expire after 24 hours.

### Explicit Save (Server)

Click the **Save** button in the editor toolbar to persist your prose to the server. This creates a new version of the scene document. Once saved, the local draft is cleared.

**Best practice:** Save frequently. Local auto-save is a safety net, not a replacement for server saves.

---

## Resetting Your Book

The Dashboard's **Danger Zone** lets you delete book data to start fresh. This is irreversible.

1. Scroll to the bottom of the Dashboard.
2. Click **Reset Book**.
3. Select what to delete:
   - Chapters & Scenes (including book structure)
   - Characters
   - Locations
   - Plot Threads
   - Notes
   - World Rules
   - Name registries (the character/location/thread name lists)
4. Confirm deletion.

Templates and fixed terminologies (role types, status values, etc.) are never affected — only your documents and name entries are deleted.

---

## Keyboard Shortcuts

| Shortcut | Where | Action |
|----------|-------|--------|
| Ctrl+B | Scene Editor | Bold |
| Ctrl+I | Scene Editor | Italic |
| Ctrl+Shift+1 | Scene Editor | Heading 1 |
| Ctrl+Shift+2 | Scene Editor | Heading 2 |
| Ctrl+Shift+8 | Scene Editor | Bullet list |
| Ctrl+Shift+9 | Scene Editor | Numbered list |
| Escape | Composition Mode | Exit composition mode |
| Enter | Alias input, Note tags | Add the typed value |

---

## Glossary

| Term | Meaning |
|------|---------|
| **Scene** | A unit of prose within a chapter. The building block of your novel. |
| **Chapter** | A container for scenes, with a status tracking your progress. |
| **Plot Thread** | A storyline that runs across multiple scenes and chapters. |
| **Alias** | An alternative name for a character, location, or plot thread. |
| **Term** | An entry in a controlled vocabulary (e.g., a character role like "Protagonist"). |
| **Terminology** | A controlled vocabulary (e.g., the set of all character roles). |
| **Event Type** | The type of scene: Scene, Backstory, Flashback, Dream, etc. |
| **Story Time Sort** | A numeric value used to order scenes on the Timeline. |
| **Emotional Beat** | A one-line note describing the mood or tone of a scene. |
| **Identity field** | The field that makes an entity unique (e.g., a character's name). |
| **Composition Mode** | Full-screen distraction-free writing mode in the Scene Editor. |
| **Validation** | Checking that entities mentioned in prose are properly linked to the scene. |
