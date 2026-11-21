import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { apply } from './lib/theme';
import { startAccount } from './account/account';
import './index.css';

apply();
startAccount();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
