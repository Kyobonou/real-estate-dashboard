import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initMonitoring } from './utils/monitoring'

// Initialiser le monitoring des performances (seulement en développement)
if (import.meta.env.DEV) {
  initMonitoring();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
