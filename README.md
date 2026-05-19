# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Movie Data Layer

The app now reads movies through a provider abstraction with TMDb, OMDb, and local fallback adapters. Configure one of these in `.env.local`:

```bash
REACT_APP_MOVIE_PROVIDER=tmdb
REACT_APP_TMDB_API_KEY=your_tmdb_key
# or
REACT_APP_TMDB_BEARER_TOKEN=your_tmdb_v4_token

# Alternative provider:
REACT_APP_MOVIE_PROVIDER=omdb
REACT_APP_OMDB_API_KEY=your_omdb_key
```

If no provider key is present, the app automatically uses local fallback data so development and tests still run.

Copy `.env.example` to `.env` and fill in your own API credentials. The local `.env` file is ignored by git and should not be committed.

Resilience is handled in `src/services/api`: requests use a token bucket rate limiter, retry with exponential backoff, and trip a circuit breaker during repeated 429/5xx bursts. `src/services/cache/taggedCache.js` provides the in-app tag cache (`movies`, `movies:top_rated`, `movie:{id}`), and `server/cache/upstashTaggedCache.js` is a server-side Upstash Redis implementation of the same `get/set/revalidateTag` contract for API routes or a future Next.js migration. In this Create React App build there is no real SSR process, so list/detail streaming is approximated with route-level code splitting, skeletons, TanStack Query hydration-ready cache behavior, and stale/fallback rendering.

Web Vitals and request/error traces are collected in `src/telemetry`; set `REACT_APP_TELEMETRY_ENDPOINT` to forward them with `sendBeacon`.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
