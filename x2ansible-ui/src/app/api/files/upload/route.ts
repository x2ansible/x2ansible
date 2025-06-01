import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://host.containers.internal:8000";

export async function POST(request: NextRequest) {
  try {
    console.log(`🚀 Proxying file upload to: ${BACKEND_URL}/api/files/upload`);
    
    const formData = await request.formData();
    
    const response = await fetch(`${BACKEND_URL}/api/files/upload`, {
      method: "POST",
      body: formData,
    });

    console.log(`📥 Backend response status: ${response.status}`);
    
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("💥 File upload proxy error:", error);
    return NextResponse.json(
      { error: "Failed to upload file", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
