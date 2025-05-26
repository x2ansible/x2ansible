// src/app/layout.tsx - Simplified version for testing
import "./globals.css";
import type { Metadata } from "next";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "x2ansible",
  description: "Ansible using the Agentic Way",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}