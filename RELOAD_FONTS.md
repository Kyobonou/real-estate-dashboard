# 🔄 Forcer le Rechargement des Polices

## Problème

Les changements dans `index.html` ne sont pas automatiquement rechargés par Vite.

## Solution Rapide

### Option 1 : Rechargement Manuel (Recommandé)

1. Ouvrez votre navigateur sur `http://localhost:5173`
2. Appuyez sur **Ctrl + Shift + R** (ou **Cmd + Shift + R** sur Mac)
   - Cela force un rechargement complet en vidant le cache

### Option 2 : Redémarrer le Serveur

1. Dans le terminal où `npm run dev` tourne
2. Appuyez sur **Ctrl + C** pour arrêter
3. Relancez : `npm run dev`
4. Rafraîchissez le navigateur

### Option 3 : Vider le Cache du Navigateur

1. Ouvrez DevTools (F12)
2. Clic droit sur le bouton de rafraîchissement
3. Sélectionnez "Vider le cache et actualiser"

## Vérification

Une fois rechargé, ouvrez DevTools (F12) et :

1. **Inspectez un titre (H1, H2, H3)**
   - Computed styles → font-family
   - Devrait afficher : **"Plus Jakarta Sans"**

2. **Inspectez du texte normal**
   - Computed styles → font-family
   - Devrait afficher : **"Inter"**

3. **Vérifiez le chargement des polices**
   - Onglet Network → Filtrer par "Font"
   - Vous devriez voir les polices Google Fonts se charger

## Si ça ne fonctionne toujours pas

Vérifiez que les polices se chargent :

1. Ouvrez DevTools → Console
2. Tapez : `document.fonts.check("1em Inter")`
3. Devrait retourner `true`

Ou vérifiez visuellement :

1. DevTools → Elements
2. Sélectionnez `<html>` ou `<body>`
3. Onglet Computed → Rendered Fonts
4. Devrait lister "Inter" et "Plus Jakarta Sans"
