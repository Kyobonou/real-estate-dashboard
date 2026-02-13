# 🏠 ImmoDash - Real Estate Dashboard

Dashboard immobilier professionnel connecté à Google Sheets via n8n.

## 📊 Source de Données

Le dashboard récupère les données en temps réel depuis **Google Sheets** :

- **Sheet ID** : `1cHZ38X-hmroAsEj2YLIGSxgzWX2Ev7jrDRF6aQs1koQ`
- **Feuille "Locaux"** : Liste des biens immobiliers
- **Feuille "Visite programmé"** : Visites programmées

## 🔧 Configuration

### 1. Obtenir une Clé API Google

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Activez l'API **Google Sheets API**
4. Créez des identifiants → **Clé API**
5. Copiez la clé générée

### 2. Configurer le Projet

1. Ouvrez le fichier `.env` à la racine du projet
2. Remplacez `YOUR_GOOGLE_API_KEY_HERE` par votre clé API :

```env
VITE_GOOGLE_API_KEY=AIzaSy...votre_clé_ici
```

### 3. Rendre le Google Sheet Public (Lecture Seule)

1. Ouvrez votre [Google Sheet](https://docs.google.com/spreadsheets/d/1cHZ38X-hmroAsEj2YLIGSxgzWX2Ev7jrDRF6aQs1koQ)
2. Cliquez sur **Partager** (en haut à droite)
3. Changez l'accès à : **"Tous les utilisateurs disposant du lien" → Lecteur**
4. Copiez le lien

## 🚀 Installation

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Build pour production
npm run build
```

## 🔐 Connexion

Le dashboard dispose de 3 comptes de démonstration :

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| **Admin** 👑 | <admin@immodash.ci> | Admin2026! |
| **Agent** 🏠 | <agent@immodash.ci> | Agent2026! |
| **Demo** 👤 | <demo@immodash.ci> | Demo2026! |

## 📱 Fonctionnalités

### ✅ Authentification

- Login sécurisé avec 3 niveaux d'accès
- Session persistante (24h)
- Protection des routes

### 📊 Dashboard

- KPIs en temps réel
- Graphiques interactifs
- Synchronisation automatique (30s)

### 🏢 Gestion des Biens

- Liste complète des propriétés
- Filtres avancés (type, zone, prix)
- Modal de détails
- Export des données

### 📅 Visites

- Calendrier des visites
- Statuts (Programmée, Terminée, En attente)
- Informations clients

### 📈 Analytiques

- Revenus sur 6 mois
- Répartition par type de bien
- Performance par zone
- Entonnoir de conversion

### ⚙️ Paramètres

- Profil utilisateur
- Sécurité (changement mot de passe)
- Notifications
- Statut connexion Google Sheets

## 🔄 Synchronisation Google Sheets

Le dashboard se synchronise automatiquement avec Google Sheets :

- **Polling** : Toutes les 30 secondes
- **Cache** : 30 secondes pour optimiser les performances
- **Fallback** : Données mock si Google Sheets est inaccessible
- **Indicateur** : Statut de connexion dans la sidebar (🟢/🔴)

## 📂 Structure des Données

### Feuille "Locaux"

```
Type de bien | Type d'offre | Zone géographique précise | Prix | Téléphone | Caractéristiques | Publier par | Meubles | Chambre | Disponible
```

### Feuille "Visite programmé"

```
Nom et Prenom | Numero | Date-rv | Local interesse | Visite prog
```

## 🛠️ Technologies

- **React** + **Vite**
- **Framer Motion** (animations)
- **Recharts** (graphiques)
- **Lucide React** (icônes)
- **Google Sheets API** (backend)
- **React Router** (navigation)

## 📝 Notes

- Le dashboard fonctionne en **lecture seule** sur Google Sheets
- Les modifications (ajout de biens, visites) doivent être faites via le workflow n8n ou directement dans Google Sheets
- Le workflow n8n WhatsApp continue de fonctionner indépendamment

## 🔗 Liens Utiles

- [Google Sheet](https://docs.google.com/spreadsheets/d/1cHZ38X-hmroAsEj2YLIGSxgzWX2Ev7jrDRF6aQs1koQ)
- [Workflow n8n](https://yobed-n8n-supabase-claude.hf.space/workflow/31lkbYdE1CO3QcIaTLVOZ)
- [Google Sheets API Docs](https://developers.google.com/sheets/api)

---

**Version** : 2.5.0  
**Auteur** : Kassio Wilfried YOBONOU  
**License** : MIT
