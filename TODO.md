# TODO - Production-safe Vercel Deployment

- [ ] Step 1: Production Build Audit
  - [ ] Run `npm run build` and capture failures
  - [ ] Verify no unresolved `%PUBLIC_URL%` placeholders at runtime
  - [ ] Verify favicon/manifest/logo assets load paths correctly

- [ ] Step 2: Public Asset & Manifest Hardening
  - [ ] Remove stale comments/placeholders causing malformed production behavior (if any)
  - [ ] Ensure manifest icon `src` values resolve to `/favicon.ico`, `/logo192.png`, `/logo512.png`
  - [ ] Ensure `/favicon.ico`, `/manifest.json` return 200 in build output

- [ ] Step 3: Vercel Deployment Compatibility
  - [ ] Verify `vercel.json` SPA rewrites are correct for CRA
  - [ ] Ensure static assets are not rewritten to `index.html`
  - [ ] Ensure `vercel.json` has correct build/output config

- [ ] Step 4: Runtime Stability Audit
  - [ ] Audit env usage and runtime guards (no crashes if API fails)
  - [ ] Audit service worker/MWSW behavior so it never interferes in production
  - [ ] Ensure fetch URLs are absolute/valid on Vercel

- [ ] Step 5: Cache & Static File Reliability
  - [ ] Ensure service worker does not cache-bust incorrectly
  - [ ] Ensure PWA-related files only apply when intended

- [ ] Step 6: Final Production Validation
  - [ ] Run production build again
  - [ ] Validate routing with hard refresh + direct deep-links
  - [ ] Validate `/favicon.ico`, `/manifest.json` and icons

