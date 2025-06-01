import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://host.containers.internal:8000";

export async function POST(request: NextRequest) {
  try {
    console.log(`🚀 Proxying git clone to: ${BACKEND_URL}/api/files/clone`);
    
    const body = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/api/files/clone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    console.log(`📥 Backend response status: ${response.status}`);
    
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("💥 Git clone proxy error:", error);
    return NextResponse.json(
      { error: "Failed to clone repository", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
