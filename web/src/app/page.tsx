"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function RootPage() {
  const router = useRouter();
  const { token, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    router.replace(token ? "/dashboard" : "/login");
  }, [token, loading, router]);
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="text-sm text-[var(--muted-foreground)]">Redirecting…</div>
    </div>
  );
}
