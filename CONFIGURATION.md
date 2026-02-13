# 🎉 ImmoDash v2.5 - Configuration Terminée

## ✅ Ce qui est Configuré

### 🔗 Connexion Google Sheets (SANS CLÉ API !)

- ✅ Service API utilisant l'export CSV public
- ✅ Lecture automatique des 2 feuilles :
  - **"Locaux"** (gid=0) → Biens immobiliers
  - **"Visite programmé"** (gid=50684091) → Visites clients
- ✅ Parser CSV robuste (gère guillemets, virgules, caractères spéciaux)
- ✅ Cache intelligent (30s)
- ✅ Fallback sur données mock si inaccessible

### 🔄 Synchronisation Temps Réel

- ✅ Polling automatique toutes les 30 secondes
- ✅ Indicateur de connexion dans la sidebar (🟢/🔴)
- ✅ Notifications de changement de statut
- ✅ Mise à jour automatique des KPIs et graphiques

### 🎨 Interface Complète

- ✅ **Login** : Page d'authentification premium avec 3 rôles
- ✅ **Dashboard** : Vue d'ensemble avec KPIs temps réel
- ✅ **Biens** : Liste complète avec filtres avancés
- ✅ **Visites** : Calendrier et suivi des rendez-vous
- ✅ **Analytiques** : Graphiques et statistiques
- ✅ **Paramètres** : Configuration utilisateur

## 🚀 Démarrage Immédiat

```bash
# Le serveur tourne déjà sur :
http://localhost:5173
```

### Comptes de Test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| 👑 Admin | <admin@immodash.ci> | Admin2026! |
| 🏠 Agent | <agent@immodash.ci> | Agent2026! |
| 👤 Demo | <demo@immodash.ci> | Demo2026! |

## 📊 Architecture Finale

```
┌─────────────────┐
│   WhatsApp      │
│   (Wassender)   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  n8n Workflow (Production)          │
│  ID: 31lkbYdE1CO3QcIaTLVOZ          │
│  • Webhook Wassender                │
│  • AI Agent (GPT-4.1-mini)          │
│  • Extraction données immobilières  │
│  • Gestion visites                  │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Google Sheets (Public)             │
│  ID: 1cHZ38X-hmroAsEj2YLIGSxgzWX... │
│  • Feuille "Locaux"                 │
│  • Feuille "Visite programmé"       │
└────────┬────────────────────────────┘
         │ (Export CSV)
         ▼
┌─────────────────────────────────────┐
│  Dashboard React (ImmoDash)         │
│  • Lecture CSV toutes les 30s       │
│  • Cache intelligent                │
│  • Fallback automatique             │
│  • Interface premium                │
└─────────────────────────────────────┘
```

## 🔍 Vérification

### 1. Connexion Google Sheets

- Ouvrez le dashboard : <http://localhost:5173>
- Connectez-vous avec un compte demo
- Vérifiez la sidebar : 🟢 **"Connecté à n8n"**

### 2. Données en Temps Réel

- Allez dans **Biens** : Vous devriez voir les données de votre Google Sheet
- Allez dans **Visites** : Liste des visites programmées
- Allez dans **Dashboard** : KPIs calculés depuis vos vraies données

### 3. Test de Connexion

- Allez dans **Paramètres** → **Intégration n8n**
- Cliquez sur **"Tester la connexion"**
- Notification de succès ✅

## 📱 Fonctionnalités Clés

### Dashboard

- 📊 **4 KPI Cards** : Biens actifs, Visites du jour, Prospects, Revenus
- 📈 **Graphiques** : Évolution des revenus, répartition par type
- 🔄 **Mise à jour** : Automatique toutes les 30 secondes

### Biens Immobiliers

- 🏠 **Liste complète** depuis Google Sheets
- 🔍 **Filtres** : Type, Zone, Prix min/max
- 📋 **Détails** : Modal avec toutes les infos
- 📥 **Export** : Téléchargement des données

