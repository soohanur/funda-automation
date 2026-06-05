"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Mail,
  Send,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { emailsApi } from "@/lib/api/emails";
import { PageContainer } from "@/components/page-container";
import { cn, formatDate, formatNumber } from "@/lib/utils";

const STATUS_TONES: Record<string, string> = {
  sent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
  queued: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function EmailsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const qc = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ["emails", "stats"],
    queryFn: emailsApi.stats,
    refetchInterval: 30_000,
  });

  const { data: list, isLoading } = useQuery({
    queryKey: ["emails", "list", statusFilter],
    queryFn: () => emailsApi.list({ status: statusFilter || undefined, limit: 100 }),
    refetchInterval: 30_000,
  });

  const { data: gmail } = useQuery({
    queryKey: ["gmail", "status"],
    queryFn: emailsApi.gmailStatus,
    refetchInterval: 60_000,
  });

  const sendMutation = useMutation({
    mutationFn: (id: number) => emailsApi.sendNow(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emails"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const sendAllMutation = useMutation({
    mutationFn: () => emailsApi.sendQueued(),
    onSuccess: (r) => {
      toast.success(`Sent ${r.sent} of ${r.attempted} (${r.failed} failed).`);
      qc.invalidateQueries({ queryKey: ["emails"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Send all failed — is Gmail connected?"),
  });

  const items = list?.items ?? [];

  return (
    <PageContainer>
      {/* Gmail connection banner */}
      <GmailConnectionBanner status={gmail} />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Total"
          value={formatNumber(stats?.total ?? 0)}
          icon={<Mail className="h-4 w-4" />}
          tone="brand"
        />
        <StatCard
          label="Sent"
          value={formatNumber(stats?.sent ?? 0)}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="emerald"
        />
        <StatCard
          label="Queued"
          value={formatNumber(stats?.queued ?? 0)}
          icon={<Clock className="h-4 w-4" />}
          tone="amber"
        />
        <StatCard
          label="Failed"
          value={formatNumber(stats?.failed ?? 0)}
          icon={<AlertCircle className="h-4 w-4" />}
          tone="rose"
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <StatCard
          label="Sent today"
          value={formatNumber(stats?.sent_today ?? 0)}
          icon={<TrendingUp className="h-4 w-4" />}
          tone="brand"
          slim
        />
        <StatCard
          label="Sent this week"
          value={formatNumber(stats?.sent_this_week ?? 0)}
          icon={<TrendingUp className="h-4 w-4" />}
          tone="brand"
          slim
        />
      </div>

      {/* Toolbar */}
      <div className="card mt-6 flex flex-wrap items-center gap-3 p-4">
        <h3 className="text-sm font-semibold">Recent activity</h3>
        <div className="flex-1" />
        {(stats?.queued ?? 0) > 0 && (
          <button
            type="button"
            onClick={() => sendAllMutation.mutate()}
            disabled={!gmail?.connected || sendAllMutation.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--color-brand-600)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            title={gmail?.connected ? "Send all queued + failed emails now" : "Connect Gmail first"}
          >
            <Send className="h-3.5 w-3.5" />
            {sendAllMutation.isPending
              ? "Sending…"
              : `Send all queued (${stats?.queued ?? 0})`}
          </button>
        )}
        <select
          className="input max-w-[160px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All status</option>
          <option value="queued">Queued</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Table — grows naturally; PageContainer owns the scroll. */}
      <div className="card mt-3 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-[var(--surface)]">
              <tr className="border-b border-[var(--border)]">
                <Th>Status</Th>
                <Th>Created</Th>
                <Th>To</Th>
                <Th>Subject</Th>
                <Th>Property</Th>
                <Th>Sent at</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-sm text-[var(--muted-foreground)]">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-sm text-[var(--muted-foreground)]">
                    No emails yet. Send one from a property row.
                  </td>
                </tr>
              )}
              {items.map((e, idx) => (
                <tr
                  key={e.id}
                  className={cn(
                    "border-b border-[var(--border)] hover:bg-[var(--muted)]",
                    idx % 2 === 1 && "bg-[var(--surface-2)]"
                  )}
                >
                  <Td>
                    <StatusChip status={e.status} />
                  </Td>
                  <Td>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {formatDate(e.created_at)}
                    </span>
                  </Td>
                  <Td>{e.to_email}</Td>
                  <Td>
                    <span className="font-medium">{e.subject}</span>
                  </Td>
                  <Td>
                    {e.property_id ? (
                      <Link
                        href={`/data/${e.property_id}`}
                        className="inline-flex items-center gap-1 text-[var(--color-brand-600)] hover:underline"
                      >
                        View
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : e.property_url ? (
                      <a
                        href={e.property_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[var(--color-brand-600)] hover:underline"
                      >
                        Funda
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-[var(--muted-foreground)]">—</span>
                    )}
                  </Td>
                  <Td>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {e.sent_at ? formatDate(e.sent_at) : "—"}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(e.status === "queued" || e.status === "failed") && (
                        <button
                          type="button"
                          onClick={() => sendMutation.mutate(e.id)}
                          disabled={
                            !gmail?.connected ||
                            (sendMutation.isPending && sendMutation.variables === e.id)
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] font-medium hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-50"
                          title={
                            gmail?.connected
                              ? "Send via Gmail now"
                              : "Connect Gmail first to send"
                          }
                        >
                          <Send className="h-3 w-3" />
                          {sendMutation.isPending && sendMutation.variables === e.id
                            ? "Sending…"
                            : "Send"}
                        </button>
                      )}
                      <span className="text-xs text-[var(--muted-foreground)]">
                        #{e.id}
                      </span>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </PageContainer>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
  slim,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "brand" | "emerald" | "amber" | "rose";
  slim?: boolean;
}) {
  const toneClass =
    tone === "brand"
      ? "bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
      : tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
      ? "bg-amber-50 text-amber-700"
      : "bg-rose-50 text-rose-700";
  return (
    <div className="card flex items-center justify-between p-5">
      <div>
        <div className="text-xs font-medium text-[var(--muted-foreground)]">{label}</div>
        <div className={cn("mt-1 font-semibold tabular-nums", slim ? "text-xl" : "text-2xl")}>
          {value}
        </div>
      </div>
      <div className={cn("grid h-10 w-10 place-items-center rounded-xl", toneClass)}>{icon}</div>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]", className)}>
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2.5", className)}>{children}</td>;
}

function GmailConnectionBanner({
  status,
}: {
  status: { connected: boolean; email_address?: string | null; reason?: string | null } | undefined;
}) {
  // Only show the banner when NOT connected. Once Gmail is connected it
  // disappears — no need to nag a working setup. Undefined (still
  // loading) hides it too, avoiding an amber flicker on first paint.
  if (status === undefined || status.connected === true) return null;

  const email = status.email_address ?? "shared sender mailbox";
  const url = emailsApi.gmailConnectUrl();
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="grid h-8 w-8 place-items-center rounded-md bg-white/60">
        <Mail className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">Gmail not connected</div>
        <div className="text-xs opacity-80">
          {status.reason ?? `Connect ${email} to start sending emails via Gmail.`}
        </div>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700"
      >
        Connect Gmail
      </a>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const tone = STATUS_TONES[status] ?? "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", tone)}>
      {status}
    </span>
  );
}

