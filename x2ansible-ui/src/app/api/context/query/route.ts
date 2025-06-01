import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://host.containers.internal:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log("Proxying context query to:", `${BACKEND_URL}/api/context/query`);
    console.log("Request body:", body);
    
    const response = await fetch(`${BACKEND_URL}/api/context/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log("Backend response status:", response.status);
    
    const data = await response.json();
    console.log("Backend response data:", data);

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Context query proxy error:", error);
    return NextResponse.json(
      { error: "Failed to query context", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}