import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://host.containers.internal:8000";

export async function GET() {
  console.log("=== Vector DBs List API Called ===");
  console.log("Backend URL:", BACKEND_URL);
  
  try {
    const response = await fetch(`${BACKEND_URL}/api/vector-dbs`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("Backend response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend error response:", errorText);
      return NextResponse.json(
        { error: "Backend error", detail: errorText }, 
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Backend response data:", data);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Vector DBs list proxy error:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch vector databases", 
        detail: error instanceof Error ? error.message : "Unknown error",
        backend_url: BACKEND_URL
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log("=== Vector DB Create API Called ===");
  
  try {
    const url = new URL(request.url);
    const vector_db_id = url.searchParams.get('vector_db_id');
    const embedding_model = url.searchParams.get('embedding_model');

    console.log("Creating vector DB:", { vector_db_id, embedding_model });

    const response = await fetch(`${BACKEND_URL}/api/vector-dbs?vector_db_id=${vector_db_id}&embedding_model=${embedding_model}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Vector DB create proxy error:", error);
    return NextResponse.json(
      { error: "Failed to create vector database", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}