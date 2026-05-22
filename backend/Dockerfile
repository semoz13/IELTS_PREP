# ── Stage 1: build ────────────────────────────────────────────────────────────
# Dev deps (typescript, tsc-alias) are needed to compile; discard this stage after.
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json .
COPY src/ ./src/

# tsc compiles TypeScript → dist/
# tsc-alias rewrites @/* path aliases to relative imports in the compiled output
RUN npm run build


# ── Stage 2: production ───────────────────────────────────────────────────────
# Final image contains only the compiled JS and production node_modules.
FROM node:20-alpine AS production

WORKDIR /app

# curl for Docker health checks
RUN apk add --no-cache curl

# Production deps only — no typescript, no tsx, no tsc-alias
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output from builder (path aliases already resolved by tsc-alias)
COPY --from=builder /app/dist ./dist

# Multer needs this directory to exist before the process starts;
# the bind-mount volume overlays it at runtime with the host's ./uploads
RUN mkdir -p uploads

EXPOSE 4000

CMD ["node", "dist/index.js"]
