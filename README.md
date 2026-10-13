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
