import { NextRequest, NextResponse } from "next/server";

/**
 * Check if the database is reachable. Used by /api/health/db.
 * Returns a friendly message explaining what's wrong if DB is unavailable
 * (instead of an opaque 500).
 */
export async function checkDb(): Promise<{ ok: boolean; message: string; hint?: string }> {
  try {
    const { db } = await import("@/lib/db");
    // Simple query — if it succeeds, DB is reachable.
    await db.project.count();
    return { ok: true, message: "Database connected" };
  } catch (e) {
    const msg = (e as Error).message;
    // Detect common Vercel deployment issues
    if (msg.includes("DATABASE_URL") || msg.includes("no such file") || msg.includes("connection")) {
      return {
        ok: false,
        message: "Database not configured",
        hint:
          "Set the DATABASE_URL environment variable in Vercel. " +
          "SQLite (file:) won't work on Vercel serverless — use Vercel Postgres, Neon, or Supabase. " +
          "See docs/DEPLOYMENT.md for setup instructions.",
      };
    }
    return { ok: false, message: msg.slice(0, 200) };
  }
}

/**
 * Wrap an API handler with DB-error handling — returns a friendly 503
 * instead of an opaque 500 when the database is unreachable.
 */
export function withDbCheck<T>(
  handler: (req: NextRequest, ctx: T) => Promise<NextResponse>,
): (req: NextRequest, ctx: T) => Promise<NextResponse> {
  return async (req: NextRequest, ctx: T) => {
    try {
      return await handler(req, ctx);
    } catch (e) {
      const msg = (e as Error).message;
      if (
        msg.includes("DATABASE_URL") ||
        msg.includes("no such file") ||
        msg.includes("Can't reach database") ||
        msg.includes("connect ECONNREFUSED") ||
        msg.includes("prepared statement") ||
        msg.includes("relation") && msg.includes("does not exist")
      ) {
        return NextResponse.json(
          {
            error: "Database not configured",
            hint:
              "Set DATABASE_URL in your Vercel environment variables. SQLite (file:) doesn't work on Vercel serverless — provision Vercel Postgres (free) or Neon. See docs/DEPLOYMENT.md.",
          },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: msg.slice(0, 300) }, { status: 500 });
    }
  };
}
