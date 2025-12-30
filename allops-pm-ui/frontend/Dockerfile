# Frontend multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependency manifests and install
COPY package*.json ./
RUN npm ci

# Copy source and build production bundle
COPY . .
RUN npm run build

# Final lightweight Nginx image serving static assets
FROM nginx:1.27-alpine AS runner

WORKDIR /usr/share/nginx/html
COPY --from=builder /app/build .
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]