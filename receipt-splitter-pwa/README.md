# Split Studio

A polished mobile-first PWA for splitting receipts privately in the browser.

## What works now

- Manual bill editor with title, merchant, date, currency, items, tax, service, tip, discount, and printed-total reconciliation.
- Even split with exact cent allocation.
- By-item split with per-person assignment controls and an Unassigned bucket.
- Summary cards with exact totals.
- Native share sheet when supported, clipboard fallback otherwise.
- Local browser history.
- Installable PWA manifest and offline service worker.
- No backend, accounts, analytics, payments, ads, or paid hosting requirements.

## Run locally

```bash
node serve.cjs
```

Then open:

```text
http://127.0.0.1:4173
```

## Publish free

1. Create a public GitHub repository.
2. Put these files in the repository root.
3. In GitHub, open Settings > Pages.
4. Set Source to `Deploy from a branch`.
5. Pick `main` and `/root`.
6. Share the GitHub Pages URL with friends.

## MVP tradeoffs

- OCR is intentionally skipped in this web MVP. The app is built around a fast manual editor so it stays free, reliable, and easy to share.
- Data is stored in the browser's local storage. Clearing browser data removes history.
- PWA install support depends on the browser and OS.
