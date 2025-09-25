import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    const res = await fetch(`${base}/api/runQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      cache: "no-store",
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ result: "Error: " + err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    const res = await fetch(`${base}/`, { cache: "no-store" });
    const ok = res.ok;
    return NextResponse.json({ ok }, { status: ok ? 200 : 500 });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
} 