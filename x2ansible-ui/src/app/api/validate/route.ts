import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://host.containers.internal:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log("🚀 Proxying validation request to:", `${BACKEND_URL}/api/validate`);
    console.log("📋 Request body:", JSON.stringify(body, null, 2));
    
    // Ensure the request matches your backend's ValidateRequest model exactly
    const validationRequest = {
      playbook: body.playbook,
      lint_profile: body.lint_profile || "production"
    };
    
    console.log("📨 Sending to backend:", JSON.stringify(validationRequest, null, 2));
    
    const response = await fetch(`${BACKEND_URL}/api/validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(validationRequest),
    });

    console.log("📥 Backend response status:", response.status);
    console.log("📥 Backend response headers:", Object.fromEntries(response.headers.entries()));
    
    // Handle non-JSON responses
    const contentType = response.headers.get("content-type");
    console.log("📄 Content-Type:", contentType);
    
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
        { error: "Validation failed", detail: data.detail || data.error || "Unknown backend error" }, 
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("💥 Validation proxy error:", error);
    return NextResponse.json(
      { error: "Failed to validate playbook", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}