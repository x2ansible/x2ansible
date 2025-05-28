// src/app/api/generate/route.ts

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const response = await fetch("http://localhost:8000/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // Defensive: Try parsing as JSON, fallback to text
    let data;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = { error: await response.text() };
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    // Log error for troubleshooting
    console.error("Proxy /api/generate error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to connect to backend: " + (error?.message || "Unknown error"),
      },
      { status: 502 }
    );
  }
}
