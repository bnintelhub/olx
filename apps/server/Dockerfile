FROM node:20-alpine AS base
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json turbo.json .npmrc ./
COPY packages/database ./packages/database
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @olx/database db:generate
RUN pnpm --filter @olx/database build
RUN pnpm --filter @olx/shared build
RUN pnpm --filter @olx/server build

EXPOSE 5000
CMD ["pnpm", "--filter", "@olx/server", "start"]
