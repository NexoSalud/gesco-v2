# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /app

# Dependencias (solo cambian cuando se modifica package.json o lock)
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --legacy-peer-deps

# Config files y código fuente
COPY tsconfig.json next.config.js postcss.config.mjs ./
COPY . .

# Build
RUN npm run build

# ─── Runner ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
