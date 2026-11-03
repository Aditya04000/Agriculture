import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// React StrictMode causes double-mounting in dev mode, which 
// triggers polling twice, causing flashes and duplicate packets.
// We remove it for production-like behavior.

createRoot(document.getElementById('root')!).render(<App />);