# Backend multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency manifests and install all deps for build
COPY package*.json ./
RUN npm ci

# Copy source code and build TypeScript
COPY . .
RUN npm run build && npm prune --production

# Production runtime image with only necessary files
FROM node:18-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/index.js"]