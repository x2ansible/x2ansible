// File: app/api/context/query/route.ts
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

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

// File: app/api/context/ingest/route.ts
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

// File: app/api/vector-dbs/route.ts
export async function GET() {
  try {
    console.log("Proxying vector-dbs list to:", `${BACKEND_URL}/api/vector-dbs`);
    
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
      return NextResponse.json({ error: "Backend error", detail: errorText }, { status: response.status });
    }

    const data = await response.json();
    console.log("Backend response data:", data);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Vector DBs list proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch vector databases", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

// File: app/api/vector-dbs/[vector_db_id]/query/route.ts
interface RouteContext {
  params: { vector_db_id: string };
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const body = await request.json();
    const { vector_db_id } = context.params;
    
    console.log("Proxying vector DB query:", { vector_db_id, query: body.query });
    
    const response = await fetch(`${BACKEND_URL}/api/vector-dbs/${vector_db_id}/query?query=${encodeURIComponent(body.query)}&top_k=${body.top_k || 5}`, {
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
    console.error("Vector DB query proxy error:", error);
    return NextResponse.json(
      { error: "Failed to query vector database", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// File: app/api/vector-dbs/[vector_db_id]/ingest/route.ts
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const formData = await request.formData();
    const { vector_db_id } = context.params;
    
    console.log("Proxying vector DB ingest:", { vector_db_id });
    
    const response = await fetch(`${BACKEND_URL}/api/vector-dbs/${vector_db_id}/ingest`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Vector DB ingest proxy error:", error);
    return NextResponse.json(
      { error: "Failed to ingest to vector database", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}