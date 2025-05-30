// components/AdminNavigation.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Settings, ArrowLeft } from 'lucide-react';

const AdminNavigation: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  
  // Check if user has admin privileges
  const allowedEmails = ["rbanda@redhat.com"];
  const isAdmin = session?.user?.email && allowedEmails.includes(session.user.email) ||
                  process.env.NODE_ENV === "development";
  
  const isAdminRoute = pathname.startsWith('/admin');
  const isWorkflowRoute = pathname.startsWith('/run');

  // Only show on workflow pages (/run) or admin pages (/admin)
  // Don't show on landing page (/) or other pages
  if (!isWorkflowRoute && !isAdminRoute) {
    return null;
  }

  // Don't show the button if user is not authenticated or not admin
  if (status === "loading" || !isAdmin) {
    return null;
  }

  const handleBackToApp = () => {
    // Check if there's a specific workflow to return to
    const workflowParam = new URLSearchParams(window.location.search).get('from');
    if (workflowParam) {
      router.push(`/run?workflow=${workflowParam}`);
    } else {
      // Default to the main run page with x2ansible workflow
      router.push('/run?workflow=x2ansible');
    }
  };

  return (
    <div className="fixed top-20 right-4 z-50">
      {isAdminRoute ? (
        <button
          onClick={handleBackToApp}
          className="flex items-center gap-2 px-3 py-2 bg-red-600/90 hover:bg-red-700/90 backdrop-blur-sm border border-red-500/50 rounded-lg text-white transition-all shadow-lg text-sm font-medium"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      ) : (
        <Link
          href={`/admin?from=${pathname.includes('/run') ? new URLSearchParams(window.location.search).get('workflow') || 'x2ansible' : 'x2ansible'}`}
          className="flex items-center gap-2 px-3 py-2 bg-red-600/90 hover:bg-red-700/90 backdrop-blur-sm border border-red-500/50 rounded-lg text-white transition-all shadow-lg text-sm font-medium"
        >
          <Settings size={16} />
          Admin
        </Link>
      )}
    </div>
  );
};

export default AdminNavigation;