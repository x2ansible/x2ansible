"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Settings } from 'lucide-react';

const AdminNavigation: React.FC = () => {
  // PATCH: fallback to "" if null
  const pathname = usePathname() || "";
  const { data: session, status } = useSession();

  // Allow only specific emails or development mode
  const allowedEmails = ["rbanda@redhat.com"];
  const isAdmin =
    (session?.user?.email && allowedEmails.includes(session.user.email)) ||
    process.env.NODE_ENV === "development";

  const isAdminRoute = pathname.startsWith('/admin');
  const isWorkflowRoute = pathname.startsWith('/run');

  // Only show navigation for /run or /admin pages
  if (!isWorkflowRoute && !isAdminRoute) {
    return null;
  }

  // Don't show navigation if loading or not admin
  if (status === "loading" || !isAdmin) {
    return null;
  }

  // Only show Admin (cog) button on /run, not on /admin
  if (!isAdminRoute) {
    // Find workflow from URL for return
    let workflow = 'x2ansible';
    if (pathname.includes('/run')) {
      try {
        // window.location is not available on server, fallback to default in that case
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          workflow = params.get('workflow') || 'x2ansible';
        }
      } catch (e) {
        workflow = 'x2ansible';
      }
    }
    return (
      <div className="fixed top-20 right-4 z-50">
        <Link
          href={`/admin?from=${workflow}`}
          className="flex items-center gap-2 px-3 py-2 bg-red-600/90 hover:bg-red-700/90 backdrop-blur-sm border border-red-500/50 rounded-lg text-white transition-all shadow-lg text-sm font-medium"
        >
          <Settings size={16} />
          Admin
        </Link>
      </div>
    );
  }

  // On /admin, show nothing (no Back button)
  return null;
};

export default AdminNavigation;
