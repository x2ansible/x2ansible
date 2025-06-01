import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://host.containers.internal:8000";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const code = body.code;

  if (!code || typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ error: "Code snippet is required" }, { status: 400 });
  }

  try {
    console.log(`🚀 Making classification request to: ${BACKEND_URL}/api/classify`);
    
    const response = await fetch(`${BACKEND_URL}/api/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    console.log(`📥 Backend response status: ${response.status}`);

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ Classifier backend error:", result);
      return NextResponse.json(
        { error: result?.detail || "Backend error" },
        { status: response.status }
      );
    }

    // Handle direct classification response (no wrapper)
  if (result.classification) {
    return NextResponse.json(result, { status: 200 });
  }
  
  // Handle wrapped response format
  if (result.success && result.data) {
    return NextResponse.json(result.data, { status: 200 });
  }

    console.error("❌ Invalid classifier result structure:", result);
    return NextResponse.json(
      { error: result.error || "Invalid classifier response" },
      { status: 500 }
    );
  } catch (err: any) {
    console.error("❌ Exception while calling classifier backend:", err);
    return NextResponse.json(
      { error: "Classification failed due to internal error." },
      { status: 500 }
    );
  }
}
