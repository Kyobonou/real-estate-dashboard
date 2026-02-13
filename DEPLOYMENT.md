# 🚀 Guide de Déploiement - ImmoDash

## Pré-requis

- Node.js 18+ installé
- Firebase CLI installé (`npm install -g firebase-tools`)
- Compte Firebase configuré

## Étapes de Déploiement

### 1. Vérifier l'environnement

```bash
# Vérifier que vous êtes connecté à Firebase
npm run check-login

# Si non connecté, se connecter
firebase login
```

### 2. Build de production

```bash
# Créer le build optimisé
npm run build
```

Le build va :

- ✅ Supprimer tous les console.log
- ✅ Minifier le code avec Terser
- ✅ Créer des chunks séparés (react, charts, animations)
- ✅ Optimiser les assets

### 3. Tester localement (optionnel)

```bash
# Prévisualiser le build
npm run preview
```

### 4. Déployer sur Firebase

```bash
# Déployer sur Firebase Hosting
npm run deploy
```

Ou manuellement :

```bash
firebase deploy --only hosting --project immo-dashboard-ci
```

### 5. Vérifier le déploiement

Après le déploiement, Firebase affichera l'URL :

```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/immo-dashboard-ci/overview
Hosting URL: https://immo-dashboard-ci.web.app
```

## Configuration Post-Déploiement

### Domaine personnalisé (optionnel)

1. Aller dans Firebase Console > Hosting
2. Cliquer sur "Add custom domain"
3. Suivre les instructions pour configurer les DNS

### Variables d'environnement

Les variables dans `.env` sont intégrées au build. Pour les modifier :

1. Éditer `.env`
2. Rebuild : `npm run build`
3. Redéployer : `npm run deploy`

## Sécurité

### Headers HTTP configurés

✅ X-Content-Type-Options: nosniff
✅ X-Frame-Options: DENY
✅ X-XSS-Protection: 1; mode=block
✅ Referrer-Policy: strict-origin-when-cross-origin
✅ Permissions-Policy: geolocation=(), microphone=(), camera=()

### Caching configuré

- **Images/Assets** : 1 an (immutable)
- **JS/CSS** : 1 an (immutable)
- **index.html** : no-cache (toujours frais)

## Monitoring

### Vérifier les performances

1. Ouvrir Chrome DevTools
2. Onglet "Lighthouse"
3. Lancer l'audit
4. Objectif : Score > 85/100

### Vérifier les erreurs

1. Firebase Console > Hosting
2. Vérifier les logs d'accès
3. Monitorer les erreurs 404/500

## Rollback (en cas de problème)

```bash
# Lister les déploiements précédents
firebase hosting:channel:list

# Revenir à une version précédente
firebase hosting:clone SOURCE_SITE_ID:SOURCE_CHANNEL_ID TARGET_SITE_ID:live
```

## Checklist Pré-Déploiement

- [ ] Tests locaux passés (`npm run dev`)
- [ ] Build réussi (`npm run build`)
- [ ] Pas d'erreurs dans la console
- [ ] Variables d'environnement configurées
- [ ] Credentials de test documentés
- [ ] README.md à jour

## Support

En cas de problème :

1. Vérifier les logs Firebase Console
2. Vérifier la console du navigateur
3. Tester en mode incognito
4. Vider le cache du navigateur

---

**Dernière mise à jour** : 2026-02-13
**Version** : 2.5.0
