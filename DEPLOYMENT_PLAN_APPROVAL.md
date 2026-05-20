# Production hardening plan (Vercel + CRA)

## Information Gathered
- `npm run build` succeeds and produced a CRA build targeting `/` (no build-time asset resolution failures).
- `public/index.html` uses absolute paths:
  - `<link rel="icon" href="/favicon.ico" />`
  - `<link rel="apple-touch-icon" href="/logo192.png" />`
  - `<link rel="manifest" href="/manifest.json" />`
  These are production-safe for Vercel.
- `public/manifest.json` icon `src` values are relative to `/public` (e.g., `favicon.ico`, `logo192.png`, `logo512.png`) which CRA/Vercel will serve correctly.
- Routing: app uses `BrowserRouter` (React Router v6). Vercel must rewrite deep routes to `index.html`.
- High-risk runtime issue: `src/index.js` registers `/sw.js` whenever `navigator.serviceWorker` exists, regardless of environment. This is dangerous on production because:
  - the custom `public/sw.js` can intercept/enqueue watchlist API requests and create stale/offline behavior across redeploys.
  - it can also cause intermittent runtime/network issues.

## Plan
### Step A — Disable service worker in production on Vercel
- Edit `src/index.js`:
  - Only register `/sw.js` when running in development.
  - Keep existing mock/MSW behavior unchanged.

### Step B — Add basic guard for manifest/favicons resolution (no functional change)
- Verify nothing else references `%PUBLIC_URL%` placeholders in production assets.
- (Likely no change needed; only re-check after deploy.)

### Step C — Ensure Vercel rewrites are SPA-safe
- Keep `vercel.json` SPA rewrite, but confirm it doesn’t accidentally rewrite `/static/*`.
- (Likely no change unless build output checks show asset 404s.)

### Step D — Production verification checklist
- Run `npm run build` again.
- Inspect deployed `/favicon.ico` and `/manifest.json` response codes.
- Manual route deep-links + hard refresh.
- Console/network checks.

## Dependent Files to be edited
- `src/index.js`

## Followup steps
- After edits: run `npm run build` locally.
- Deploy to Vercel.
- Perform manual validation (see checklist).

<ask_followup_question>
Approve editing `src/index.js` to ONLY register `/sw.js` in development (disable in production) to eliminate SW-related intermittent runtime/stale-cache issues on Vercel?
</ask_followup_question>

