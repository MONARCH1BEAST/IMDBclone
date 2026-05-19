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

if ('serviceWorker' in navigator) {

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
