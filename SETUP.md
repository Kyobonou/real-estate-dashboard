# 🚀 Guide de Configuration - AUCUNE CLÉ API NÉCESSAIRE ! 🎉

## ✅ Configuration Automatique

Votre Google Sheet est déjà publié en mode public, donc **le dashboard fonctionne immédiatement** sans configuration supplémentaire !

## 🎯 Démarrage Rapide (30 secondes)

### 1️⃣ Installer et Lancer

```bash
# Installer les dépendances (si pas déjà fait)
npm install

# Lancer le serveur de développement
npm run dev
```

### 2️⃣ Se Connecter

Ouvrez <http://localhost:5173> et connectez-vous avec un compte demo :

| Rôle | Email | Mot de passe | Accès Rapide |
|------|-------|--------------|--------------|
| 👑 **Admin** | <admin@immodash.ci> | Admin2026! | Bouton "Admin" |
| 🏠 **Agent** | <agent@immodash.ci> | Agent2026! | Bouton "Agent" |
| 👤 **Demo** | <demo@immodash.ci> | Demo2026! | Bouton "Demo" |

### 3️⃣ Vérifier la Connexion

1. Regardez la **sidebar** : l'indicateur devrait être 🟢 **"Connecté à n8n"**
2. Allez dans **Paramètres** → **Intégration n8n**
3. Cliquez sur **"Tester la connexion"**
4. Vous devriez voir une notification de succès ✅

## 📊 Source des Données

Le dashboard lit directement depuis votre Google Sheet publié :

### Feuille "Locaux" (gid=0)

- **URL CSV** : <https://docs.google.com/spreadsheets/d/e/2PACX-1vRqwrLIv6E-PjF4mA6qj9EdGqJPbnnzl-g53KXsUYHC_TB9nyMDIQK75MYp7H5z06aLT4b98jOhLSXQ/pub?gid=0&single=true&output=csv>
- **Contenu** : Liste des biens immobiliers

### Feuille "Visite programmé" (gid=50684091)

- **URL CSV** : <https://docs.google.com/spreadsheets/d/e/2PACX-1vRqwrLIv6E-PjF4mA6qj9EdGqJPbnnzl-g53KXsUYHC_TB9nyMDIQK75MYp7H5z06aLT4b98jOhLSXQ/pub?gid=50684091&single=true&output=csv>
- **Contenu** : Visites programmées

## 🔄 Synchronisation Automatique

- ✅ **Polling** : Toutes les 30 secondes
- ✅ **Cache** : 30 secondes pour optimiser les performances
- ✅ **Fallback** : Données mock si Google Sheets temporairement inaccessible
- ✅ **Indicateur** : Statut en temps réel dans la sidebar (🟢/🔴)

## 🎨 Fonctionnalités

### Pages Disponibles

- 🏠 **Dashboard** : Vue d'ensemble avec KPIs en temps réel
- 🏢 **Biens** : Liste complète avec filtres (type, zone, prix)
- 📅 **Visites** : Calendrier et suivi des rendez-vous
- 📊 **Analytiques** : Graphiques et statistiques avancées
- ⚙️ **Paramètres** : Configuration et profil utilisateur

### Données en Temps Réel

- KPIs : Biens actifs, visites du jour, prospects, revenus
- Graphiques : Revenus, répartition par type, visites hebdo
- Entonnoir de conversion
- Performance par zone

## 🔧 Workflow n8n

Votre workflow WhatsApp continue de fonctionner normalement :

**URL** : <https://yobed-n8n-supabase-claude.hf.space/workflow/31lkbYdE1CO3QcIaTLVOZ>

**Flux** :

1. Message WhatsApp reçu → Webhook Wassender
2. IA extrait les infos immobilières → OpenAI GPT-4.1-mini
3. Sauvegarde dans Google Sheets → Feuille "Locaux"
4. Dashboard lit les données → Affichage en temps réel

## 🔍 Dépannage

### Indicateur Rouge 🔴 "Mode hors ligne"

**Causes possibles** :

- Le Google Sheet n'est plus public
- Problème de connexion internet
- CORS bloqué par le navigateur

**Solution** :

1. Vérifiez que le sheet est toujours public : <https://docs.google.com/spreadsheets/d/1cHZ38X-hmroAsEj2YLIGSxgzWX2Ev7jrDRF6aQs1koQ>
2. Cliquez **Partager** → **"Tous les utilisateurs disposant du lien"** → **Lecteur**
3. Redémarrez le serveur : `npm run dev`

### Données Mock Affichées

Si vous voyez des données de démonstration au lieu de vos vraies données :

- Le dashboard utilise un fallback automatique quand Google Sheets est inaccessible
- Vérifiez l'indicateur de connexion dans la sidebar
- Testez la connexion dans **Paramètres** → **Intégration n8n**

### Erreur CORS

Si vous voyez une erreur CORS dans la console :

- C'est normal pour les requêtes cross-origin
- Le service utilise automatiquement le cache ou les données mock
- Aucune action requise

## 📱 Architecture Complète

```
WhatsApp (Wassender)
    ↓
n8n Workflow (31lkbYdE1CO3QcIaTLVOZ)
    ↓
Google Sheets (Public)
    ↓
Dashboard React (Lecture CSV)
```

## ✨ Avantages de cette Architecture

✅ **Aucune clé API** : Pas de configuration complexe
✅ **Temps réel** : Synchronisation automatique toutes les 30s
✅ **Résilient** : Fallback sur cache si Google Sheets inaccessible
✅ **Performant** : Cache intelligent pour réduire les requêtes
✅ **Sécurisé** : Lecture seule, pas d'écriture depuis le dashboard

## 🎯 Prochaines Étapes

1. ✅ Lancez le dashboard : `npm run dev`
2. ✅ Connectez-vous avec un compte demo
3. ✅ Explorez les différentes pages
4. ✅ Vérifiez que vos données Google Sheets s'affichent
5. ✅ Testez le workflow n8n WhatsApp

---

**🎉 C'est tout ! Le dashboard est prêt à l'emploi.**

**Aucune configuration supplémentaire nécessaire** grâce à votre Google Sheet public.

Pour plus de détails, consultez `README.md`.
