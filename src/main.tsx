import {StrictMode, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './lib/supabase';

/**
 * Temporary password bypass: submit the existing unlock form automatically.
 * Remove this component when password protection is restored in api/session.ts.
 */
function TemporaryAutoUnlock() {
  useEffect(() => {
    const timer = window.setInterval(() => {
      const form = document.querySelector('form');
      if (!form) return;
      form.requestSubmit();
      window.clearInterval(timer);
    }, 50);

    return () => window.clearInterval(timer);
  }, []);

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TemporaryAutoUnlock />
  </StrictMode>,
);
