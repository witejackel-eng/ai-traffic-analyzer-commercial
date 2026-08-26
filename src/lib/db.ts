import { PrismaClient } from '@prisma/client'

/**
 * Prisma client singleton.
 *
 * CRITICAL for Vercel/serverless: without caching, every API invocation
 * creates a new PrismaClient → connection pool exhaustion → HTTP 500.
 * Cache on globalThis in BOTH development AND production.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

// Always cache — production serverless reuses the warm instance.
if (!globalForPrisma.prisma) globalForPrisma.prisma = db
