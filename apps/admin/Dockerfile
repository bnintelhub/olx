FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json turbo.json .npmrc ./
COPY packages/shared ./packages/shared
COPY apps/admin ./apps/admin

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @olx/admin build

FROM nginx:alpine
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html
COPY apps/client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
