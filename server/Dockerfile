# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev


FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules

# Server entry
COPY index.js ./index.js
COPY src ./src
COPY public ./public

ENV HOST=0.0.0.0
ENV PORT=6868

EXPOSE 6868

# Busybox wget is present in alpine images
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/healthz >/dev/null 2>&1 || exit 1

CMD ["node", "index.js"]
