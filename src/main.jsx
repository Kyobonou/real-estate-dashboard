import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initMonitoring } from './utils/monitoring'
import { registerSW } from 'virtual:pwa-register'

// Force le navigateur à vérifier les mises à jour du SW à chaque chargement
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => reg.update());
    });
  });
}

// Auto-reload dès qu'une nouvelle version est disponible
registerSW({
  immediate: true,
  onNeedRefresh() { window.location.reload(); },
  onOfflineReady() {},
});

// Initialiser le monitoring des performances (seulement en développement)
if (import.meta.env.DEV) {
  initMonitoring();
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
