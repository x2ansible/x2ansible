"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function useAdminAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if user has admin privileges
  const allowedEmails = ["rbanda@redhat.com"];
  const isAdmin =
    (session?.user?.email && allowedEmails.includes(session.user.email)) ||
    process.env.NODE_ENV === "development";

  // Safe null-check
  const fromWorkflow = searchParams?.get('from') || 'x2ansible';

  useEffect(() => {
    if (status === "unauthenticated") {
      // Redirect to home page for authentication, preserve the return path
      router.replace(`/?redirect=admin&from=${fromWorkflow}`);
      return;
    }

    if (status === "authenticated" && !isAdmin) {
      // Redirect back to the workflow they came from
      router.replace(`/run?workflow=${fromWorkflow}`);
      return;
    }
  }, [status, isAdmin, router, fromWorkflow]);

  const navigateBackToApp = () => {
    router.push(`/run?workflow=${fromWorkflow}`);
  };

  return {
    session,
    status,
    isAdmin,
    fromWorkflow,
    navigateBackToApp,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    isUnauthenticated: status === "unauthenticated"
  };
}
