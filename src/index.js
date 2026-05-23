import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { validateEnvironment, debugEnvironment } from './services/env';

// (debug logs removed)

// Validate environment at startup
validateEnvironment();
debugEnvironment();

function renderApp() {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

const SERVICE_WORKER_CLEANUP_RELOAD_KEY = 'imdb-clone-sw-cleanup-reloaded';

function reloadAfterServiceWorkerCleanup() {
  if (!navigator.serviceWorker.controller) {
    return;
  }

  try {
    if (window.sessionStorage.getItem(SERVICE_WORKER_CLEANUP_RELOAD_KEY) === 'true') {
      return;
    }

    window.sessionStorage.setItem(SERVICE_WORKER_CLEANUP_RELOAD_KEY, 'true');
  } catch {
    // If storage is unavailable, a single reload still releases the current page
    // from the now-unregistered controller in normal browsers.
  }

  window.location.reload();
}

function cleanupProductionServiceWorkers() {
  if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', function () {
    navigator.serviceWorker
      .getRegistrations()
      .then(function (registrations) {
        if (registrations.length === 0) {
          return false;
        }

        return Promise.all(
          registrations.map(function (registration) {
            return registration.unregister();
          })
        ).then(function () {
          if (!('caches' in window)) {
            return true;
          }

          return window.caches
            .keys()
            .then(function (cacheNames) {
              return Promise.all(
                cacheNames.map(function (cacheName) {
                  return window.caches.delete(cacheName);
                })
              );
            })
            .then(function () {
              return true;
            });
        });
      })
      .then(function (hadRegistrations) {
        if (hadRegistrations) {
          reloadAfterServiceWorkerCleanup();
        }
      })
      .catch(function () {});
  });
}

if (process.env.NODE_ENV === 'development') {
  import('./mocks/browser').then(({ worker }) => {
    worker.start({ onUnhandledRequest: 'bypass' }).then(() => {
      renderApp();
    });
  });
} else {
  renderApp();
}

cleanupProductionServiceWorkers();

// Service worker registration is intentionally disabled in production.
// The project includes a custom /sw.js that intercepts watchlist API requests.
// On Vercel this can lead to stale behavior across redeploys and intermittent
// runtime/network issues. Keeping it for development only preserves
// offline-queue behavior without risking production stability.
if (process.env.NODE_ENV === 'development' && 'serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(function (err) {
        console.error('Service worker registration failed:', err);
      });
  });
}


// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
