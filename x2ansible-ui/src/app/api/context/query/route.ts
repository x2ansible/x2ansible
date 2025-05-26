import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  console.log("=== Context Query API Called ===");
  console.log("Backend URL:", BACKEND_URL);
  
  try {
    const body = await request.json();
    console.log("Request body:", body);
    
    const response = await fetch(`${BACKEND_URL}/api/context/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    console.log("Backend response status:", response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Backend error response:", errorData);
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    console.log("Backend response data:", data);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Context query proxy error:", error);
    return NextResponse.json(
      { 
        error: "Failed to query context", 
        detail: error instanceof Error ? error.message : "Unknown error",
        backend_url: BACKEND_URL
      },
      { status: 500 }
    );
  }
}