#!/bin/bash

echo "🔧 CREATING ALL MISSING FILE API ROUTES"
echo "========================================"

# Create the missing route directories
mkdir -p x2ansible-ui/src/app/api/files/list
mkdir -p x2ansible-ui/src/app/api/files/tree
mkdir -p x2ansible-ui/src/app/api/files/upload
mkdir -p x2ansible-ui/src/app/api/files/clone

echo "1️⃣ Creating /api/files/list route..."
cat > x2ansible-ui/src/app/api/files/list/route.ts << 'EOF'
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://host.containers.internal:8000";

export async function GET(request: NextRequest) {
  try {
    console.log(`🚀 Proxying files list to: ${BACKEND_URL}/api/files/list`);
    
    const response = await fetch(`${BACKEND_URL}/api/files/list`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    console.log(`📥 Backend response status: ${response.status}`);
    
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("💥 Files list proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch files list", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
EOF

echo "2️⃣ Creating /api/files/tree route..."
cat > x2ansible-ui/src/app/api/files/tree/route.ts << 'EOF'
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://host.containers.internal:8000";

export async function GET(request: NextRequest) {
  try {
    console.log(`🚀 Proxying files tree to: ${BACKEND_URL}/api/files/tree`);
    
    const response = await fetch(`${BACKEND_URL}/api/files/tree`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    console.log(`📥 Backend response status: ${response.status}`);
    
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("💥 Files tree proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch files tree", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
EOF

echo "3️⃣ Creating /api/files/upload route..."
cat > x2ansible-ui/src/app/api/files/upload/route.ts << 'EOF'
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
EOF

echo "4️⃣ Creating /api/files/clone route..."
cat > x2ansible-ui/src/app/api/files/clone/route.ts << 'EOF'
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://host.containers.internal:8000";

export async function POST(request: NextRequest) {
  try {
    console.log(`🚀 Proxying git clone to: ${BACKEND_URL}/api/files/clone`);
    
    const body = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/api/files/clone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    console.log(`📥 Backend response status: ${response.status}`);
    
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("💥 Git clone proxy error:", error);
    return NextResponse.json(
      { error: "Failed to clone repository", detail: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
EOF

echo ""
echo "✅ All missing file routes created!"
echo ""
echo "📁 Created routes:"
echo "   - x2ansible-ui/src/app/api/files/list/route.ts"
echo "   - x2ansible-ui/src/app/api/files/tree/route.ts" 
echo "   - x2ansible-ui/src/app/api/files/upload/route.ts"
echo "   - x2ansible-ui/src/app/api/files/clone/route.ts"
echo ""
echo "🚀 Now rebuild and deploy:"
echo "podman build --no-cache \\"
echo "  --build-arg NEXT_PUBLIC_BACKEND_URL=https://x2ansible-backend-x2ansible.apps.cluster-7nc6z.7nc6z.sandbox2170.opentlc.com \\"
echo "  --build-arg BACKEND_URL=http://x2ansible-backend:8000 \\"
echo "  -f Dockerfile.frontend \\"
echo "  -t quay.io/rbrhssa/x2ansible-frontend:complete ."