import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://host.containers.internal:8000";

export async function GET(request: NextRequest) {
  try {
    console.log(`🚀 Proxying files tree to: ${BACKEND_URL}/api/files/tree`);
    
    const response = await fetch(`${BACKEND_URL}/api/files/tree`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    console.log(`📥 Backend response status: ${response.status}`);
    
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("💥 Files tree proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch files tree", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
