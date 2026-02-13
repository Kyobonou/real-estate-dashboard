# 🔒 Guide de Sécurité - ImmoDash

## ⚠️ IMPORTANT - À LIRE AVANT LIVRAISON CLIENT

Ce document liste les problèmes de sécurité identifiés et les actions recommandées.

## 🚨 Problèmes Critiques Actuels

### 1. Authentification Simulée (CRITIQUE)

**Problème** :

- Les credentials sont hardcodés dans `src/services/googleSheetsApi.js`
- Le token JWT est encodé en base64 simple (non signé)
- Pas de backend réel pour valider l'authentification

**Risque** :

- ⚠️ Contournable en 30 secondes via DevTools
- ⚠️ Tokens forgés facilement
- ⚠️ Pas de révocation possible

**Solution Recommandée** : Implémenter Firebase Authentication

```javascript
// Installation
npm install firebase

// Configuration (src/config/firebase.js)
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Utilisation dans AuthContext.jsx
import { signInWithEmailAndPassword } from 'firebase/auth';

const login = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};
```

**Temps d'implémentation** : 2-3 heures
**Coût** : Gratuit jusqu'à 10K utilisateurs/mois

### 2. Google Sheet Public (CRITIQUE)

**Problème** :

- Le Google Sheet est accessible publiquement via URL CSV
- Numéros de téléphone des clients exposés
- Données immobilières accessibles sans authentification

**URLs exposées** :

```
https://docs.google.com/spreadsheets/d/e/2PACX-1vRqwrLIv6E-PjF4mA6qj9EdGqJPbnnzl-g53KXsUYHC_TB9nyMDIQK75MYp7H5z06aLT4b98jOhLSXQ/pub?gid=0&output=csv
```

**Solution Recommandée** :

**Option A** : Backend Proxy (Recommandé)

```javascript
// Créer un Cloud Function Firebase
exports.getProperties = functions.https.onCall(async (data, context) => {
  // Vérifier l'authentification
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  // Récupérer les données du Sheet (avec API key serveur)
  const response = await fetch(SHEET_URL);
  return response.json();
});
```

**Option B** : Restreindre l'accès au Sheet

1. Google Sheets > Partager
2. Retirer "Tous les utilisateurs disposant du lien"
3. Utiliser Google Sheets API avec OAuth

**Temps d'implémentation** : 3-4 heures

### 3. Pas de Rate Limiting

**Problème** :

- Aucune protection contre les abus
- Polling toutes les 30s sans limite

**Solution** :

```javascript
// Implémenter un rate limiter simple
class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  canMakeRequest() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }
}

// Utilisation
const limiter = new RateLimiter(60, 60000); // 60 requêtes par minute
```

## ✅ Corrections Déjà Appliquées

### 1. Console Logs Supprimés

- ✅ 5 console.log retirés du code
- ✅ Configuration Vite pour supprimer automatiquement en production

### 2. Headers de Sécurité

- ✅ X-Content-Type-Options: nosniff
- ✅ X-Frame-Options: DENY
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Referrer-Policy configuré
- ✅ Permissions-Policy configuré

### 3. Variables d'Environnement

- ✅ .env ajouté au .gitignore
- ✅ .env.example créé pour documentation

### 4. Optimisations Build

- ✅ Code splitting configuré
- ✅ Minification avec Terser
- ✅ Lazy loading des pages

## 📋 Checklist Sécurité Pré-Production

### Authentification

- [ ] Implémenter Firebase Auth ou équivalent
- [ ] Retirer les credentials hardcodés
- [ ] Implémenter la révocation de session
- [ ] Ajouter 2FA (optionnel mais recommandé)

### Données

- [ ] Restreindre l'accès au Google Sheet
- [ ] Implémenter un backend proxy
- [ ] Chiffrer les données sensibles (téléphones)
- [ ] Ajouter des logs d'audit

### Infrastructure

- [ ] Configurer un WAF (Web Application Firewall)
- [ ] Implémenter rate limiting
- [ ] Configurer monitoring d'erreurs (Sentry)
- [ ] Mettre en place des backups automatiques

### Code

- [x] Supprimer tous les console.log
- [x] Configurer les headers de sécurité
- [x] Protéger les variables d'environnement
- [ ] Audit de dépendances (`npm audit`)

## 🔐 Recommandations Additionnelles

### 1. HTTPS Obligatoire

Firebase Hosting force déjà HTTPS ✅

### 2. Content Security Policy (CSP)

```html
<!-- À ajouter dans index.html -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: https:; 
               connect-src 'self' https://docs.google.com;">
```

### 3. Validation des Entrées

```javascript
// Valider les inputs utilisateur
const sanitizeInput = (input) => {
  return input.replace(/<script[^>]*>.*?<\/script>/gi, '')
              .replace(/<[^>]+>/g, '')
              .trim();
};
```

### 4. Protection CSRF

```javascript
// Générer un token CSRF
const csrfToken = crypto.randomUUID();
sessionStorage.setItem('csrf_token', csrfToken);

// Vérifier dans les requêtes
headers: {
  'X-CSRF-Token': sessionStorage.getItem('csrf_token')
}
```

## 🚀 Plan d'Action Recommandé

### Phase 1 : Urgent (Avant livraison)

1. Implémenter Firebase Authentication (2-3h)
2. Restreindre accès Google Sheet (1h)
3. Audit npm (`npm audit fix`) (30min)

**Total** : ~4 heures

### Phase 2 : Important (Première semaine)

1. Implémenter backend proxy (3-4h)
2. Ajouter rate limiting (1h)
3. Configurer monitoring (Sentry) (1h)

**Total** : ~6 heures

### Phase 3 : Améliorations (Premier mois)

1. Implémenter 2FA (4h)
2. Ajouter CSP strict (2h)
3. Audit de sécurité complet (4h)

**Total** : ~10 heures

## 📞 Contact Sécurité

En cas de découverte de vulnérabilité :

1. Ne pas divulguer publiquement
2. Contacter l'équipe de développement
3. Documenter la vulnérabilité
4. Proposer un correctif si possible

---

**Dernière révision** : 2026-02-13
**Prochaine révision** : Après implémentation Phase 1
