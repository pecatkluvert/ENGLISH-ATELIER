# English Atelier · version 2

A static HTML/CSS/JavaScript app for studying the supplied Advanced Grammar & Vocabulary documents. Upload the files through GitHub’s browser interface and run them on GitHub Pages. No build step, account, API key or runtime dependency is required.

## What changed

- **Lessons follow the documents.** Units 1–5 include all 145 vocabulary entries, their meanings, the book’s examples or collocations, usage notes and links to the original supplied PDFs. Short explanatory notes organise this material for study.
- **Practice follows the documents.** The original written tasks are presented as interactive questions. Reading exercises keep the source passage visible. Picture clues in Unit 5 become an animal-word bank.
- **Help is available while answering.** Clickable word banks, hints, question-number navigation, saved drafts within a practice round, skipping and an expandable lesson reference reduce unnecessary typing and tab switching.
- **Open writing is not falsely marked wrong.** Responses, rewrites and context-sensitive collocation judgements use suggested models. The 176 source tasks comprise 144 automatically marked questions and 32 model-comparison tasks. Editorial explanations and model answers are not a publisher answer key.
- **The navigation is ready for the whole book.** A searchable directory covers unit numbers 1–116. The book has separate 60a and 60b entries, so the directory contains 117 sections. Search by title or number, filter ranges and availability, jump directly to a unit, or use previous/next links and the unit switcher (Ctrl/Cmd+K).
- **Future content is clearly distinguished.** Only Units 1–5 have lesson documents. Other titles and page numbers come from the supplied contents screenshots and display “Material not added yet”. No lessons or questions have been invented for those units.
- **Large-course loading is lighter.** The directory reads lightweight metadata. Each unit’s full JSON is fetched on demand and cached for the current visit. A vocabulary search loads the available units to search their text.

Spacing, punctuation and obvious scan errors have been corrected in transcriptions. Definitions are condensed for readability. The original PDFs are included for comparison. Some English combinations admit more than one answer; open tasks invite comparison rather than treating one model as the only correct wording.

## Download and upload to GitHub

1. Download and **extract** the ZIP. Do not upload the ZIP as the website.
2. Open your repository in GitHub and choose **Add file → Upload files**.
3. Drag the extracted folder’s **contents**, including subfolders, into the upload area. Keep `index.html` directly at the repository root, not inside an extra app folder. Commit the upload.
4. Upload the MP3 recordings into **`audio/` at the repository root**, beside `index.html` and `data/`.
5. In the repository, open **Settings → Pages**.
6. Choose **Deploy from a branch**, select your branch (usually `main`) and **`/ (root)`**, and save.
7. Open the Pages website URL when GitHub finishes publishing. A project URL usually looks like `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.

If you are updating version 1, upload all files from the new ZIP, including `catalog.json`, `sources/`, `core.js`, the new unit JSON files and the new schema. Keep your existing MP3s in `audio/`. Uploading a new README into that folder does not require deleting your recordings.

GitHub Pages support for private repositories depends on your plan. GitHub’s browser upload limit is 25 MiB per file. The supplied PDFs and app files are below that limit; check the sizes of your MP3s.

## Files and paths

```text
repository-root/
  index.html
  styles.css
  app.js
  core.js
  assets/favicon.svg
  data/
    catalog.json             # 117 section titles; unit numbers 1–116, including 60a/60b
    units.json               # Registered units with available content
    unit-1.json              # All lesson and exercise content for this unit
    unit-2.json
    unit-3.json
    unit-4.json
    unit-5.json
    audio-library.json       # Exact filenames from your screenshot
  sources/
    unit-1.pdf               # Supplied original pages for comparison
    unit-2.pdf
    unit-3.pdf
    unit-4.pdf
    unit-5.pdf
  audio/
    README.md
    AV-001-2.mp3              # You upload the recordings here
    ...
  unit-template.json
  unit.schema.json
  README.md
  START-HERE.txt
  package.json               # Optional developer checks; not needed to run the site
  tools/index.mjs
  tools/validate.mjs
  tests/core.test.mjs
