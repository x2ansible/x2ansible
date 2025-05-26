// src/app/providers.tsx - Simplified for testing
"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}