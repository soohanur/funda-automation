"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Mail,
  Send,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { emailsApi, type EmailRecord } from "@/lib/api/emails";
import { PageContainer } from "@/components/page-container";
import {
  DateRangeFilter,
  presetToRange,
  type DateRange,
  type RangePreset,
} from "@/components/date-range-filter";
import { cn, formatDate, formatNumber } from "@/lib/utils";

const STATUS_TONES: Record<string, string> = {
  sent: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
  queued: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function EmailsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [preset, setPreset] = useState<RangePreset>("all");
  const [range, setRange] = useState<DateRange | null>(presetToRange("all"));
  const [expanded, setExpanded] = useState<number | null>(null);
  const qc = useQueryClient();

  // Deep-link from the dashboard graph: /emails?from=YYYY-MM-DD&to=YYYY-MM-DD
  // pre-applies that custom range (the "linkup" with the report chart).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const from = sp.get("from");
    const to = sp.get("to");
    if (from && to) {
      setPreset("custom");
      setRange({ from, to });
    }
  }, []);

  const { data: stats } = useQuery({
    queryKey: ["emails", "stats"],
    queryFn: emailsApi.stats,
    refetchInterval: 30_000,
  });

  const { data: list, isLoading } = useQuery({
    queryKey: ["emails", "list", statusFilter, range],
    queryFn: () =>
      emailsApi.list({
        status: statusFilter || undefined,
        from_date: range?.from,
        to_date: range?.to,
        limit: 1000,
      }),
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
        <DateRangeFilter
          preset={preset}
          range={range}
          onChange={(p, r) => {
            setPreset(p);
            setRange(r);
          }}
        />
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
            {sendAllMutation.isPending ? "Sending…" : `Send all queued (${stats?.queued ?? 0})`}
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

      {/* Scrollable activity list — click a row to expand the full email. */}
      <div className="card mt-3 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5 text-xs text-[var(--muted-foreground)]">
          <span>{formatNumber(list?.total ?? 0)} email(s) in range</span>
          <span>Click a row to read the message</span>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="p-10 text-center text-sm text-[var(--muted-foreground)]">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-sm text-[var(--muted-foreground)]">
              No emails in this range.
            </div>
          ) : (
            items.map((e, idx) => (
              <EmailRow
                key={e.id}
                email={e}
                zebra={idx % 2 === 1}
                expanded={expanded === e.id}
                onToggle={() => setExpanded(expanded === e.id ? null : e.id)}
                canSend={!!gmail?.connected}
                sending={sendMutation.isPending && sendMutation.variables === e.id}
                onSend={() => sendMutation.mutate(e.id)}
              />
            ))
          )}
        </div>
      </div>
    </PageContainer>
  );
}

function EmailRow({
  email: e,
  zebra,
  expanded,
  onToggle,
  canSend,
  sending,
  onSend,
}: {
  email: EmailRecord;
  zebra: boolean;
  expanded: boolean;
  onToggle: () => void;
  canSend: boolean;
  sending: boolean;
  onSend: () => void;
}) {
  return (
    <div className={cn("border-b border-[var(--border)]", zebra && "bg-[var(--surface-2)]")}>
      {/* summary row */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--muted)]"
      >
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform",
            expanded && "rotate-180",
          )}
        />
        <StatusChip status={e.status} />
        <span className="hidden w-44 shrink-0 truncate text-xs text-[var(--muted-foreground)] sm:block">
          {e.sent_at ? formatDate(e.sent_at) : formatDate(e.created_at)}
        </span>
        <span className="hidden w-52 shrink-0 truncate text-sm sm:block">{e.to_email}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{e.subject}</span>
        <span className="shrink-0 text-xs text-[var(--muted-foreground)]">#{e.id}</span>
      </button>

      {/* expanded detail */}
      {expanded && (
        <div className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-4 sm:px-12">
          <div className="grid grid-cols-1 gap-x-8 gap-y-1.5 text-xs sm:grid-cols-2">
            <Field label="To" value={e.to_email} />
            <Field label="Status" value={e.status} />
            {e.cc_emails && <Field label="Cc" value={e.cc_emails} />}
            <Field label="Created" value={formatDate(e.created_at) || "—"} />
            <Field label="Sent at" value={e.sent_at ? formatDate(e.sent_at) : "—"} />
            {e.error_message && <Field label="Error" value={e.error_message} tone="rose" />}
          </div>

          <div className="mt-3">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Subject
            </div>
            <div className="text-sm font-medium">{e.subject}</div>
          </div>

          <div className="mt-3">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Body
            </div>
            {e.body_html ? (
              <div
                className="overflow-hidden rounded-lg border border-[var(--border)] bg-white"
                // Internal admin tool; body_html is our own generated template.
                dangerouslySetInnerHTML={{ __html: e.body_html }}
              />
            ) : (
              <pre className="whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm">
                {e.body || "—"}
              </pre>
            )}
          </div>

          <div className="mt-3 flex items-center gap-3">
            {e.property_id ? (
              <Link
                href={`/data/${e.property_id}`}
                className="inline-flex items-center gap-1 text-xs text-[var(--color-brand-600)] hover:underline"
              >
                View property <ExternalLink className="h-3 w-3" />
              </Link>
            ) : e.property_url ? (
              <a
                href={e.property_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[var(--color-brand-600)] hover:underline"
              >
                Funda listing <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
            {(e.status === "queued" || e.status === "failed") && (
              <button
                type="button"
                onClick={onSend}
                disabled={!canSend || sending}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-1 text-[11px] font-medium hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-50"
                title={canSend ? "Send via Gmail now" : "Connect Gmail first"}
              >
                <Send className="h-3 w-3" />
                {sending ? "Sending…" : "Send now"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, tone }: { label: string; value: string; tone?: "rose" }) {
  return (
    <div className="flex gap-2">
      <span className="w-16 shrink-0 text-[var(--muted-foreground)]">{label}</span>
      <span className={cn("min-w-0 break-words", tone === "rose" && "text-rose-700")}>{value}</span>
    </div>
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

