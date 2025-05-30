import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Panel - x2Ansible",
  description: "Manage AI agent configurations and system settings",
  robots: "noindex, nofollow", // Prevent search engine indexing
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-layout">
      {children}
    </div>
  );
}