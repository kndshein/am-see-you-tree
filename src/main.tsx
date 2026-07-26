import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@fontsource/monaspace-krypton';
import '@fontsource/monaspace-krypton/200.css';
import '@fontsource/space-grotesk';
import '@fontsource/space-grotesk/300.css';
import './index.scss';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
