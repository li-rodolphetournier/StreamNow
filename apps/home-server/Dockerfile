# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/home-server/package.json apps/home-server/package.json

RUN npm install --workspace apps/home-server --include-workspace-root

COPY . .

RUN npm run build --workspace apps/home-server

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/home-server/dist ./apps/home-server/dist

EXPOSE 4300

CMD ["node", "apps/home-server/dist/index.js"]


