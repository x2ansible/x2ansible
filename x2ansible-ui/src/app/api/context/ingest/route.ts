import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  console.log("=== Context Ingest API Called ===");
  console.log("Backend URL:", BACKEND_URL);
  
  try {
    const formData = await request.formData();
    console.log("Form data received");
    
    const response = await fetch(`${BACKEND_URL}/api/context/ingest`, {
      method: "POST",
      body: formData,
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
    console.error("Context ingest proxy error:", error);
    return NextResponse.json(
      { 
        error: "Failed to ingest document", 
        detail: error instanceof Error ? error.message : "Unknown error",
        backend_url: BACKEND_URL
      },
      { status: 500 }
    );
  }
}