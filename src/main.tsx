import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { apply } from './lib/theme';
import './index.css';

apply();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
