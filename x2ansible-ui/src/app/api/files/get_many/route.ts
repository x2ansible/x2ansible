// x2ansible-ui/src/app/api/files/get_many/route.ts
import { NextRequest, NextResponse } from "next/server";

// Use BACKEND_URL for server-side calls (container-to-container)
const BACKEND_URL = process.env.BACKEND_URL || "http://host.containers.internal:8000";

export async function POST(request: NextRequest) {
  try {
    console.log(`Making request to: ${BACKEND_URL}/api/files/get_many`);
    
    const body = await request.json();
    
    // Forward the exact payload to backend
    const response = await fetch(`${BACKEND_URL}/api/files/get_many`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      console.error(`Backend response: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("get_many proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch files", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}