### Visites

- 📅 **Calendrier** : Toutes les visites programmées
- 👤 **Clients** : Nom, téléphone, bien intéressé
- ⏰ **Statuts** : Programmée, Terminée, Aujourd'hui
- 🔔 **Notifications** : Rappels automatiques

### Analytiques

- 💰 **Revenus** : Graphique sur 6 mois
- 🏢 **Répartition** : Par type de bien (Pie Chart)
- 📊 **Performance** : Par zone géographique
- 🎯 **Conversion** : Entonnoir visiteurs → contrats

### Paramètres

- 👤 **Profil** : Nom, email, téléphone, entreprise
- 🔒 **Sécurité** : Changement mot de passe
- 🔔 **Notifications** : Email, Push, SMS
- 🔌 **Intégration** : Statut connexion Google Sheets

## 🔧 Workflow n8n

Votre workflow WhatsApp fonctionne en parallèle :

**URL** : <https://yobed-n8n-supabase-claude.hf.space/workflow/31lkbYdE1CO3QcIaTLVOZ>

**Fonctionnalités** :

1. ✅ Réception messages WhatsApp (Wassender)
2. ✅ Détection audio/texte
3. ✅ Transcription audio (OpenAI Whisper)
4. ✅ Extraction infos immobilières (GPT-4.1-mini)
5. ✅ Sauvegarde dans Google Sheets
6. ✅ Gestion visites programmées
7. ✅ Notifications aux agents

## 🎯 Mapping des Données

### Google Sheets → Dashboard

| Colonne Google Sheets | Champ Dashboard |
|----------------------|-----------------|
| Type de bien | `type` |
| Type d'offre | `offer` |
| Zone géographique précise | `zone` |
| Prix | `price` + `rawPrice` |
| Téléphone | `phone` |
| Caractéristiques | `features` (array) |
| Publier par | `publisher` |
| Meubles | `furnished` |
| Chambre | `bedrooms` |
| Disponible | `status` |
| Date de publication | `createdAt` |

## 🛠️ Technologies

- **Frontend** : React 18 + Vite
- **Routing** : React Router v6
- **Animations** : Framer Motion
- **Graphiques** : Recharts
- **Icônes** : Lucide React
- **Backend** : Google Sheets (CSV Export)
- **Workflow** : n8n (Production)
- **WhatsApp** : Wassender API

## 📝 Notes Importantes

### Lecture Seule

- Le dashboard lit les données depuis Google Sheets
- Les modifications doivent être faites via :
  - Le workflow n8n WhatsApp
  - Directement dans Google Sheets
  - (Futur : API d'écriture)

### Performance

- **Cache** : 30 secondes pour réduire les requêtes
- **Polling** : Configurable (défaut 30s)
- **Fallback** : Données mock si Google Sheets inaccessible

### Sécurité

- **Authentification** : JWT-like tokens (localStorage)
- **Session** : 24 heures
- **Rôles** : Admin, Agent, Viewer
- **Routes** : Protégées par ProtectedRoute

## 🚀 Prochaines Améliorations Possibles

1. **Écriture Google Sheets** : Ajouter/modifier biens depuis le dashboard
2. **Notifications Push** : Alertes temps réel pour nouvelles visites
3. **Export PDF** : Générer des rapports
4. **Recherche Avancée** : Filtres multi-critères
5. **Carte Interactive** : Visualisation géographique des biens
6. **Statistiques Avancées** : ML pour prédictions de prix

## 📞 Support

Pour toute question ou problème :

- Consultez `SETUP.md` pour le guide de démarrage
- Consultez `README.md` pour la documentation complète
- Vérifiez la console du navigateur pour les erreurs

---

**🎉 Félicitations ! Votre dashboard immobilier professionnel est opérationnel.**

**Version** : 2.5.0  
**Auteur** : Kassio Wilfried YOBONOU  
**Date** : 2026-02-12