```

## Audio: exact upload folder

**Put every MP3 inside `audio/`, beside `index.html`.** Keep the original filenames and case. The known paths are:

```text
audio/AV-00.mp3
audio/AV-001-2.mp3
audio/AV-011-2.mp3
audio/AV-018-2.mp3
audio/AV-023-3.mp3
audio/AV-031-3.mp3
audio/AV-034-4.mp3
audio/AV-037-2.mp3
audio/AV-042-1.mp3
audio/AV-043-3.mp3
audio/AV-052-1.mp3
audio/AV-056-2.mp3
audio/AV-069-1.mp3
audio/AV-070-1.mp3
audio/AV-081-1.mp3
audio/AV-091-2.mp3
audio/AV-104-1.mp3
```

The ZIP contains the track list, **not the recordings**. In GitHub, open the `audio/` folder, choose **Add file → Upload files**, and upload the actual MP3s.

Choose a unit’s track on its Listening tab. Your selection is saved in that browser. `AV-001-2.mp3` is offered as an **unverified filename-based suggestion** for Unit 1, Exercise 2. The screenshot does not prove track-to-unit mappings or supply audio answers.

For a verified shared default, edit that unit JSON’s existing `audio` object and set:

```json
"track": "audio/AV-001-2.mp3"
```

Keep its other fields and listening activities. A browser’s saved selection overrides this default. Add new filenames to `data/audio-library.json` when needed. **Preview local MP3s** plays files selected from your device without uploading them; select them again after reopening the page.

Unit 1 includes the original two five-extract listening answer sheets. Since no recording, transcript or verified listening key was supplied, responses save without automatic grading. If you have a verified key, replace an activity’s `"answerKey": null` with an array of exact option strings, one per extract in order. The check button then appears. Do not guess the key. Listening remains separate from written-question progress.

## Add Unit 6 or any later unit using only GitHub’s browser

The titles for Units 1–116 are already in `data/catalog.json`. They become available when you register their actual content.

1. Copy `unit-template.json` to a new file named `data/unit-6.json`.
2. Replace all demonstration text with lessons, examples and tasks from the new supplied document. The template is only a format example, not a lesson for the book’s Unit 6.
3. Set `"id": "unit-6"`, `"number": 6`, and `"label": "6"`. Use the book title `Arguing` for Unit 6. Keep IDs unique and stable.
4. Change the schema reference to `"$schema": "../unit.schema.json"`, because this file now lives in `data/`.
5. If including the original PDF, upload it as `sources/unit-6.pdf` and set `source.pdf` to that path.
6. In the existing `units` array in `data/units.json`, add a comma after the previous entry, then add:

```json
{"id": "unit-6", "file": "unit-6.json"}
```

7. Commit both files. After Pages republishes, Unit 6 will be available in the directory. **No JavaScript or HTML change is needed.** The minimal entry above works; its detailed counts appear after the lesson is opened. Existing entries contain optional precomputed metadata for immediate totals.

For Unit 60’s split sections, use these distinct identifiers:

```text
file                 id         number   label
unit-60a.json         unit-60a   60       "60a"
unit-60b.json         unit-60b   60       "60b"
```

The catalog preserves their book order between Units 59 and 61. Entering `60` in the unit finder shows both sections; entering `60b` finds that section directly.

### Optional index generation

If you have Node.js 20+, you can upload the new JSON files and use this command locally to discover them and rebuild the full metadata automatically:

```sh
npm run index
npm run validate
npm test
```

No `npm install` is required. `npm run index` scans `data/unit-N.json` (including `unit-60a.json` and `unit-60b.json`), validates content, registers the files and computes counts and current question keys. It never creates lessons for missing units. Commit its updated `data/units.json` too.

The catalog contains all planned book titles, so there is normally no need to edit it. When adding something beyond the book, add a catalog entry with a unique ID, label, number, order, title and page before indexing.

## Unit JSON structure

A unit contains `lessons`, `vocabulary`, `exerciseGroups` and optional `audio`. Lesson sections can list `terms` that refer to vocabulary entries. These entries are shown directly in the Lesson tab, so lesson material includes the definitions and book examples.

```json
{
  "title": "Your lesson section",
  "body": "Explain this part of the supplied document.",
  "terms": ["meticulous"],
  "examples": []
}
```

A vocabulary entry:

```json
{
  "term": "meticulous",
  "definition": "Very careful about details.",
  "example": "Mother was always meticulous about her appearance.",
  "note": "Connotation can depend on context.",
  "sourcePage": 4,
  "exampleSource": "Supplied document: lesson page"
}
```

### Automatically marked questions

Multiple choice also supports true/false, matching and classification. Use original options when available.

```json
{
  "id": "q-1",
  "type": "choice",
  "prompt": "Scarlet has moral scruples.",
  "options": ["True", "False"],
  "answer": "False",
  "explanation": "The character outline describes her as immoral.",
  "hint": "Find Scarlet’s outline in the passage."
}
```

Written completion accepts an array of alternatives:

```json
{
  "id": "q-1",
  "type": "text",
  "prompt": "He won fair and ___.",
  "answer": ["square"],
  "explanation": "The fixed phrase is fair and square."
}
```

Marking ignores case, extra spaces, typographic apostrophes/dashes and final sentence punctuation. It still checks spelling and word order. List acceptable alternatives explicitly; the app does not use AI to guess synonyms.

### Open-ended writing and model comparison

Use `self` for free responses, rewrites and judgements where context allows several answers:

```json
{
  "id": "q-1",
  "type": "self",
  "prompt": "Your garden looks wonderful!",
  "modelAnswer": "Thank you. It’s my pride and joy.",
  "explanation": "Use a suitable pair phrase. Other sensible responses are possible."
}
```

The user writes first, then compares with the suggested model. These responses are saved separately in `writing` and excluded from automatic accuracy and mistake totals.

### Exercise-group assistance

An exercise group can include:

- `passage` and `passageTitle` for the original reading context.
- `wordBank`, an array of clickable words or phrases. Selecting one inserts it into the text answer, where the user can edit it.
- `bankRequiresChange: true` when a root needs an ending or other transformation.
- `support` for the source’s prefix/suffix list or another instruction.
- `sourcePage` and per-question `bookNumber` for source references.
- `referenceTerms` on a question to limit the expandable lesson reference to relevant vocabulary; otherwise the unit’s vocabulary is shown.

Displayed content is escaped as text, so fields do not support raw HTML.

## Progress and upgrading

Progress stays in the current browser. Saved words, audio selections, listening notes and marked-as-read lessons from version 1 are retained. The document-based exercises use new question IDs: previous generated-practice scores do not count toward the new tasks, and the old answers are left in the backup data. Do not rename exercise IDs after students have begun unless you are replacing the task.

Use **Progress & settings → Export progress** before switching devices or clearing browser data. Import replaces the current browser’s saved progress after confirmation. Private browsing, a different device or a different website origin starts a separate workspace.

## Local preview and validation

Double-clicking `index.html` is insufficient because browsers restrict JSON fetching through `file://`. With Python installed, run this from the app directory:

