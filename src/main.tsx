import { createRoot } from 'react-dom/client';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#111827',
      color: '#ffffff',
      fontSize: '32px',
      fontFamily: 'Arial, sans-serif',
    }}
  >
    الموقع شغال
  </div>
);
