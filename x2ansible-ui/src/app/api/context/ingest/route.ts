import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://host.containers.internal:8000";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    console.log("Proxying context ingest to:", `${BACKEND_URL}/api/context/ingest`);
    
    const response = await fetch(`${BACKEND_URL}/api/context/ingest`, {
      method: "POST",
      body: formData,
    });

    console.log("Backend response status:", response.status);
    
    const data = await response.json();
    console.log("Backend response data:", data);

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Context ingest proxy error:", error);
    return NextResponse.json(
      { error: "Failed to ingest document", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}