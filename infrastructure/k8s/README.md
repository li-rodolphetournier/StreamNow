# StreamNow – Déploiement Kubernetes

Ces manifestes fournissent une base pour déployer les composants StreamNow sur un cluster Kubernetes (test ou production). Ils privilégient la lisibilité et sont volontairement simples. Vous pouvez les enrichir (cert-manager, autoscaling, secrets manager…) selon votre plateforme.

## Structure

- `namespace.yaml` – Namespace dédié `streamnow`.
- `configmap-app.yaml` – Variables d'environnement non sensibles partagées par les services.
- `secret-app.yaml` – Secret Kubernetes (remplacez les valeurs avant application ou créez le secret via `kubectl`). 
- `postgres-statefulset.yaml` & `postgres-service.yaml` – Base Postgres + volume persistant.
- `api-deployment.yaml` & `api-service.yaml` – API GraphQL (`apps/api`).
- `frontend-deployment.yaml` & `frontend-service.yaml` – Frontend Next.js (SSR via `next start`).
- `home-server-deployment.yaml`, `home-server-service.yaml` & `home-server-pvc.yaml` – StreamNow Home + stockage médias.
- `ingress.yaml` – Routage HTTP (adapter les hôtes / classe d'ingress).

## Pré-requis

1. Construire et pousser les images Docker (ex. GitHub Container Registry) :

   ```bash
   docker build -t ghcr.io/<org>/streamnow-frontend:latest .
   docker build -t ghcr.io/<org>/streamnow-api:latest apps/api
   docker build -t ghcr.io/<org>/streamnow-home-server:latest apps/home-server
   docker push ghcr.io/<org>/streamnow-frontend:latest
   docker push ghcr.io/<org>/streamnow-api:latest
   docker push ghcr.io/<org>/streamnow-home-server:latest
   ```

2. Remplacer les valeurs `image:` dans les manifestes par vos références d'image.

3. Mettre à jour `configmap-app.yaml` et `secret-app.yaml` avec vos variables.

## Application

```bash
kubectl apply -f infrastructure/k8s/namespace.yaml
kubectl apply -f infrastructure/k8s/configmap-app.yaml
# Option A : modifier secret-app.yaml puis
kubectl apply -f infrastructure/k8s/secret-app.yaml
# Option B : créer le secret dynamiquement
# kubectl create secret generic streamnow-secrets --namespace streamnow \
#   --from-literal=JWT_SECRET=... --from-literal=REFRESH_TOKEN_SECRET=... \
#   --from-literal=TMDB_API_KEY=... --from-literal=ALGOLIA_ADMIN_API_KEY=... \
#   --from-literal=SERVICE_TOKEN=...

kubectl apply -f infrastructure/k8s/postgres-statefulset.yaml
kubectl apply -f infrastructure/k8s/postgres-service.yaml
kubectl apply -f infrastructure/k8s/api-deployment.yaml
kubectl apply -f infrastructure/k8s/api-service.yaml
kubectl apply -f infrastructure/k8s/frontend-deployment.yaml
kubectl apply -f infrastructure/k8s/frontend-service.yaml
kubectl apply -f infrastructure/k8s/home-server-pvc.yaml
kubectl apply -f infrastructure/k8s/home-server-deployment.yaml
kubectl apply -f infrastructure/k8s/home-server-service.yaml
kubectl apply -f infrastructure/k8s/ingress.yaml
```

## Points d'attention

- **Secrets** : ne commitez pas vos vraies valeurs. Utilisez des outils type Sealed Secrets / External Secrets pour la production.
- **TLS** : ajoutez cert-manager ou un Ingress Controller gérant TLS (annotations à compléter dans `ingress.yaml`).
- **Stockage Home Server** : `home-server-pvc.yaml` crée un volume persistant (classe `standard`). Adaptez selon votre cloud / cluster.
- **Autoscaling** : ajoutez `HorizontalPodAutoscaler` si nécessaire.
- **Monitoring / logs** : pensez à configurer Prometheus / Grafana / EFK selon votre stack observability.

Ces manifestes constituent une base opérationnelle. Adaptez-les avant toute mise en production.


