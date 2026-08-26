import { NextRequest, NextResponse } from "next/server";
import { runRealAnalysis } from "@/lib/real-analysis-service";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  try {
    await runRealAnalysis(id);
    return NextResponse.json({ ok: true, real: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
