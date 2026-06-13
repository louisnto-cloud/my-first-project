import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initVoices } from './sound';
import './index.css';

initVoices();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
