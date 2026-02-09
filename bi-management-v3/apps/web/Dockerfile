# BI Management v3 Web
# Build from monorepo root: docker build -f apps/web/Dockerfile .
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN npm install

COPY apps/web ./apps/web
COPY packages/shared ./packages/shared

RUN npm run build --workspace=@bi-management/web 2>/dev/null || (cd apps/web && npm run build)

# Production: nginx to serve static files
FROM nginx:alpine AS runner

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
