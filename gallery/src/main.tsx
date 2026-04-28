import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { App } from './App';
import './tokens.css';

// Sentry is opt-in observability — no ADR; disabled unless VITE_SENTRY_DSN is set
const dsn = import.meta.env.VITE_SENTRY_DSN;
if (dsn) {
  Sentry.init({ dsn, environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development' });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
