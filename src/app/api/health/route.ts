// app/api/health/route.ts
import { NextResponse } from "next/server";
import { waitForDatabaseReady } from "../../lib/db/db-ready";

export const runtime = "nodejs";

export async function GET() {
  try {
    await waitForDatabaseReady();
    return NextResponse.json({ status: "ok", db: "ready" });
  } catch {
    return NextResponse.json(
      { status: "error", db: "starting" },
      { status: 503 }
    );
  }
}
