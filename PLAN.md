# 📋 Plan de développement StreamNow

## 🎯 Vue d'ensemble

Projet VOD développé étape par étape selon les spécifications, avec un focus sur la qualité, la performance et l'accessibilité.

**Durée estimée MVP** : 20-30h (1-2 semaines)  
**Durée estimée complète** : 40-60h (2-3 semaines)

---

## 📊 PHASE 1 : MVP (Priorité 1 - 20-30h)

### ✅ Étape 1.1 : Catalogue de vidéos (US1) - ⭐⭐⭐ PRIORITÉ 1
**Durée** : 4-5h

**Objectifs** :
- [x] Intégration API TMDB (déjà fait dans `lib/api/tmdb.ts`)
- [ ] Composant `VideoCard` avec vignette, titre, durée, catégorie
- [ ] Composant `VideoGrid` responsive (3-4 colonnes desktop, 1-2 mobile)
- [ ] Hover vignette → aperçu animé + bouton "Regarder"
- [ ] Page d'accueil avec liste de vidéos (tendances, films, séries)

**Fichiers à créer** :
- `src/components/video/VideoCard.tsx`
- `src/components/video/VideoGrid.tsx`
- `src/components/video/VideoCarousel.tsx`
- `src/app/(main)/page.tsx` (mise à jour)

---

### ✅ Étape 1.2 : Page détail vidéo (US2) - ⭐⭐⭐ PRIORITÉ 1
**Durée** : 3-4h

**Objectifs** :
- [ ] Page détail complète avec toutes les infos
- [ ] Hero section avec vidéo/image en grand
- [ ] Bouton "Regarder" → lancement player
- [ ] Section recommandations "Similaires"

**Fichiers à créer/modifier** :
- `src/app/(main)/video/[id]/page.tsx` (compléter)
- `src/components/video/VideoHero.tsx`
- `src/components/video/VideoDetails.tsx`
- `src/components/video/VideoRecommendations.tsx`

---

### ✅ Étape 1.3 : Player vidéo fonctionnel (US3) - ⭐⭐⭐ PRIORITÉ 1
**Durée** : 4-5h

**Objectifs** :
- [ ] Intégration React Player
- [ ] Contrôles : lecture/pause, volume, plein écran
- [ ] Barre de progression interactive (seek)
- [ ] Affichage durée écoulée/totale
- [ ] Responsive (desktop + mobile)
- [ ] Navigation clavier (Espace, Flèches)

**Fichiers à créer** :
- `src/components/video/VideoPlayer.tsx`
- `src/hooks/useVideoPlayer.ts`

---

### ✅ Étape 1.4 : Recherche temps réel (US4) - ⭐⭐ PRIORITÉ 2
**Durée** : 2-3h

**Objectifs** :
- [ ] Barre de recherche en header
- [ ] Recherche temps réel avec debounce (300ms)
- [ ] Affichage résultats filtrés
- [ ] Message si aucun résultat

**Fichiers à créer/modifier** :
- `src/components/search/SearchBar.tsx`
- `src/components/search/SearchResults.tsx`
- `src/app/(main)/search/page.tsx` (compléter)
- `src/components/layout/Header.tsx`

---

### ✅ Étape 1.5 : UI/UX inspirée Netflix (US5) - ⭐⭐ PRIORITÉ 2
**Durée** : 4-5h

**Objectifs** :
- [ ] Hero banner vidéo en tête (vidéo featured)
- [ ] Carrousels horizontaux (tendances, films, séries)
- [ ] Design moderne avec dark mode
- [ ] Animations fluides (Framer Motion)
- [ ] Header et Footer complets

**Fichiers à créer** :
- `src/components/shared/HeroSection.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/Footer.tsx`
- Mise à jour `src/app/globals.css` pour dark mode

---

### ✅ Étape 1.6 : Performance & Accessibilité (US6) - ⭐⭐⭐ PRIORITÉ 1
**Durée** : 3-4h

**Objectifs** :
- [ ] SSR/SSG pour pages catalogue
- [ ] ISR pour pages détail (revalidate: 3600)
- [ ] Optimisation images avec next/image
- [ ] Lazy loading composants lourds
- [ ] Skeleton loaders
- [ ] Navigation clavier complète
- [ ] ARIA labels sur interactifs

**Fichiers à créer/modifier** :
- `src/components/shared/Skeleton.tsx`
- Mise à jour pages avec SSG/ISR
- Tests accessibilité de base

---

## 📊 PHASE 2 : Fonctionnalités avancées (Priorité 2 - +10-15h)

### ✅ Étape 2.1 : Reprise de lecture (US5)
**Durée** : 2-3h

**Objectifs** :
- [ ] Stockage position vidéo dans localStorage
- [ ] Badge "Continuer à regarder" si progression > 5%
- [ ] Reprise automatique au clic

**Fichiers à modifier** :
- `src/lib/store/useVideoStore.ts` (déjà fait, à compléter)
- `src/components/video/VideoPlayer.tsx`
- `src/components/video/VideoCard.tsx`

---

### ✅ Étape 2.2 : Favoris & Watchlist (US6)
**Durée** : 2-3h

**Objectifs** :
- [ ] Bouton cœur sur vignette
- [ ] Stockage localStorage (déjà fait dans Zustand)
- [ ] Page "Mes Favoris"

**Fichiers à créer/modifier** :
- `src/app/(main)/favorites/page.tsx`
- `src/components/video/VideoCard.tsx` (ajout bouton favori)

---

### ✅ Étape 2.3 : Catégories & Filtres (US7)
**Durée** : 3-4h

**Objectifs** :
- [ ] Menu catégories (Films, Séries, Docs)
- [ ] Filtres multiples (genre, année, durée)
- [ ] URL params pour partage (?category=films)

**Fichiers à créer** :
- `src/components/search/CategoryFilter.tsx`
- `src/components/search/FilterPanel.tsx`
- Mise à jour `src/app/(main)/page.tsx`

---

## 📊 PHASE 3 : Performance & Polish (+5-10h)

### ✅ Étape 3.1 : Tests
**Durée** : 3-4h

**Objectifs** :
- [ ] Tests unitaires composants (Jest)
- [ ] Tests E2E parcours utilisateur (Playwright)
- [ ] Tests accessibilité (Axe DevTools)

---

### ✅ Étape 3.2 : Accessibilité complète
**Durée** : 2-3h

**Objectifs** :
- [ ] Navigation clavier complète
- [ ] ARIA labels sur tous les interactifs
- [ ] Contraste WCAG AA
- [ ] Tests lecteur d'écran (VoiceOver/NVDA)

---

### ✅ Étape 3.3 : CI/CD & Documentation
**Durée** : 2-3h

**Objectifs** :
- [ ] GitHub Actions (CI/CD)
- [ ] Documentation technique complète
- [ ] README avec screenshots
- [ ] Déploiement Vercel

---

## 🎯 Prochaines étapes immédiates

1. **Commencer par l'Étape 1.1** : Catalogue de vidéos
   - Créer `VideoCard` et `VideoGrid`
   - Mettre à jour la page d'accueil
   - Intégrer les données TMDB

2. **Puis Étape 1.2** : Page détail vidéo
3. **Puis Étape 1.3** : Player vidéo
4. **Et ainsi de suite...**

---

## 📝 Notes importantes

- Toutes les dépendances sont déjà installées
- L'API TMDB est déjà configurée dans `lib/api/tmdb.ts`
- Le store Zustand est déjà créé pour favoris/historique
- React Query est configuré dans `Providers.tsx`
- La structure de dossiers est en place

**Il ne reste plus qu'à implémenter les composants et pages !**

