# Intégration de la Carte Maps

## Vue d'ensemble

L'application dispose maintenant d'une vue carte interactive pour visualiser les biens immobiliers sur une carte géographique d'Abidjan.

## Technologies utilisées

- **Leaflet** : Bibliothèque de cartographie open-source
- **React-Leaflet** : Wrapper React pour Leaflet
- **OpenStreetMap** : Données cartographiques gratuites
- **Nominatim** : Service de géocodage gratuit

## Fonctionnalités

### 1. Vue Carte

- Affichage de tous les biens immobiliers sur une carte interactive
- Marqueurs colorés selon la disponibilité (vert = disponible, rouge = occupé)
- Zoom et déplacement sur la carte
- Clustering automatique des marqueurs proches

### 2. Géocodage Automatique

- Conversion automatique des adresses (Commune + Zone) en coordonnées GPS
- Cache local pour éviter les appels API répétés
- Coordonnées par défaut pour les principales communes d'Abidjan
- Décalage aléatoire léger pour éviter la superposition des marqueurs

### 3. Popups et Tooltips Interactifs

**Tooltips au survol** :

- Survolez un marqueur pour voir un aperçu rapide
- Informations affichées : type, prix, zone, statut
- Apparition instantanée sans clic
- Design glassmorphism cohérent

**Popups au clic** :

- Clic sur un marqueur pour afficher les détails complets
- Informations : type, prix, zone, commune, caractéristiques
- Boutons d'action : "Détails" et "WhatsApp"
- Design cohérent avec le reste de l'application

### 4. Filtres Synchronisés

- Les filtres de la page Properties s'appliquent également à la carte
- Recherche par commune, zone, type de bien, etc.
- Mise à jour en temps réel de la carte

## Utilisation

### Accéder à la vue carte

1. Naviguer vers la page "Biens Immobiliers"
2. Cliquer sur le bouton "Vue Carte" (icône de carte) dans la barre d'outils
3. La carte s'affiche avec tous les biens géocodés

### Interagir avec la carte

- **Zoom** : Molette de la souris ou boutons +/-
- **Déplacement** : Cliquer-glisser sur la carte
- **Aperçu rapide** : Survoler un marqueur pour voir les infos principales
- **Voir les détails** : Cliquer sur un marqueur pour ouvrir le popup complet
- **Ouvrir le modal** : Cliquer sur "Détails" dans le popup
- **Contacter** : Cliquer sur "WhatsApp" dans le popup

### Appliquer des filtres

1. Ouvrir le panneau de filtres
2. Sélectionner les critères souhaités (commune, type, prix, etc.)
3. La carte se met à jour automatiquement

## Architecture

### Services

#### `geocodingService.js`

- Gère la conversion adresse → coordonnées GPS
- Utilise Nominatim (OpenStreetMap) pour le géocodage
- Cache localStorage pour optimiser les performances
- Coordonnées par défaut pour Abidjan et ses communes

#### Communes supportées

- Cocody
- Yopougon
- Abobo
- Adjamé
- Plateau
- Marcory
- Treichville
- Koumassi
- Port-Bouët
- Attécoubé
- Bingerville
- Songon
- Anyama

### Composants

#### `PropertyMap.jsx`

- Composant de carte réutilisable
- Affiche les marqueurs avec popups
- Gère les interactions utilisateur
- S'adapte automatiquement aux propriétés filtrées

#### `PropertyMap.css`

- Styles personnalisés pour la carte
- Marqueurs colorés selon le statut
- Popups avec design glassmorphism
- Responsive design

### Intégration dans Properties.jsx

- Ajout du mode `viewMode === 'map'`
- Géocodage automatique au chargement des propriétés
- Synchronisation des filtres avec la carte
- Gestion du state de chargement

## Performance

### Optimisations

1. **Cache localStorage** : Les coordonnées géocodées sont sauvegardées localement
2. **Coordonnées par défaut** : Évite les appels API pour les communes connues
3. **Rate limiting** : Respect de la politique Nominatim (1 requête/seconde)
4. **Lazy loading** : La carte ne se charge que lorsqu'elle est affichée

### Limitations

- **Géocodage initial** : Peut prendre quelques secondes pour de nombreux biens
- **Précision** : Les coordonnées sont approximatives (niveau commune/quartier)
- **Quota Nominatim** : Limite de 1 requête/seconde (gratuit)

## Améliorations futures possibles

1. **Clustering avancé** : Regrouper les marqueurs proches avec compteur
2. **Heatmap** : Visualiser la densité des biens par zone
3. **Itinéraires** : Calculer l'itinéraire vers un bien
4. **Géolocalisation** : Centrer la carte sur la position de l'utilisateur
5. **Coordonnées GPS dans le Sheet** : Ajouter colonnes Latitude/Longitude pour plus de précision
6. **Filtres géographiques** : Dessiner une zone sur la carte pour filtrer
7. **Export KML** : Exporter les biens pour Google Earth

## Dépannage

### La carte ne s'affiche pas

- Vérifier que les dépendances sont installées : `npm install`
- Vérifier la console pour les erreurs
- Vérifier que le CSS de Leaflet est bien importé

### Les marqueurs ne s'affichent pas

- Vérifier que les propriétés ont des coordonnées
- Vérifier le cache localStorage : `localStorage.getItem('geocoding_cache')`
- Vider le cache si nécessaire : `localStorage.removeItem('geocoding_cache')`

### Erreur de géocodage

- Vérifier la connexion internet
- Vérifier que Nominatim est accessible
- Attendre quelques secondes entre les requêtes (rate limiting)

## Ressources

- [Leaflet Documentation](https://leafletjs.com/)
- [React-Leaflet Documentation](https://react-leaflet.js.org/)
- [OpenStreetMap](https://www.openstreetmap.org/)
- [Nominatim API](https://nominatim.org/release-docs/latest/api/Overview/)
