"use client";

import React, { Suspense } from "react";
import AdminPanel from "@/components/AdminPanel";
import AdminNavigation from "@/components/AdminNavigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";

function AdminPageContent() {
  const { 
    isLoading, 
    isUnauthenticated, 
    isAuthenticated, 
    isAdmin, 
    navigateBackToApp 
  } = useAdminAuth();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-300">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated state
  if (isUnauthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="bg-slate-800 p-8 rounded-lg shadow-xl border border-slate-700 text-center">
          <p className="mb-4 text-slate-200 font-semibold">🔒 Authentication required</p>
          <p className="text-sm text-slate-400">Please log in to access the admin panel</p>
        </div>
      </div>
    );
  }

  // Not admin state
  if (isAuthenticated && !isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="bg-slate-800 p-8 rounded-lg shadow-xl border border-slate-700 text-center">
          <p className="mb-4 text-red-400 font-semibold">🚫 Access Denied</p>
          <p className="text-sm text-slate-400 mb-4">You don't have permission to access the admin panel</p>
          <button
            onClick={navigateBackToApp}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Return to App
          </button>
        </div>
      </div>
    );
  }

  // Authenticated & admin
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <AdminNavigation />
      <AdminPanel />
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-200 text-lg">Loading admin page...</div>
      </div>
    }>
      <AdminPageContent />
    </Suspense>
  );
}
