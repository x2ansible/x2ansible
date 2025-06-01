#!/bin/bash

echo "🔧 MANUAL FIXES FOR REMAINING FILES"
echo "=================================="

echo "1️⃣ Fix page.tsx"
# Edit the main page file
cat > temp_page_fix.js << 'EOF'
const fs = require('fs');
let content = fs.readFileSync('x2ansible-ui/src/app/run/page.tsx', 'utf8');
content = content.replace(
  'const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";',
  'const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://host.containers.internal:8000";'
);
fs.writeFileSync('x2ansible-ui/src/app/run/page.tsx', content);
console.log('✅ Fixed page.tsx');
EOF
node temp_page_fix.js
rm temp_page_fix.js

echo "2️⃣ Fix WorkflowSidebar.tsx"
cat > temp_sidebar_fix.js << 'EOF'
const fs = require('fs');
let content = fs.readFileSync('x2ansible-ui/src/components/WorkflowSidebar.tsx', 'utf8');
content = content.replace(
  /\? "http:\/\/localhost:8000"/g,
  '? (process.env.NEXT_PUBLIC_BACKEND_URL || "http://host.containers.internal:8000")'
);
fs.writeFileSync('x2ansible-ui/src/components/WorkflowSidebar.tsx', content);
console.log('✅ Fixed WorkflowSidebar.tsx');
EOF
node temp_sidebar_fix.js
rm temp_sidebar_fix.js

echo "3️⃣ Fix FileTreeSelector.tsx"
cat > temp_tree_fix.js << 'EOF'
const fs = require('fs');
let content = fs.readFileSync('x2ansible-ui/src/components/FileTreeSelector.tsx', 'utf8');
content = content.replace(
  'process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"',
  'process.env.NEXT_PUBLIC_BACKEND_URL || "http://host.containers.internal:8000"'
);
fs.writeFileSync('x2ansible-ui/src/components/FileTreeSelector.tsx', content);
console.log('✅ Fixed FileTreeSelector.tsx');
EOF
node temp_tree_fix.js
rm temp_tree_fix.js

echo "4️⃣ Fix DeploymentPanel.tsx"
cat > temp_deploy_fix.js << 'EOF'
const fs = require('fs');
let content = fs.readFileSync('x2ansible-ui/src/components/DeploymentPanel.tsx', 'utf8');
content = content.replace(
  'process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"',
  'process.env.NEXT_PUBLIC_BACKEND_URL || "http://host.containers.internal:8000"'
);
fs.writeFileSync('x2ansible-ui/src/components/DeploymentPanel.tsx', content);
console.log('✅ Fixed DeploymentPanel.tsx');
EOF
node temp_deploy_fix.js
rm temp_deploy_fix.js

echo "5️⃣ Leave oldroute.ts as-is (it's not used)"

echo ""
echo "🔍 Final verification:"
grep -r "localhost:8000" x2ansible-ui/src/ --exclude="oldroute.ts" || echo "✅ All active files fixed!"

echo ""
echo "🚀 NOW REBUILD:"
echo "podman build --no-cache \\"
echo "  --build-arg NEXT_PUBLIC_BACKEND_URL=https://x2ansible-backend-x2ansible.apps.cluster-7nc6z.7nc6z.sandbox2170.opentlc.com \\"
echo "  --build-arg BACKEND_URL=http://x2ansible-backend:8000 \\"
echo "  -f Dockerfile.frontend \\"
echo "  -t quay.io/rbrhssa/x2ansible-frontend:ocp-final ."