```sh
python -m http.server 8000
```

Open `http://localhost:8000`. Stop with Ctrl+C.

Optional dependency-free checks with Node.js 20+:

```sh
npm run validate
npm test
```

Validation covers unit structure, source PDFs, lesson references, question IDs and answers, navigation metadata and audio paths. Tests cover all book sections, split numbering, filters, lazy loading, source-task coverage, answer matching and progress. This release also passed simulated-DOM checks for the main interactions. A real-browser visual check was unavailable because the managed environment’s browser-control tool was not exposed. Actual MP3 playback remains unverified until recordings are uploaded.

## Troubleshooting

- **Unit listed but unavailable:** add its actual JSON and register its ID/file in `data/units.json`. A contents title alone is not a lesson.
- **Unit will not open:** check JSON syntax and matching IDs, or run the validator. A bad unit file does not prevent browsing the rest of the directory.
- **Old website after uploading:** wait for Pages to finish publishing, then refresh. Upload all new CSS/JS/JSON files together.
- **PDF missing:** upload the whole `sources/` folder, preserving the paths in each unit JSON.
- **MP3 missing:** check the exact filename and case under `audio/`, then choose the correct track in Listening.
- **Setup-help screen:** use an HTTP(S) website or local server, and confirm `data/units.json` and `data/catalog.json` were uploaded.
- **Pronunciation silent:** the optional speaker button uses the device’s text-to-speech voices, which vary by browser. It is separate from the course recordings.
