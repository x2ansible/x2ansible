#!/bin/bash

echo "🔧 Fixing the duplicate POST function in classify/route.ts..."

# Backup the current file
cp x2ansible-ui/src/app/api/classify/route.ts x2ansible-ui/src/app/api/classify/route.ts.broken

# Create a clean classify/route.ts with only the classification logic
cat > x2ansible-ui/src/app/api/classify/route.ts << 'EOF'
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://host.containers.internal:8000";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const code = body.code;

  if (!code || typeof code !== "string" || !code.trim()) {
    return NextResponse.json({ error: "Code snippet is required" }, { status: 400 });
  }

  try {
    console.log(`🚀 Making classification request to: ${BACKEND_URL}/api/classify`);
    
    const response = await fetch(`${BACKEND_URL}/api/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    console.log(`📥 Backend response status: ${response.status}`);

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ Classifier backend error:", result);
      return NextResponse.json(
        { error: result?.detail || "Backend error" },
        { status: response.status }
      );
    }

    if (result.success && result.data) {
      return NextResponse.json(result.data, { status: 200 });
    }

    console.error("❌ Invalid classifier result structure:", result);
    return NextResponse.json(
      { error: result.error || "Invalid classifier response" },
      { status: 500 }
    );
  } catch (err: any) {
    console.error("❌ Exception while calling classifier backend:", err);
    return NextResponse.json(
      { error: "Classification failed due to internal error." },
      { status: 500 }
    );
  }
}
EOF

echo "✅ Fixed classify/route.ts - removed duplicate functions"

echo ""
echo "🔍 Checking for other files with potential issues..."

# Check for any other files that might have similar issues
echo "Checking for duplicate export functions..."
for file in x2ansible-ui/src/app/api/**/*.ts; do
  if [ -f "$file" ]; then
    duplicate_count=$(grep -c "export async function POST" "$file" 2>/dev/null || echo "0")
    if [ "$duplicate_count" -gt 1 ]; then
      echo "⚠️  $file has $duplicate_count POST functions - needs manual review"
    fi
  fi
done

echo ""
echo "✅ File fixed! Now retry your build command:"
echo "podman build \\"
echo "  --build-arg NEXT_PUBLIC_BACKEND_URL=http://localhost:8000 \\"
echo "  --build-arg BACKEND_URL=http://host.containers.internal:8000 \\"
echo "  -f Dockerfile.frontend \\"
echo "  -t quay.io/rbrhssa/x2ansible-frontend:latest ."