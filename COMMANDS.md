# 📚 Mémo Commandes StreamNow

## Démarrer / Redémarrer l’environnement

### Stack Docker complète (Postgres, Redis, Home Server, Nginx…)
```bash
make docker-up          # démarrer
make docker-down        # arrêter
make docker-down && make docker-up   # redémarrer proprement
```
> Avant `make docker-up`, exporter les variables `HOME_SERVER_OWNER_ID`, `HOME_SERVER_GRAPHQL_URL`, `HOME_SERVER_SERVICE_TOKEN`, `HOME_SERVER_SHARE_CACHE_TTL`, `SERVICE_TOKEN`, etc. afin que le conteneur StreamNow Home démarre avec la bonne configuration.

### Frontend Next.js
```bash
npm run dev
```

### API GraphQL (apps/api)
```bash
npm --workspace apps/api run dev
```

### Home Server (mode développement hors Docker)
```bash
make home          # lance en watch (Ctrl+C pour arrêter)
make home-stop     # kill le process dev
make home-build    # compile
make home-start    # démarre la version buildée
```

### Rebuild home-server en Docker (après modifications)
```bash
docker compose -f docker-compose.dev.yml build --no-cache home-server
docker compose -f docker-compose.dev.yml up -d home-server nginx
```

### Kubernetes (manifeste de base)
```bash
# Appliquer les manifestes (namespace + config + workloads)
kubectl apply -f infrastructure/k8s/namespace.yaml
kubectl apply -f infrastructure/k8s/configmap-app.yaml
kubectl apply -f infrastructure/k8s/secret-app.yaml   # ou kubectl create secret ...
kubectl apply -f infrastructure/k8s/postgres-statefulset.yaml
kubectl apply -f infrastructure/k8s/postgres-service.yaml
kubectl apply -f infrastructure/k8s/redis-deployment.yaml
kubectl apply -f infrastructure/k8s/redis-service.yaml
kubectl apply -f infrastructure/k8s/api-deployment.yaml
kubectl apply -f infrastructure/k8s/api-service.yaml
kubectl apply -f infrastructure/k8s/frontend-deployment.yaml
kubectl apply -f infrastructure/k8s/frontend-service.yaml
kubectl apply -f infrastructure/k8s/home-server-pvc.yaml
kubectl apply -f infrastructure/k8s/home-server-deployment.yaml
kubectl apply -f infrastructure/k8s/home-server-service.yaml
kubectl apply -f infrastructure/k8s/ingress.yaml

# Nettoyer l'environnement
kubectl delete namespace streamnow
```

---

## Migrations Base de Données (apps/api)

### Appliquer les migrations existantes
```bash
npm --workspace apps/api run typeorm migration:run
```

### Générer une nouvelle migration
```bash
npm --workspace apps/api run typeorm migration:generate src/migrations/1710000008000-NomMigration
```

### Revenir à l’état précédent (une migration en arrière)
```bash
npm --workspace apps/api run typeorm migration:revert
```

> 💡 Assure-toi que la base (Postgres via `make docker-up`) est lancée avant d’exécuter les migrations ou de démarrer l’API.


