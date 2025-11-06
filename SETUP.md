# 🚀 Guide de configuration StreamNow

## Prérequis

- Node.js 18+
- npm ou pnpm
- Clé API TMDB (gratuite sur [themoviedb.org](https://www.themoviedb.org/settings/api))

## Installation

1. **Installer les dépendances**

```bash
npm install
```

2. **Configurer les variables d'environnement**

Créez un fichier `.env.local` à la racine du projet :

```env
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_api_key_here
```

Pour obtenir votre clé API TMDB :
- Créez un compte sur [themoviedb.org](https://www.themoviedb.org/)
- Allez dans Paramètres > API
- Demandez une clé API (gratuite)
- Copiez la clé dans votre `.env.local`

3. **Lancer le serveur de développement**

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

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

1. Installer les composants Shadcn UI nécessaires
2. Implémenter les composants vidéo (VideoCard, VideoGrid, VideoPlayer, etc.)
3. Implémenter les pages (accueil, recherche, détail vidéo)
4. Ajouter le dark mode
5. Configurer les tests (Jest, Playwright)

