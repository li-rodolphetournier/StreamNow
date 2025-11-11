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
NEXT_PUBLIC_HOME_SERVER_URL=http://localhost:8081
NEXT_PUBLIC_HOME_SERVER_OWNER_ID=00000000-0000-0000-0000-000000000000
NEXT_PUBLIC_ALGOLIA_APP_ID= # optionnel si vous consommez Algolia directement côté client
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=
NEXT_PUBLIC_ALGOLIA_INDEX_NAME=streamnow_videos
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
SERVICE_TOKEN=change-me-service-token
ALGOLIA_APP_ID=
ALGOLIA_ADMIN_API_KEY=
ALGOLIA_SEARCH_API_KEY=
ALGOLIA_INDEX_NAME=streamnow_videos
```

> `SERVICE_TOKEN` autorise les appels du serveur StreamNow Home. Générer une valeur forte (ex : `openssl rand -hex 32` ou `powershell -Command "[guid]::NewGuid()"`).

> Les variables `ALGOLIA_*` activent l'indexation et la recherche dans Algolia. Sans elles, la recherche backend retombera sur un filtrage SQL basique (moins performant).

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

### Serveur domestique StreamNow Home

1. Copier le fichier d'exemple puis renseigner les variables indispensables :

```bash
cp apps/home-server/env.example apps/home-server/.env
```

2. Pour un usage local classique :

```env
HOME_SERVER_OWNER_ID=00000000-0000-0000-0000-000000000000  # UUID du propriétaire
HOME_SERVER_OWNER_ROLE=ADMIN
HOME_SERVER_GRAPHQL_URL=http://host.docker.internal:4000/graphql
HOME_SERVER_SERVICE_TOKEN=change-me-service-token
HOME_SERVER_SHARE_CACHE_TTL=10
```

La valeur `HOME_SERVER_SERVICE_TOKEN` doit être identique au `SERVICE_TOKEN` défini côté API.

3. Si vous utilisez Docker Compose, exportez les variables avant `make docker-up` / `docker compose` (PowerShell) :

```powershell
$Env:HOME_SERVER_OWNER_ID="00000000-0000-0000-0000-000000000000"
$Env:HOME_SERVER_OWNER_ROLE="ADMIN"
$Env:HOME_SERVER_GRAPHQL_URL="http://host.docker.internal:4000/graphql"
$Env:HOME_SERVER_SERVICE_TOKEN="change-me-service-token"
$Env:HOME_SERVER_SHARE_CACHE_TTL="10"
$Env:SERVICE_TOKEN="change-me-service-token"
$Env:NEXT_PUBLIC_HOME_SERVER_OWNER_ID=$Env:HOME_SERVER_OWNER_ID
```

> Sous bash : utiliser `export HOME_SERVER_OWNER_ID=...` etc. Ces variables sont lues par `docker-compose.dev.yml` pour alimenter le conteneur `home-server`.

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
- StreamNow Home (reverse proxy Nginx) : [http://localhost:8081](http://localhost:8081)

> 💡 Le Home Server conserve les associations de type (film, série, etc.) à côté des fichiers locaux.
> Les définitions sont stockées dans `.media-type-definitions.json` dans `HOME_SERVER_MEDIA_ROOT`.
> Vous pouvez ajouter un nouveau type directement depuis la page `/home` avec le bouton « Créer un type de média ».

### Application Desktop (Electron)

1. **Développement**

   ```bash
   # Lance Electron (fenêtre + home-server local)
   npm run dev --workspace apps/desktop
   ```

2. **Générer le setup Windows (.exe)**

   ```bash
   npm run dist --workspace apps/desktop
   ```

   - Le script exécute `npm run home:build` (build Fastify), compile l’app desktop, puis lance Electron Builder.
   - L’installeur est produit dans `apps/desktop/release/StreamNow Home Setup 0.1.0.exe`.
   - Personnaliser l’icône : placez `apps/desktop/build/icon.ico` avant le packaging.

3. **Installer & exécuter**
   - Distribuez le `.exe` généré.
   - L’application installe le Home Server dans le répertoire utilisateur (`AppData/Roaming/StreamNow Home/home_media`) et le lance automatiquement.

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

