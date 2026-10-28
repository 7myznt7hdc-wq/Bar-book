# Bar Book – bartender PWA
Run locally: `python3 -m http.server 8080` here, open http://localhost:8080 (installable once served over HTTPS).

## Data
- `data/cocktails.json` – 455 drinks, built by `python3 scripts/import_cocktaildb.py`
  - `data/classics.json`: 38 house specs (classics, modern classics, tiki, sours, highballs, mocktails) in ml.
  - TheCocktailDB (https://www.thecocktaildb.com), free public test API key "1". Measures converted to ml
    (1 oz = 30 ml, 1 cl = 10 ml, tsp 5 ml, tbsp 15 ml, shot 30 ml); non-convertible amounts kept as text.
  - **Licence:** TheCocktailDB is NOT an open-licence dataset. Its free API is offered for development/educational
    use; public/commercial apps are expected to become a supporter (Patreon) for a production API key.
    Check https://www.thecocktaildb.com/api.php before publishing widely. Each drink links back to its source page.
- `data/bars.json` – The World's 50 Best Bars 2026 (announced 7 Oct 2026, Milan). Signature drinks only with a
  source URL; specs only where the source gives them. Refresh list: `python3 scripts/refresh_bars.py <url> <year>`.

## Features
Search + spirit + category filters; bar pages; "Been there" (visited, date, note) stored in localStorage on the device.
My Recipes (#mine): add/edit/delete own drinks in localStorage, "Mine" badge + "★ My recipes" filter, JSON export/import backup.
Pre-batch (#batch): scale any recipe by serves or target volume, dilution %, pour per serve.
Bump the cache version in `sw.js` after changing files.

## Images (v6)
- Drink photos: TheCocktailDB `strDrinkThumb` (lists use `/preview`, detail pages full size, lazy-loaded). Same licence caveat as above.
- 27 of the 38 house specs matched by name to TheCocktailDB photos (`imgSource`); the rest use generated SVG art (glass by glass type, colour by spirit).
- Own recipes: optional photo, resized to 720 px JPEG and stored in localStorage.
- No bar photos (licensing); bar pages use generated gradient headers.
- Service worker caches viewed images (cache-first, max 250, `barbook-img-v1`).

## Seasonal (v8)
`data/seasonal.json` + `seasonal.js`: 10 drinks per fortnight from epoch 2026-01-05; dated events (Burns, Valentine's, Halloween, Bonfire Night, Christmas) win when the fortnight midpoint falls in their window, else UK season. Specs labelled "Bar Book recipe" are house specs. Test any date with `#seasonal/YYYY-MM-DD`.

## Favourites (v9)
`favs.js`: heart on every card/detail (keys c:/m:/s:), localStorage `barbook-favs`, included in My Recipes export/import. Nav: 5 tabs; "Saved" tab holds a Favourites | My recipes toggle.

## v10 – routing fix
Hash routes are split at the first `/` and *then* each part is decoded, so names like `50/50` or `9 1/2 Weeks` open correctly. Unknown items show a "not found" page.

## v11 – More tab
Tabs: Recipes · Saved · Seasonal · 50 Best · More. **More** contains:
- **Pre-batch** (also reachable from every recipe).
- **My Bar**: tick the bottles and ingredients you own (normalised, grouped list), then see *Make now* and *Missing 1* (grouped by what to buy).
- **Costs & GP**: enter bottle price (£) and size. Cost per serve and suggested sell price at your target GP% (default 75%, inc. 20% VAT optional) appear on recipes and batches.
- **Prep**: ice, glass chilling, techniques, syrups/infusions/oleo saccharum in ml/g.
- **Settings & backup**: ml/oz toggle (1 oz = 30 ml), GP target, VAT. **Backup has no server**: download/restore a `.json` file, or copy/paste a backup code (`BB1z.` gzip or `BB1.`). Everything lives only in this browser's localStorage (`barbook-*` keys), so back up before clearing site data or switching phones.

## Auto-updating the 50 Best Bars list
`.github/workflows/refresh-bars.yml` runs on Mondays 06:17 UTC, Sept to Nov, and can also be run by hand (Actions → "Refresh 50 Best Bars list" → Run workflow; `dry_run` defaults to true).
Safety rules (`scripts/refresh_bars.py`):
- Commits only if ranks **exactly 1–50** are parsed from the50.com and the list year is **newer** than the one in `data/bars.json` (otherwise exit 0, nothing changes; parse failure exits 2 and fails the run).
- Sourced signature drinks are kept, matched by bar name. New bars start as "unknown" until verified by hand. Recipes are never invented.
- If the file changes it bumps the `barbook-vN` cache in `sw.js` and commits as bar-book-bot. Pushes made with GITHUB_TOKEN don't trigger other workflows, so `pages.yml` also runs on `workflow_run` of this workflow.
Run locally: `python3 scripts/refresh_bars.py --dry-run` (or `--html saved.html`, `--force`).

## v15 – Cocktail of the Day
- `cotd.js` picks one drink per UK calendar day (Europe/London) from the drinks in `data/history.json`. It uses a seeded shuffle per cycle, so there are no repeats until every drink has appeared. It works offline.
- The card at the top of Recipes opens `#cotd`, which shows the history, sources, the full recipe (ml/oz, heart, Pre-batch) and the past 7 picks. `#cotd/YYYY-MM-DD` shows the pick for any date.
- Detail pages show a **History** section when a drink has one. `aliases` maps duplicate names (e.g. Dry Martini → Martini).
- History texts are short summaries written from the linked sources (Wikipedia). Disputed origins are stated as disputed.

## v16 – Shopping list, My notes, Practice
All three live in `extras.js` and run fully offline (service worker cache `barbook-v16`).

- **Shopping list** (More → Shopping list, `#shop`): add a drink with **Add to list** on any detail page, or use **Add to shopping list** on Saved / My Recipes to select several drinks at once. Ingredients are combined across drinks (scaled by serves) and split into *Bottles & spirits* and *Fresh & other*. Items already on your My Bar shelf are pre-ticked as "In My Bar"; tick or untick anything to override. Share (where the phone supports it), Copy as text, Clear all. Stored in `barbook-shop`.
- **My notes**: every drink detail page (library, My Recipes, Cocktail of the Day) has a My notes box with an optional 1–5 star rating. 50 Best signature drinks have a collapsible "My notes" on each card. Drinks with a note show a small note marker in list rows. Stored in `barbook-notes`.
- **Practice** (More → Practice, `#practice`): flashcards (name first, then reveal ml spec, method and glass; mark Got it / Again) or multiple choice (base spirit, glass, or an ingredient). Pick All, Favourites, Classics or My Recipes. Simple spaced repetition: Again cards come back within the session and are due again in 10 minutes; Got it pushes the next review out 1, 3, 7, 14, then 30 days. Daily streak, best streak and quiz score in `barbook-practice`.
- Backup / restore (Settings) now includes the shopping list, notes and practice progress.

## v17 – Bar skills, Glassware & garnish guides

- **Bar skills** (More → Bar skills, `#skills`, `#skill/<id>`): 18 beginner technique pages: shaking, dry & reverse dry shake, whip shake, stirring, building, throwing, double straining, muddling, layering/floating, measuring, ice & dilution, chilling glassware, syrups (simple, rich, honey, demerara), oleo saccharum, fat-washing, milk/clarified punch, infusions and rimming. Each page has what it is, when to use it, numbered steps, common mistakes, example drinks from the library (linked), related skills and 1–2 credited sources.
- **Glassware** (`#glassware`, `#glass/<id>`): 16 glasses, each with a hand-drawn SVG icon, a typical brim size in ml, what it's for, and library drinks served in it.
- **Garnishes** (`#garnishes`, `#garnish/<id>`): 14 garnishes (twist, swath, expressed oil, flamed peel, wheel, wedge, dehydrated wheel, mint sprig, herb sprigs, cherry, olive, cucumber ribbon, salt/sugar rims, grated nutmeg), each with step-by-step preparation and a tip.
- **Drink detail pages** now link the glass to its guide entry. TheCocktailDB glass names are normalised in `glassId()`, so for example "Cocktail glass" maps to Martini/cocktail glass and "Old-fashioned glass" maps to Rocks. Glasses with no guide entry (sour, margarita, coffee mug, punch bowl, beer, jar) stay plain text. Detail pages also link known garnishes and show "Techniques" chips worked out from the method text.
- **Sources:** all text is written in our own words and checked against Difford's Guide, Punch, Liquor.com, Serious Eats, Wikipedia, The Manual, Epicurious, Eater, Campari Academy, the Oxford Companion to Spirits & Cocktails and GOV.UK (for UK 25/35 ml spirit measures). Each page links 1–2 of these. Claims we couldn't verify were left out.
- **Offline:** `guides.js` is cached and the service worker cache is now `barbook-v17`. The 5-tab bar is unchanged.
