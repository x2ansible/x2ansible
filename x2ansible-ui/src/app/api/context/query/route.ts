// x2ansible-ui/src/app/api/context/query/route.ts

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    let response: Response;
    try {
      response = await fetch("http://127.0.0.1:8000/api/context/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (fetchError: any) {
      // Could not reach backend at all
      return NextResponse.json(
        { success: false, error: `Backend not reachable: ${fetchError?.message || String(fetchError)}` },
        { status: 502 }
      );
    }

    // Try to parse JSON, but handle non-JSON response
    let result: any = null;
    try {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        // Not JSON, try to get text for debug
        const text = await response.text();
        return NextResponse.json(
          { success: false, error: `Backend did not return JSON. Raw: ${text.slice(0, 300)}` },
          { status: response.status }
        );
      }
    } catch (jsonError: any) {
      // Could not parse JSON at all
      return NextResponse.json(
        { success: false, error: `Failed to parse backend JSON: ${jsonError?.message || String(jsonError)}` },
        { status: response.status }
      );
    }

    return NextResponse.json(result, { status: response.status });

  } catch (e: any) {
    // Final safety net, always return JSON error
    return NextResponse.json(
      { success: false, error: `Handler crashed: ${e?.message || String(e)}` },
      { status: 500 }
    );
  }
}
