import { NextResponse } from "next/server";
import { checkDb } from "@/lib/db-health";

export async function GET() {
  const status = await checkDb();
  return NextResponse.json(status, { status: status.ok ? 200 : 503 });
}
