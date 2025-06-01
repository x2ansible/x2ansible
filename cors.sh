# 1. Look for all files that might be calling backend directly with environment variables
grep -r "NEXT_PUBLIC.*API" x2ansible-ui/src/ --include="*.ts" --include="*.tsx"

# 2. Look for files using BACKEND_URL directly (should use proxy routes)
grep -r "\${BACKEND_URL}" x2ansible-ui/src/ --include="*.ts" --include="*.tsx"

# 3. Look for direct backend URL calls
grep -r "x2ansible-backend-x2ansible" x2ansible-ui/src/ --include="*.ts" --include="*.tsx"

# 4. Look for process.env usage in components (potential direct calls)
grep -r "process\.env\.NEXT_PUBLIC" x2ansible-ui/src/ --include="*.ts" --include="*.tsx" | grep -v "|| \"/api"

# 5. Check specific files that might make API calls
echo "=== Checking useFileOperations.ts ==="
grep -A 5 -B 5 "process.env" x2ansible-ui/src/hooks/useFileOperations.ts

echo "=== Checking WorkflowSidebar.tsx ==="
grep -A 5 -B 5 "process.env" x2ansible-ui/src/components/WorkflowSidebar.tsx

echo "=== Checking page.tsx ==="
grep -A 5 -B 5 "process.env" x2ansible-ui/src/app/run/page.tsx