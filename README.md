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

### Backend GraphQL
- **Apollo Server 4** + **TypeGraphQL**
- **TypeORM** (PostgreSQL)
- **Redis** (cache applicatif / sessions)
- **CASL** (RBAC/ABAC)
- **Argon2** (hash des mots de passe)
- **JSON Web Token** (authentification future)

### Outils de développement
- **ESLint** / **Prettier**
- **Jest** (tests unitaires)
- **Playwright** (tests E2E)
- **Docker / Docker Compose**

### Environnement
- **Node.js 18+**
- **npm** (workspaces)
- **Docker** & **Docker Compose**
- **Déploiement sur Vercel** (frontend)

## 🧱 Structure du projet

```
apps/
├── api/                          # Backend GraphQL (Apollo + TypeORM)
│   ├── src/
│   │   ├── config/
│   │   ├── entities/
│   │   ├── inputs/
│   │   ├── migrations/
│   │   ├── resolvers/
│   │   ├── services/
│   │   └── utils/
│   ├── env.example
│   └── tsconfig.json
src/
├── app/
│   ├── (main)/                   # Pages publiques
│   ├── layout.tsx
│   └── api/                      # Routes Next.js
├── components/                   # UI + layout + vidéo
├── hooks/
├── lib/
└── types/
```

## 🚀 Démarrage

### Prérequis
- Node.js 18+
- npm ou pnpm

### Installation

```bash
# Installer les dépendances
npm install

# Lancer la stack de données (PostgreSQL + Redis + Adminer)
docker compose -f docker-compose.dev.yml up -d

# Lancer le serveur de développement
npm run dev

# Lancer l'API GraphQL
npm run api:dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.
Le playground GraphQL est disponible sur [http://localhost:4000/graphql](http://localhost:4000/graphql).
Adminer (UI base de données) est accessible sur [http://localhost:8080](http://localhost:8080).

### Commandes disponibles

```bash
# Développement
npm run dev

# Serveur local StreamNow Home
npm run home
npm run home:build
npm run home:start

# API GraphQL
npm run api:dev

# Tests unitaires (Jest + Testing Library)
npm run test

# Tests API GraphQL
npm run test:api

# Tests E2E (Playwright)
npm run test:e2e

# Vérification TypeScript
npm run type-check
npm run type-check:api
npm run type-check:all

# Build production
npm run build
npm run api:build

# Démarrer en production
npm start

# Linter
npm run lint

# Installer un composant Shadcn
npx shadcn-ui add button card input dialog carousel
```

### StreamNow Home (serveur multimédia local)

StreamNow Home permet de lancer un serveur multimédia local — chaque utilisateur héberge ses propres fichiers, organise ses bibliothèques et expose une API sécurisée que l’interface Next.js peut consommer.

```bash
# Lancer le serveur local en développement (Fastify + TypeScript)
npm run home

# Construire la version production
npm run home:build

# Démarrer la version compilée (dist/index.js)
npm run home:start
```

- Les variables d'environnement se trouvent dans `apps/home-server/env.example`.
- Par défaut, le serveur écoute `http://127.0.0.1:4300`. Une route `/health` renvoie l'état du service.
- Le dossier média racine est configurable via `HOME_SERVER_MEDIA_ROOT` (par défaut `./media`).

### Orchestration & outils

Un `Makefile` centralise les commandes courantes :

```bash
# Installer les dépendances
make install

# Lancer le front Next.js
make dev

# Lancer StreamNow Home
make home

# Démarrer la stack Docker (Postgres, Redis, Home server, Nginx)
make docker-up

# Arrêter la stack Docker
make docker-down
```

`docker-compose.dev.yml` a été étendu avec :

- `home-server` : build via `apps/home-server/Dockerfile`, sert l’API locale et le streaming.
- `nginx` : reverse proxy de façade (port 8081) pour sécuriser l’accès HTTP depuis votre réseau.

Par défaut, Nginx relaie toutes les requêtes vers `home-server:4300`. Vous pouvez adapter la configuration dans `infrastructure/nginx/home.conf` (ajout de TLS, règles supplémentaires, etc.).

### Configuration des variables d'environnement

- Frontend : copiez `.env.example` ou créez `.env.local` à la racine :

  ```env
  NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_api_key_here
  NEXT_PUBLIC_API_URL=http://localhost:4000/graphql
  # Variables désormais optionnelles (utiles uniquement pour des tests manuels)
  # NEXT_PUBLIC_DEV_USER_ID=editor-demo
  # NEXT_PUBLIC_DEV_USER_ROLE=editor
  NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
  NEXT_PUBLIC_FACEBOOK_CLIENT_ID=your_facebook_app_id
  NEXT_PUBLIC_OAUTH_REDIRECT_URI=http://localhost:3000/auth/oauth/callback
  ```

- Backend : copiez `apps/api/env.example` vers `apps/api/.env` puis ajustez :

  ```env
  API_PORT=4000
  DATABASE_URL=postgres://postgres:postgres@localhost:5432/streamnow
  REDIS_URL=redis://localhost:6379
  JWT_SECRET=change-me
  REFRESH_TOKEN_SECRET=change-me-too
  ACCESS_TOKEN_TTL=15m
  REFRESH_TOKEN_TTL=30d
  TMDB_API_KEY=your_tmdb_api_key
  WEB_APP_ORIGIN=http://localhost:3000
  LOG_LEVEL=info
  ```

- Lancer les migrations TypeORM après la configuration :

  ```bash
  npm run typeorm --workspace apps/api migration:run
  ```

- StreamNow Home : copiez `apps/home-server/env.example` vers `apps/home-server/.env` (ou définissez `HOME_SERVER_ENV_FILE`) :

  ```env
  NODE_ENV=development
  HOME_SERVER_PORT=4300
  HOME_SERVER_HOST=127.0.0.1
  HOME_SERVER_MEDIA_ROOT=./media
  HOME_SERVER_LOG_LEVEL=info
  ```

- **Déploiement Vercel** :
  - Ajoutez `NEXT_PUBLIC_TMDB_API_URL` (vers votre instance API) et `NEXT_PUBLIC_TMDB_API_KEY` dans les variables d'environnement (toutes les cibles nécessaires).
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
- **Dashboard (en construction)** → Gestion d’un catalogue personnalisé connecté à l’API GraphQL

### Composants clés
- `VideoCard`, `VideoGrid`, `VideoPlayer`, `VideoCarousel`
- `SearchBar`, `HeroSection`, `ThemeToggle`
- `Header`, `Footer`
- Composants UI Shadcn (Button, Card, Dialog, etc.)

### Gestion de l'état & données
- **React Query** pour interroger TMDB et l’API GraphQL
- **Zustand** pour l'état global (favoris, historique de visionnage)
- Persistance locale (localStorage) pour favoris / historique
- **Apollo Client** (prévu) pour les flux GraphQL

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

- Tests unitaires frontend Jest + Testing Library (`npm run test`)
- Tests GraphQL/API (`npm run test:api`)
- Tests E2E Playwright (`npm run test:e2e`)
- Vérification de typage (`npm run type-check`) et lint (`npm run lint`)
- Pipeline CI GitHub Actions (`.github/workflows/ci.yml`) exécutant lint, type-check, tests, build et E2E à chaque push/PR

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
