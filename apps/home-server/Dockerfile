# syntax=docker/dockerfile:1.6

FROM node:20-alpine AS builder

WORKDIR /app

COPY apps/home-server/package.json ./package.json

RUN npm install

COPY apps/home-server/ ./

RUN npm run build
RUN npm prune --production

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 4300

CMD ["node", "dist/index.js"]


