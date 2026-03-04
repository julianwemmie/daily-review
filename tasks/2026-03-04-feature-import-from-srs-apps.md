---
status: open
type: feature
created: 2026-03-04
---

# Import from spaced repetition apps

Add import functionality for Anki and Mochi via the web UI and CLI.

## Implementation decisions

### Architecture
- **Client-side parsing** — parse `.apkg`/`.mochi` in the browser (and locally in the CLI) using shared parser code in `src/shared/`. Send extracted cards as JSON to the API.
- **Shared parsers** — both the web UI and CLI reuse the same parsing + card mapping logic.

### Scheduling
- **Hybrid** — user chooses per import. Default is "start fresh" (`status: 'triaging'`, `state: 'new'`). Optional toggle to attempt mapping source scheduling data to FSRS parameters.

### Content handling
- **Strip HTML** from Anki fields, convert to plain text.
- **Cloze → separate cards** — each cloze deletion becomes its own card with `___` on the front and the answer on the back.
- **Media references kept as-is** with a warning banner that media won't display. No media upload for now.

### Tags and decks
- **Flatten deck hierarchy into tags** — e.g., Anki `Biology::Cell Biology` → tags `['Biology', 'Cell Biology']`. Mochi parent/child decks flattened the same way. Merged with the card's own tags.

### UI
- **Modal dialog** triggered from an "Import" button in the list view header.
- File drop zone, format auto-detection, preview table of cards to import, scheduling toggle.
- **Soft limit warning at 500+ cards** — user can proceed anyway.

### CLI
- `daily-review import <file.apkg|file.mochi>` — parses locally, uploads cards via the API.
- Flags: `--preserve-scheduling`, `--tags <extra,tags>`.

### Dependencies
- `jszip` — unzip both formats
- `sql.js` — parse Anki's SQLite DB (WASM)
- `transit-js` — parse Mochi's Transit JSON format
- Possibly `anki-reader` if it handles enough Anki parsing out of the box

### Out of scope
- Media upload/display
- Export functionality (separate feature)

## Supported formats

### Anki `.apkg`

A ZIP archive containing a SQLite database + media files.

**Contents:**
```
collection.anki21   # SQLite DB (prefer over .anki2, which is a stub in modern exports)
media               # JSON manifest: {"0": "image.png", "1": "audio.mp3"}
0, 1, 2, ...        # Media files renamed to integers
```

**SQLite tables:**

| Table | What it holds |
|-------|--------------|
| `col` | Single row — `models` (note types as JSON), `decks` (deck tree as JSON), config |
| `notes` | Card content — `flds` (fields joined by `\x1f`), `tags` (space-separated), `mid` (model ID) |
| `cards` | Scheduling — `ivl`, `factor` (ease in permille), `due`, `type`, `queue`, `reps`, `lapses` |
| `revlog` | Full review history — timestamp, ease button, interval, duration |

**Key details:**
- Cloze syntax: `{{c1::answer::hint}}` — each distinct number generates a card
- Tags: space-separated with leading/trailing spaces `" tag1 tag2 "`, hierarchy via `::`
- Deck hierarchy: `::` separator in deck names (e.g. `Biology::Cell Biology`)
- Field values contain raw HTML
- Media referenced in fields as `<img src="filename.png">` or `[sound:file.mp3]`
- IDs are epoch ms, but `mod` fields are epoch seconds (mixed units)
- Check for `collection.anki21` before `collection.anki2` (latter is a stub in modern exports)

**Parsing stack:** `jszip` + `sql.js` (WASM SQLite), or use the `anki-reader` npm package.

**Sources:**
- [AnkiDroid Database Structure Wiki](https://github.com/ankidroid/Anki-Android/wiki/Database-Structure)
- [Understanding the Anki APKG Format](https://eikowagenknecht.com/posts/understanding-the-anki-apkg-format/)
- [Anki Manual: Field Replacements](https://docs.ankiweb.net/templates/fields.html)
- [anki-reader (npm)](https://github.com/ewei068/anki-reader)

---

### Mochi `.mochi`

A ZIP archive containing EDN or Transit JSON data + a media folder.

**Contents:**
```
data.edn      # OR data.json (Transit JSON format)
media/        # folder with attachment files
```

**Top-level structure:**
```clojure
{:version 2
 :decks [{:id "deckAAAA" :name "Japanese" :cards [...]}]
 :cards [{:content "..." :deck-id "deckAAAA"}]
 :templates [{...}]}
```

**Key details:**
- Card content is Markdown, front/back separated by `---`
- Cloze syntax: `{{text}}` (simple) or `{{1::text}}` (grouped — each number = separate review)
- Media: stored in `media/` folder, referenced as `![](@media/filename.png)`
- Scheduling: review history per card (`date`, `interval`, `remembered?`) — no ease factor
- Deck hierarchy: flat list with `:parent-id` references
- Tags: set of strings, hierarchy via `/` (e.g. `philosophy/aristotle`)
- `data.json` uses Cognitect Transit encoding (maps as `["^ ", k, v, ...]`, keywords as `"~:name"`)

**Parsing stack:** `jszip` for the ZIP. `transit-js` for Transit JSON. No great EDN parser in JS — but the subset Mochi uses is small enough to hand-roll.

**Sources:**
- [Mochi Export Format Reference](https://mochi.cards/docs/import-and-export/mochi-format-reference/)
- [Mochi Advanced Formatting](https://mochi.cards/docs/markdown/advanced-formatting/)
- [Mochi API Reference](https://mochi.cards/docs/api/)
- [transit-js (npm)](https://github.com/cognitect/transit-js)
- [mochi-cards-exporter (Obsidian plugin, reference impl)](https://github.com/kalibetre/mochi-cards-exporter)
- [mochi2anki converter](https://github.com/AlexW00/mochi2anki)

## Side-by-side comparison

| Aspect | Anki `.apkg` | Mochi `.mochi` |
|--------|-------------|----------------|
| Archive | ZIP | ZIP |
| Data format | SQLite | EDN or Transit JSON |
| Front/back | Separate fields via `\x1f` | Markdown with `---` separator |
| Cloze syntax | `{{c1::text::hint}}` | `{{1::text}}` or `{{text}}` |
| Media | Integer filenames + JSON manifest | `media/` folder, `@media/` refs |
| Scheduling | Full (interval, ease, due, queue) | Review history only (date, interval, pass/fail) |
| Tags | Space-separated, `::` hierarchy | Set of strings, `/` hierarchy |
| Deck hierarchy | `::` in deck name | `:parent-id` references |
| Existing JS parsers | Yes (`anki-reader`) | None |
