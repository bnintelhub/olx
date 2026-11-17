import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Configure database connection pool parameters for high concurrency.
 * Ensures minimum 35 connections and a 20-second pool acquisition timeout
 * to prevent Prisma connection pool starvation under load.
 */
function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;

  let tunedUrl = url;
  if (!tunedUrl.includes('connection_limit=')) {
    const sep = tunedUrl.includes('?') ? '&' : '?';
    tunedUrl = `${tunedUrl}${sep}connection_limit=35`;
  }
  if (!tunedUrl.includes('pool_timeout=')) {
    const sep = tunedUrl.includes('?') ? '&' : '?';
    tunedUrl = `${tunedUrl}${sep}pool_timeout=20`;
  }
  return tunedUrl;
}

const datasourceUrl = getDatabaseUrl();

export const prisma: PrismaClient =
  (global.__prisma as PrismaClient) ||
  new PrismaClient({
    datasourceUrl,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export * from '@prisma/client';
