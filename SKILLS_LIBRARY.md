# 🧠 SKILLS LIBRARY - ImmoDash

Ce document rassemble les principes et meilleures pratiques "absorbés" pour le développement d'ImmoDash. Ces règles doivent être appliquées à chaque intervention.

---

## 1. Vercel React Best Practices ⚛️

### 🚀 Performance Critique

1. **Eliminating Waterfalls** :
    * Ne pas bloquer le rendu avec des `await` séquentiels inutiles.
    * Utiliser `Promise.all()` pour les requêtes parallèles.
    * Charger les données le plus tôt possible (`preload` patterns).
2. **Bundle Size** :
    * **Éviter les Barrel Files** (`index.js` qui exporte tout) pour le tree-shaking.
    * **Lazy Loading** : Utiliser `React.lazy` et `Suspense` pour les routes et gros composants (✅ Déjà fait).
    * **Imports Dynamiques** : Charger les lib lourdes (charts, maps) seulement quand nécessaire.

### ⚡ Client-Side Optimization

1. **Lists** : Utiliser la virtualisation (`react-window`) pour les listes > 50 items.
2. **Re-renders** :
    * Utiliser `useMemo` pour les calculs coûteux (filtres, tris).
    * Utiliser `useCallback` pour les props de fonctions passées aux enfants.
    * Ne pas dériver l'état dans un `useEffect` si possible (le faire pendant le rendu).

---

## 2. UI/UX Pro Max 🎨

### ♿ Accessibilité (CRITICAL)

1. **Contraste** : Ratio minimum 4.5:1 pour le texte normal.
2. **Focus** : Ne jamais supprimer `outline` sans le remplacer par un style visible (`ring`).
3. **Sémantique** : Utiliser `<button>` pour les actions, `<a>` pour la navigation.
4. **Alt Text** : Toujours présent sur les images significatives.

### 📱 Touch & Interaction

1. **Cibles Tactiles** : Minimum 44x44px pour tous les éléments cliquables.
2. **Feedback** : État `hover`, `active`, et `disabled` visibles pour chaque interaction.
3. **Loading** : Désactiver les boutons pendant le chargement (`isLoading`).

### 💅 Design System & Polish

1. **Typography** : Line-height 1.5-1.75 pour le corps du texte. 65-75 caractères par ligne max.
2. **Espacement** : Utiliser une échelle cohérente (4, 8, 12, 16, 24, 32, ...).
3. **Animate** : 150-300ms pour les micro-interactions. Animer `transform` et `opacity` (pas `width`/`height`).

---

## 3. Writing Clearly & Concisely ✍️

### 🚫 AI Patterns à Éviter

* **Puffery** : "pivotal", "crucial", "vital", "testament", "cutting-edge".
* **Empty Words** : "delve", "leverage", "showcasing", "foster", "tapestry".
* **Format** : Éviter l'excès de gras et d'emojis décoratifs.

### ✅ Principes de Strunk

1. **Active Voice** : "Le système a chargé les données" > "Les données ont été chargées par le système".
2. **Omit Needless Words** : Être direct.
3. **Specific** : Utiliser des termes concrets plutôt que génériques.

---

## 4. Application dans ImmoDash

### État Actuel vs Skills

* ✅ **Lazy Loading** : Appliqué.
* ✅ **Bundle Splitting** : Appliqué.
* ✅ **Feedback** : Loaders présents.
* ⚠️ **Virtualisation** : Pas encore sur les listes natives (Pagination utilisée à la place, ce qui est une alternative valide).
* ⚠️ **Barrel Files** : À surveiller dans `src/components/index.js` (si existe).
* ⚠️ **Accessibilité** : À auditer (contrastes, focus rings).

### Actions Futures Basées sur Skills

1. Vérifier les contrastes couleurs (ThemeContext).
2. Auditer les `useEffect` pour éviter les dérivations d'état inutiles.
3. Remplacer les textes génériques "AI-style" dans l'UI par du micro-copy précis.
