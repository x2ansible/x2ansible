// app/api/admin/agents/reload/route.ts
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://host.containers.internal:8000";

// POST /api/admin/agents/reload - Reload agent configurations from file
export async function POST(request: NextRequest) {
  try {
    console.log("🔄 Reloading agent configurations from backend");
    
    const response = await fetch(`${BACKEND_URL}/api/admin/agents/reload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("📥 Backend response status:", response.status);
    
    const contentType = response.headers.get("content-type");
    
    let data;
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
      console.log("✅ Backend JSON response:", JSON.stringify(data, null, 2));
    } else {
      const textResponse = await response.text();
      console.error("❌ Backend returned non-JSON:", textResponse);
      return NextResponse.json(
        { error: "Backend returned invalid response", detail: textResponse }, 
        { status: 500 }
      );
    }
    
    if (!response.ok) {
      console.error("❌ Backend error response:", data);
      return NextResponse.json(
        { error: "Failed to reload configurations", detail: data.detail || data.error || "Unknown backend error" }, 
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("💥 Admin reload error:", error);
    return NextResponse.json(
      { error: "Failed to reload agent configurations", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}