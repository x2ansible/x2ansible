// app/api/admin/agents/route.ts
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// GET /api/admin/agents - Get all agent configurations
export async function GET(request: NextRequest) {
  try {
    console.log("🔍 Fetching all agent configurations from backend");
    
    const response = await fetch(`${BACKEND_URL}/api/admin/agents`, {
      method: "GET",
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
        { error: "Failed to fetch agent configs", detail: data.detail || data.error || "Unknown backend error" }, 
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("💥 Admin agents fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent configurations", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/agents - Update agent instructions
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log("🚀 Proxying agent update request to:", `${BACKEND_URL}/api/admin/agents`);
    console.log("📋 Request body:", JSON.stringify(body, null, 2));
    
    // Ensure the request matches your backend's UpdateInstructionsRequest model
    const updateRequest = {
      agent_id: body.agent_id,
      instructions: body.instructions
    };
    
    console.log("📨 Sending to backend:", JSON.stringify(updateRequest, null, 2));
    
    const response = await fetch(`${BACKEND_URL}/api/admin/agents`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateRequest),
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
        { error: "Failed to update agent", detail: data.detail || data.error || "Unknown backend error" }, 
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("💥 Admin agent update error:", error);
    return NextResponse.json(
      { error: "Failed to update agent instructions", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}