// app/api/admin/agents/export/route.ts
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// GET /api/admin/agents/export - Export agent configurations as YAML
export async function GET(request: NextRequest) {
  try {
    console.log("📦 Exporting agent configurations from backend");
    
    const response = await fetch(`${BACKEND_URL}/api/admin/agents/export`, {
      method: "GET",
    });

    console.log("📥 Backend response status:", response.status);
    console.log("📥 Backend response headers:", Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      // Try to get error details
      const contentType = response.headers.get("content-type");
      let errorData;
      
      if (contentType && contentType.includes("application/json")) {
        errorData = await response.json();
      } else {
        errorData = { detail: await response.text() };
      }
      
      console.error("❌ Backend error response:", errorData);
      return NextResponse.json(
        { error: "Failed to export configurations", detail: errorData.detail || "Unknown backend error" }, 
        { status: response.status }
      );
    }

    // Forward the file response
    const blob = await response.blob();
    const headers = new Headers();
    
    // Copy important headers from backend
    const contentType = response.headers.get("content-type");
    const contentDisposition = response.headers.get("content-disposition");
    
    if (contentType) {
      headers.set("Content-Type", contentType);
    } else {
      headers.set("Content-Type", "application/x-yaml");
    }
    
    if (contentDisposition) {
      headers.set("Content-Disposition", contentDisposition);
    } else {
      // Set a default filename
      const timestamp = new Date().toISOString().split('T')[0];
      headers.set("Content-Disposition", `attachment; filename="agent-config-${timestamp}.yaml"`);
    }
    
    console.log("✅ Forwarding file export");
    
    return new NextResponse(blob, {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error("💥 Admin export error:", error);
    return NextResponse.json(
      { error: "Failed to export agent configurations", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}