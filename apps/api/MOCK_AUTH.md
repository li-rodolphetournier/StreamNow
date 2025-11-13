# Mode Mock Authentication

Le mode mock permet d'accéder à l'API sans authentification réelle, utile pour les tests et le développement.

## Activation

1. **Variable d'environnement** : Ajoutez `ENABLE_MOCK_AUTH=true` dans votre fichier `.env` ou dans les variables d'environnement de Render/Vercel.

2. **Redémarrez l'API** pour que la variable soit prise en compte.

## Utilisation

Une fois activé, vous pouvez utiliser le mode mock de deux façons :

### Option 1 : Paramètre d'URL

Ajoutez `?mock=true` à n'importe quelle requête GraphQL :

```
https://votre-api.onrender.com/graphql?mock=true
```

### Option 2 : Header HTTP

Ajoutez le header `x-mock-auth: true` à vos requêtes :

```http
POST /graphql HTTP/1.1
Host: votre-api.onrender.com
Content-Type: application/json
x-mock-auth: true

{
  "query": "{ me { id email } }"
}
```

## Comportement

Quand le mode mock est activé et détecté :

- **User ID** : `00000000-0000-0000-0000-000000000000` (UUID fixe)
- **Rôle** : `ADMIN` (tous les droits)
- **Permissions** : Accès complet à toutes les fonctionnalités (lecture, création, modification, suppression)

## Exemple avec curl

```bash
curl -X POST https://votre-api.onrender.com/graphql?mock=true \
  -H "Content-Type: application/json" \
  -d '{"query": "{ me { id email role } }"}'
```

## Exemple avec fetch (JavaScript)

```javascript
const response = await fetch('https://votre-api.onrender.com/graphql?mock=true', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: `
      query {
        me {
          id
          email
          role
        }
      }
    `
  })
});

const data = await response.json();
console.log(data);
```

## Sécurité

⚠️ **Important** : Le mode mock ne doit **JAMAIS** être activé en production (`ENABLE_MOCK_AUTH=false` ou non défini). Il est uniquement destiné au développement et aux tests.

## Désactivation

Pour désactiver le mode mock, définissez `ENABLE_MOCK_AUTH=false` ou supprimez la variable d'environnement, puis redémarrez l'API.

