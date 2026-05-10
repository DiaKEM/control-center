# ─────────────────────────────────────────────────────────────
# Stage: base — Node + native build deps (sharp, vega-node/canvas)
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
RUN apk add --no-cache python3 make g++ cairo-dev pango-dev libjpeg-turbo-dev giflib-dev librsvg-dev

# ─────────────────────────────────────────────────────────────
# Stage: backend-dev — hot-reload dev server
# ─────────────────────────────────────────────────────────────
FROM base AS backend-dev
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
RUN mkdir -p /tmp/frontend-static
EXPOSE 3015
CMD ["npm", "run", "start:dev"]

# ─────────────────────────────────────────────────────────────
# Stage: frontend-dev — Vite dev server
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS frontend-dev
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# ─────────────────────────────────────────────────────────────
# Stage: backend-builder — compile TypeScript
# ─────────────────────────────────────────────────────────────
FROM base AS backend-builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
RUN npm run build

# ─────────────────────────────────────────────────────────────
# Stage: frontend-builder — tsc + Vite bundle
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ─────────────────────────────────────────────────────────────
# Stage: prod-deps — production-only node_modules (built for
#         the target platform so native modules are correct)
# ─────────────────────────────────────────────────────────────
FROM base AS prod-deps
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev

# ─────────────────────────────────────────────────────────────
# Stage: production — lean runtime image
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS production
# Runtime libs required by native modules (cairo for vega-node, etc.)
RUN apk add --no-cache cairo pango libjpeg-turbo giflib librsvg
WORKDIR /app/backend
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=backend-builder /app/dist ./dist
# Placed at /app/frontend/dist so STATIC_FRONTEND_PATH=../frontend/dist
# resolves correctly relative to WORKDIR /app/backend
COPY --from=frontend-builder /app/dist /app/frontend/dist
ENV NODE_ENV=production
ENV STATIC_FRONTEND_PATH=../frontend/dist
EXPOSE 3015
CMD ["node", "dist/main.js"]
