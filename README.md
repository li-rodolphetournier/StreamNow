# 🎬 StreamNow — Plateforme VOD (Next.js + TypeScript + Tailwind)

StreamNow est une application VOD moderne inspirée de Netflix / TF1+, développée avec Next.js 15, TypeScript, TailwindCSS et Shadcn UI. L'application utilise l'API TMDB pour les données vidéo.

## 🎯 Contexte du projet

Application frontend monolithique Next.js 15 avec TypeScript, TailwindCSS, Shadcn UI, et une API externe (TMDB) pour les données vidéo.

## ⚙️ Stack technique

### Frontend
- **Next.js 15** (App Router)
- **TypeScript** (strict mode)
- **TailwindCSS**
- **Shadcn UI**
- **React Query** (@tanstack/react-query)
- **Zustand**
- **Axios**
- **Framer Motion**
- **Lucide React**
- **React Player**

### Outils de développement
- **ESLint** / **Prettier**
- **Jest** (tests unitaires)
- **Playwright** (tests E2E, optionnel)

### Environnement
- **Node.js 18+**
- **npm** ou **pnpm**
- **Déploiement sur Vercel**

## 🧱 Structure du projet

```
src/
├── app/
│   ├── (main)/
│   │   ├── page.tsx              # Page d'accueil
│   │   ├── search/
│   │   │   └── page.tsx           # Page recherche
│   │   └── video/
│   │       └── [id]/
│   │           └── page.tsx       # Page détail vidéo
│   ├── layout.tsx                 # Layout principal
│   ├── globals.css                # Styles globaux
│   └── api/
│       └── videos/
│           └── route.ts           # API route pour vidéos
├── components/
│   ├── ui/                        # Composants Shadcn UI
│   ├── video/                     # Composants vidéo
│   │   ├── VideoCard.tsx
│   │   ├── VideoGrid.tsx
│   │   ├── VideoPlayer.tsx
│   │   └── VideoCarousel.tsx
│   ├── search/                    # Composants recherche
│   │   ├── SearchBar.tsx
│   │   └── CategoryFilter.tsx
│   ├── layout/                    # Composants layout
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   └── shared/                    # Composants partagés
│       └── HeroSection.tsx
├── lib/
│   ├── api/
│   │   └── tmdb.ts               # Client API TMDB
│   ├── store/
│   │   └── useVideoStore.ts      # Store Zustand
│   └── utils.ts                  # Utilitaires
├── hooks/
│   ├── useVideos.ts              # Hook pour récupérer vidéos
│   ├── useSearch.ts              # Hook pour recherche
│   └── useWatchHistory.ts        # Hook pour historique
├── types/
│   ├── video.ts                  # Types vidéo
│   └── api.ts                    # Types API
└── public/                       # Assets statiques
```

## 🚀 Démarrage

### Prérequis
- Node.js 18+
- npm ou pnpm

### Installation

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

### Commandes disponibles

```bash
# Développement
npm run dev

# Tests unitaires (Jest + Testing Library)
npm run test

# Vérification TypeScript
npm run type-check

# Build production
npm run build

# Démarrer en production
npm start

# Linter
npm run lint

# Installer un composant Shadcn
npx shadcn-ui add button card input dialog carousel
```

### Configuration des variables d'environnement

- Copiez le fichier `.env.example` (si existant) ou créez `.env.local` à la racine :

```env
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_api_key_here
```

- **Déploiement Vercel** :
  - Ajoutez `NEXT_PUBLIC_TMDB_API_KEY` dans les Variables d'environnement (toutes les cibles nécessaires).
  - Deux options pour forcer `--legacy-peer-deps` :
    - soit ajouter la variable d’environnement `NPM_FLAGS = --legacy-peer-deps` dans l’interface Vercel,
    - soit laisser le fichier `vercel.json` fourni (déjà configuré) qui définit automatiquement `NPM_FLAGS` côté build.
  - Un fichier `.npmrc` (commité) force également `legacy-peer-deps=true`, ce qui assure le comportement même si Vercel ignore la variable.  
  - Sans cette configuration, les builds Vercel échoueront (conflit React 19 / Testing Library).

## 🧩 Fonctionnalités principales

### Pages
- **Page d'accueil** → Liste des vidéos (grille + carrousels)
- **Page détail vidéo** → Player, description, suggestions
- **Page recherche** → Barre de recherche + résultats filtrés

### Composants clés
- `VideoCard`, `VideoGrid`, `VideoPlayer`, `VideoCarousel`
- `SearchBar`, `CategoryFilter`, `HeroSection`
- `Header`, `Footer`
- Composants UI Shadcn (Button, Card, Dialog, etc.)

### Gestion de l'état
- **React Query** pour interroger TMDB (cache, statut de chargement)
- **Zustand** pour l'état global (favoris, historique de visionnage)
- Persistance locale (localStorage) pour favoris / historique

## 📈 Performance et accessibilité

- **SSR/ISR** pour la performance
- **next/image** pour l'optimisation des images
- **WCAG 2.1** pour l'accessibilité
- Lien d'évitement « Aller au contenu principal » + focus management sur `<main>`
- Navigation clavier complète (lecteur vidéo, carrousels, filtres de recherche)
- Annonces `aria-live` pour les états du player et des résultats de recherche
- **Mode hors ligne (PWA)** via `next-pwa` : service worker, page `/offline`, manifest
- **Switch thème clair/sombre** accessible dans l’en-tête (persistance via `next-themes`)
- **Lighthouse ≥ 95** sur perf / accessibilité / SEO
- **Dark mode** supporté
- **Responsive design** (mobile-first)

## 🧪 Tests

- Tests unitaires Jest + Testing Library (`npm run test`)
- Vérification de typage (`npm run type-check`) et lint (`npm run lint`)
- Pipeline CI GitHub Actions (`.github/workflows/ci.yml`) exécutant lint, type-check, tests et build à chaque push/PR
- Tests E2E Playwright (optionnel, à planifier)

## 📝 Conventions de code

- **TypeScript strict** : typage complet, éviter `any`
- **Composants fonctionnels** : function components uniquement
- **Nommage** : camelCase pour variables/fonctions, PascalCase pour composants
- **Tailwind + Shadcn UI** : utiliser les composants UI de Shadcn
- **Accessibilité** : HTML sémantique, états de focus, ARIA où nécessaire
- Voir `.cursorrules` pour plus de détails

## 🤝 Contribuer

- Commits atomiques en style impératif (`feat: …`, `fix: …`, `chore: …`)
- Respecter les conventions TypeScript/React/Tailwind
- PRs : décrire portée, décisions, trade-offs

## 📄 Licence

MIT — voir `LICENSE`.
