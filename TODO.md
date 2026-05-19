- [ ] Update src/index.js to start MSW (worker.start) before rendering App in development.
- [x] Ensure public/mockServiceWorker.js exists; if missing, generate it with `npx msw init public/ --save`.

- [x] (In this run) worker.start was wired into src/index.js.


- [ ] Run npm start and hard reload; verify console shows "[MSW] Mocking enabled.".
- [ ] Verify POST /api/reviews returns 201 and review appears in UI.
- [x] Run npm run build to ensure clean build (build succeeds; existing ESLint warnings remain).


