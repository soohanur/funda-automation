"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  propertiesApi,
  type ListParams,
  type Property,
} from "@/lib/api/properties";
import { PageContainer } from "@/components/page-container";
import { EmailModal } from "@/components/email-modal";
import { PropertiesTable } from "@/components/properties-table";
import { formatNumber } from "@/lib/utils";

const PAGE_SIZE = 50;

// Sheet tab order (newest publication-date bucket first).
const TAB_ORDER = [
  "3-7 Days Ago",
  "8-12 Days Ago",
  "13-17 Days Ago",
  "25-30 Days Ago",
  "30+ Days Ago",
];

const STATUS_OPTIONS = [
  { label: "All status", value: "" },
  { label: "Sent email", value: "sent" },
  { label: "Not sent email", value: "not_sent" },
];

export default function DataPage() {
  const qc = useQueryClient();
  const [params, setParams] = useState<ListParams>({
    sort: "scrape_date",
    order: "asc",
    limit: PAGE_SIZE,
    offset: 0,
  });
  const [searchInput, setSearchInput] = useState("");
  const [emailProperty, setEmailProperty] = useState<Property | null>(null);

  // Debounced search → params.q.
  useEffect(() => {
    const t = setTimeout(() => {
      setParams((p) => {
        if ((p.q ?? "") === (searchInput || "")) return p;
        return { ...p, q: searchInput || undefined, offset: 0 };
      });
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data: filterOpts } = useQuery({
    queryKey: ["properties", "filters"],
    queryFn: propertiesApi.filters,
    staleTime: 60_000,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["properties", "list", params],
    queryFn: () => propertiesApi.list(params),
    placeholderData: (prev) => prev,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });

  const syncM = useMutation({
    mutationFn: propertiesApi.sync,
    onSuccess: (r) => {
      toast.success(`Synced: ${r.inserted} new, ${r.updated} updated (${r.total_rows} rows)`);
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Sync failed — check backend logs"),
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (params.limit ?? PAGE_SIZE)));
  const currentPage = Math.floor((params.offset ?? 0) / (params.limit ?? PAGE_SIZE)) + 1;

  const onSort = (key: string) => {
    setParams((p) => {
      if (p.sort === key) {
        return { ...p, order: p.order === "asc" ? "desc" : "asc", offset: 0 };
      }
      return { ...p, sort: key, order: "asc", offset: 0 };
    });
  };

  const items = data?.items ?? [];
  const showingFrom = items.length > 0 ? (params.offset ?? 0) + 1 : 0;
  const showingTo = (params.offset ?? 0) + items.length;

  // Order sheet_tab dropdown — known tabs in fixed order, then anything else.
  const allTabs = filterOpts?.sheet_tab ?? [];
  const orderedTabs = [
    ...TAB_ORDER.filter((t) => allTabs.includes(t)),
    ...allTabs.filter((t) => !TAB_ORDER.includes(t)),
  ];

  return (
    <PageContainer>
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-[260px] flex-1">
          <input
            type="text"
            className="input"
            placeholder="Search address, agency, URL, description…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <select
          className="input max-w-[200px]"
          value={params.sheet_tab ?? ""}
          onChange={(e) =>
            setParams((p) => ({ ...p, sheet_tab: e.target.value || undefined, offset: 0 }))
          }
        >
          <option value="">All time</option>
          {orderedTabs.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          className="input max-w-[160px]"
          value={params.email_status ?? ""}
          onChange={(e) =>
            setParams((p) => ({ ...p, email_status: e.target.value || undefined, offset: 0 }))
          }
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => syncM.mutate()}
          disabled={syncM.isPending}
          className="btn-outline"
          title="Pull latest rows from Google Sheet"
        >
          {syncM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Sync from Sheet
        </button>
      </div>

      <div className="mb-2 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
        <span>
          {isLoading
            ? "Loading…"
            : `Showing ${formatNumber(showingFrom)}–${formatNumber(showingTo)} of ${formatNumber(data?.total ?? 0)}`}
          {isFetching && !isLoading ? " · refreshing…" : ""}
        </span>
      </div>

      <PropertiesTable
        items={items}
        isLoading={isLoading}
        isFetching={isFetching}
        emptyMessage={
          <>
            No properties match the filters. Click <span className="font-medium">Sync from Sheet</span> to import.
          </>
        }
        sort={params.sort}
        order={params.order}
        onSort={onSort}
        onEmail={(p) => setEmailProperty(p as Property)}
      />

      <div className="card mt-3 flex items-center justify-between px-4 py-3 text-sm">
        <span className="text-[var(--muted-foreground)]">
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-outline"
            disabled={(params.offset ?? 0) <= 0 || isFetching}
            onClick={() =>
              setParams((p) => ({
                ...p,
                offset: Math.max(0, (p.offset ?? 0) - (p.limit ?? PAGE_SIZE)),
              }))
            }
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>
          <button
            type="button"
            className="btn-outline"
            disabled={currentPage >= totalPages || isFetching}
            onClick={() =>
              setParams((p) => ({
                ...p,
                offset: (p.offset ?? 0) + (p.limit ?? PAGE_SIZE),
              }))
            }
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <EmailModal property={emailProperty} open={!!emailProperty} onClose={() => setEmailProperty(null)} />
    </PageContainer>
  );
}
