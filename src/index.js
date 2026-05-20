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

if (process.env.NODE_ENV === 'development') {
  import('./mocks/browser').then(({ worker }) => {
    worker.start({ onUnhandledRequest: 'bypass' }).then(() => {
      renderApp();
    });
  });
} else {
  renderApp();
}

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
