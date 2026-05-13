"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { useAuth } from "@/lib/auth";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const { token, loading } = useAuth();

  useEffect(() => {
    if (!loading && !token) router.replace("/login");
  }, [loading, token, router]);

  // Persist collapse state.
  useEffect(() => {
    const v = window.localStorage.getItem("sidebar_collapsed");
    if (v === "1") setCollapsed(true);
  }, []);
  useEffect(() => {
    window.localStorage.setItem("sidebar_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-sm text-[var(--muted-foreground)]">Loading…</div>
      </div>
    );
  }
  if (!token) return null;

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
