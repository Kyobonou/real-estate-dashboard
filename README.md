# 🏠 ImmoDash - Dashboard Immobilier Professionnel

[![Version](https://img.shields.io/badge/version-2.5.0-blue.svg)](https://github.com/Kyobonou/real-estate-dashboard/releases/tag/v2.5.0)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Firebase](https://img.shields.io/badge/Firebase-Hosting-orange.svg)](https://firebase.google.com/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646cff.svg)](https://vitejs.dev/)

Dashboard immobilier moderne et performant connecté à Google Sheets. Gestion complète des biens, visites, analytics et galerie d'images.

## 🌟 Démo

**URL de production** : [https://immo-dashboard-ci.web.app](https://immo-dashboard-ci.web.app)

### Comptes de démonstration

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| **Admin** 👑 | <admin@immodash.ci> | Admin2026! |
| **Agent** 🏠 | <agent@immodash.ci> | Agent2026! |
| **Demo** 👤 | <demo@immodash.ci> | Demo2026! |

## ✨ Fonctionnalités

### 🔐 Authentification

- Login sécurisé avec 3 niveaux d'accès (Admin, Agent, Viewer)
- Session persistante (24h)
- Protection des routes

### 📊 Dashboard

- KPIs en temps réel (biens disponibles, visites, revenus)
- Graphiques interactifs (Recharts)
- Synchronisation automatique avec Google Sheets (30s)
- Indicateur de connexion en temps réel

### 🏢 Gestion des Biens

- Liste complète des propriétés avec filtres avancés
- Recherche par type, commune, prix, statut
- Modal de détails complet
- Export des données
- Vue grille et liste

### 📸 Galerie d'Images

- Affichage des biens avec photos
- Filtres par commune, type, pièces, budget
- Contact WhatsApp direct
- Vue responsive (mobile/tablet/desktop)

### 📅 Gestion des Visites

- Calendrier des visites programmées
- Statuts automatiques (Aujourd'hui, Programmée, Terminée)
- Informations clients complètes
- Filtres par statut et date

### 📈 Analytics

- Revenus sur 6 mois
- Répartition par type de bien (PieChart)
- Performance par zone géographique
- Entonnoir de conversion
- Statistiques détaillées

### ⚙️ Paramètres

- Profil utilisateur
- Gestion de la sécurité
- Notifications
- Statut de connexion Google Sheets
- Dark mode / Light mode

## 🚀 Performance

### Métriques Lighthouse

| Métrique | Score |
|----------|-------|
| **Performance** | 85/100 |
| **Accessibility** | 90/100 |
| **Best Practices** | 95/100 |
| **SEO** | 100/100 |

### Optimisations Appliquées

- ✅ **Code Splitting** : React, Charts, Animations séparés
- ✅ **Lazy Loading** : 6 pages chargées à la demande
- ✅ **Polling Optimisé** : Arrêt automatique quand page cachée (-60% requêtes)
- ✅ **Caching HTTP** : 1 an pour assets, no-cache pour HTML
- ✅ **Minification** : Terser avec suppression console.log
- ✅ **Bundle Size** : 480 KB (réduit de 40%)

## 🛠️ Technologies

### Frontend

- **React 19** - Framework UI moderne
- **Vite 7** - Build tool ultra-rapide
- **React Router 7** - Navigation SPA
- **Framer Motion** - Animations fluides
- **Recharts** - Graphiques interactifs
- **Lucide React** - Icônes modernes
- **date-fns** - Manipulation de dates

### Backend & Data

- **Google Sheets API** - Base de données en temps réel
- **Firebase Hosting** - Hébergement sécurisé
- **CSV Parsing** - Lecture directe des données

### Styling

- **Vanilla CSS** - Styles personnalisés
- **CSS Variables** - Thème dynamique (dark/light)
- **Responsive Design** - Mobile-first

## 📦 Installation

### Prérequis

- Node.js 18+
- npm ou yarn
- Compte Firebase (optionnel pour déploiement)

### Installation locale

```bash
# Cloner le repository
git clone https://github.com/Kyobonou/real-estate-dashboard.git
cd real-estate-dashboard

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# Lancer le serveur de développement
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

## 🚀 Déploiement

### Build de production

```bash
# Créer le build optimisé
npm run build

# Prévisualiser le build
npm run preview
```

### Déploiement Firebase

```bash
# Se connecter à Firebase
firebase login

# Déployer
npm run deploy
```

Pour plus de détails, consultez [DEPLOYMENT.md](DEPLOYMENT.md)

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [LIVRAISON.md](LIVRAISON.md) | 📋 Document de livraison client |
| [DEPLOYMENT.md](DEPLOYMENT.md) | 🚀 Guide de déploiement |
| [SECURITY.md](SECURITY.md) | 🔒 Guide de sécurité |
| [OPTIMIZATIONS.md](OPTIMIZATIONS.md) | ⚡ Détails des optimisations |
| [CHANGELOG.md](CHANGELOG.md) | 📝 Historique des modifications |

## 🔒 Sécurité

### Headers HTTP Configurés

- ✅ `X-Content-Type-Options: nosniff`
- ✅ `X-Frame-Options: DENY`
- ✅ `X-XSS-Protection: 1; mode=block`
- ✅ `Referrer-Policy: strict-origin-when-cross-origin`
- ✅ `Permissions-Policy: geolocation=(), microphone=(), camera=()`

### Recommandations

Pour une utilisation en production, nous recommandons :

1. Implémenter Firebase Authentication (voir [SECURITY.md](SECURITY.md))
2. Restreindre l'accès au Google Sheet
3. Configurer un backend proxy

## 📊 Structure du Projet

```
real-estate-dashboard/
├── src/
│   ├── components/        # Composants réutilisables
│   │   ├── Layout.jsx
│   │   ├── Modal.jsx
│   │   ├── Toast.jsx
│   │   └── common/
│   ├── contexts/          # Context API (Auth, Theme)
│   ├── pages/             # Pages de l'application
│   │   ├── Dashboard.jsx
│   │   ├── Properties.jsx
│   │   ├── ImageGallery.jsx
│   │   ├── Visits.jsx
│   │   ├── Analytics.jsx
│   │   └── Settings.jsx
│   ├── services/          # Services API
│   │   └── googleSheetsApi.js
│   └── index.css          # Styles globaux
├── public/                # Assets statiques
├── .env.example           # Template de configuration
├── firebase.json          # Configuration Firebase
├── vite.config.js         # Configuration Vite
└── package.json           # Dépendances

Documentation/
├── LIVRAISON.md           # Document client
├── DEPLOYMENT.md          # Guide déploiement
├── SECURITY.md            # Guide sécurité
├── OPTIMIZATIONS.md       # Optimisations
└── CHANGELOG.md           # Historique
```

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 License

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 👨‍💻 Auteur

**Kassio Wilfried YOBONOU**

- GitHub: [@Kyobonou](https://github.com/Kyobonou)
- Email: <contact@immodash.ci>

## 🙏 Remerciements

- [React](https://reactjs.org/) - Framework UI
- [Vite](https://vitejs.dev/) - Build tool
- [Firebase](https://firebase.google.com/) - Hosting
- [Recharts](https://recharts.org/) - Graphiques
- [Framer Motion](https://www.framer.com/motion/) - Animations
- [Lucide](https://lucide.dev/) - Icônes

## 📈 Roadmap

### Version 2.6.0 (Planifiée)

- [ ] Firebase Authentication
- [ ] Backend proxy pour Google Sheets
- [ ] Rate limiting
- [ ] Monitoring avec Sentry

### Version 3.0.0 (Future)

- [ ] Progressive Web App (PWA)
- [ ] Offline mode
- [ ] Notifications push
- [ ] Multi-langue (FR/EN)
- [ ] Tests automatisés (Jest, Cypress)

## 📞 Support

Pour toute question ou problème :

- Ouvrir une [issue](https://github.com/Kyobonou/real-estate-dashboard/issues)
- Consulter la [documentation](LIVRAISON.md)
- Contacter l'auteur

---

**Version actuelle** : 2.5.0  
**Dernière mise à jour** : 13 février 2026  
**Statut** : ✅ Prêt pour production

⭐ Si ce projet vous a été utile, n'hésitez pas à lui donner une étoile !
