FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json turbo.json .npmrc ./
COPY packages/shared ./packages/shared
COPY apps/client ./apps/client

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @olx/client build

FROM nginx:alpine
COPY --from=builder /app/apps/client/dist /usr/share/nginx/html
COPY apps/client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
