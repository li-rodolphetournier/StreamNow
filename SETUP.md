# 🚀 Guide de configuration StreamNow

## Prérequis

- Node.js 18+
- npm (workspaces activés)
- Docker + Docker Compose
- Clé API TMDB (gratuite sur [themoviedb.org](https://www.themoviedb.org/settings/api))

## Installation

1. **Installer les dépendances**

```bash
npm install
```

2. **Configurer les variables d'environnement**

Frontend (`.env.local`) :

```env
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_api_key_here
NEXT_PUBLIC_API_URL=http://localhost:4000/graphql
# Variables désormais optionnelles (plus nécessaires une fois l'auth en place)
# NEXT_PUBLIC_DEV_USER_ID=editor-demo
# NEXT_PUBLIC_DEV_USER_ROLE=editor
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_FACEBOOK_CLIENT_ID=your_facebook_app_id
NEXT_PUBLIC_OAUTH_REDIRECT_URI=http://localhost:3000/auth/oauth/callback
```

Backend :

```bash
cp apps/api/env.example apps/api/.env
```

Puis adaptez `DATABASE_URL`, `JWT_SECRET`, `TMDB_API_KEY`, etc.
Vous pouvez également fixer `LOG_LEVEL` (ex: `info`, `debug`, `warn`).
Ajoutez impérativement un secret dédié pour les refresh tokens :

```env
JWT_SECRET=change-me
REFRESH_TOKEN_SECRET=change-me-too
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=30d
```

### Providers OAuth

Créez des identifiants OAuth (Google / Facebook) et ajoutez également côté backend :

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:4000/auth/google/callback
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret
FACEBOOK_REDIRECT_URI=http://localhost:4000/auth/facebook/callback
```

3. **Lancer l’infrastructure de données (PostgreSQL + Redis + Adminer)**

```bash
docker compose -f docker-compose.dev.yml up -d
```

4. **Lancer les applications**

```bash
# Frontend Next.js
npm run dev

# API GraphQL
npm run api:dev
```

- Frontend : [http://localhost:3000](http://localhost:3000)
- GraphQL Playground : [http://localhost:4000/graphql](http://localhost:4000/graphql)
- Adminer : [http://localhost:8080](http://localhost:8080) (serveur par défaut `postgres`, user `postgres`, password `postgres`)

5. **Appliquer les migrations TypeORM (après démarrage de Postgres)**

```bash
npm run typeorm --workspace apps/api migration:run
```

## Déploiement Vercel

Pour des builds cohérents avec l'environnement local (React 19 + Testing Library) :

1. Dans votre dashboard Vercel → *Settings* → *Environment Variables* :
   - `NEXT_PUBLIC_TMDB_API_KEY = your_tmdb_api_key_here`
   - `NPM_FLAGS = --legacy-peer-deps`
2. Relancez un déploiement (`Redeploy`) pour que la configuration soit prise en compte.

> Astuce : vous pouvez aussi laisser le fichier `vercel.json` (fourni à la racine) qui force `NPM_FLAGS` côté build Vercel, et `.npmrc` (déjà commité) définit `legacy-peer-deps=true` comme filet de sécurité.

Sans la variable `NPM_FLAGS`, `npm install` échouera à cause d'un conflit de peer dependency.

## Configuration Shadcn UI

Pour ajouter des composants Shadcn UI :

```bash
npx shadcn-ui add button
npx shadcn-ui add card
npx shadcn-ui add input
npx shadcn-ui add dialog
npx shadcn-ui add carousel
```

## Structure du projet

Voir `README.md` pour la structure complète du projet.

## Prochaines étapes

1. Continuer la mise en place du dashboard d’ajout de vidéos (GraphQL + Next.js)
2. Ajouter l’authentification (NextAuth + JWT)
3. Implémenter le partage social (amis + notifications)
4. Mettre en place Husky / lint-staged pour automatiser lint & tests
5. Ajouter les scénarios E2E supplémentaires (dashboard, partage)

