"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  Save,
  Globe,
  MapPin,
  Calendar,
  Euro,
  Zap,
  Home,
  Ruler,
  Bed,
  Car,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { propertiesApi, type Property } from "@/lib/api/properties";
import { PageContainer } from "@/components/page-container";
import { EmailModal } from "@/components/email-modal";
import { formatDate } from "@/lib/utils";

const EMAIL_STATUSES = [
  { value: "not_sent", label: "Not sent" },
  { value: "queued", label: "Queued" },
  { value: "sent", label: "Sent" },
  { value: "failed", label: "Failed" },
  { value: "replied", label: "Replied" },
];

export default function PropertyProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const numericId = Number(id);
  const qc = useQueryClient();
  const [showEmail, setShowEmail] = useState(false);
  const [notes, setNotes] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const { data: prop, isLoading, error } = useQuery({
    queryKey: ["properties", "detail", numericId],
    queryFn: () => propertiesApi.get(numericId),
    enabled: Number.isFinite(numericId),
  });

  const saveM = useMutation({
    mutationFn: (patch: { notes?: string; email_status?: string }) =>
      propertiesApi.update(numericId, patch),
    onSuccess: (updated) => {
      qc.setQueryData(["properties", "detail", numericId], updated);
      qc.invalidateQueries({ queryKey: ["properties", "list"] });
      toast.success("Saved");
    },
    onError: () => toast.error("Save failed"),
  });

  if (isLoading) {
    return (
      <PageContainer>
        <div className="card grid place-items-center p-10">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-brand-600)]" />
        </div>
      </PageContainer>
    );
  }
  if (error || !prop) {
    return (
      <PageContainer>
        <div className="card p-6">
          <p className="text-sm text-rose-700">Property not found.</p>
          <Link href="/data" className="btn-outline mt-4">
            <ArrowLeft className="h-4 w-4" />
            Back to data
          </Link>
        </div>
      </PageContainer>
    );
  }

  const effectiveNotes = notes ?? prop.notes ?? "";
  const effectiveStatus = status ?? prop.email_status ?? "not_sent";

  return (
    <PageContainer>
      {/* Header card */}
      <div className="card flex flex-wrap items-start justify-between gap-4 p-6">
        <div className="min-w-0">
          <Link href="/data" className="inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Global Data
          </Link>
          <h2 className="mt-2 truncate text-xl font-semibold">{prop.address ?? "Unnamed property"}</h2>
          <a
            href={prop.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--color-brand-600)] hover:underline"
          >
            View on Funda
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button type="button" className="btn-primary" onClick={() => setShowEmail(true)}>
            <Mail className="h-4 w-4" />
            Send email
          </button>
          <select
            className="input max-w-[200px]"
            value={effectiveStatus}
            onChange={(e) => {
              const v = e.target.value;
              setStatus(v);
              saveM.mutate({ email_status: v });
            }}
          >
            {EMAIL_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Price/value */}
          <Section title="Pricing">
            <KV icon={<Euro className="h-4 w-4" />} k="Asking price" v={prop.asking_price} />
            <KV icon={<Euro className="h-4 w-4" />} k="WOZ value" v={prop.woz_value} />
            <KV icon={<Euro className="h-4 w-4" />} k="Suggested bid" v={prop.suggested_bid} highlight />
            <KV icon={<Euro className="h-4 w-4" />} k="Bidding price" v={prop.bidding_price} />
            <KV icon={<Euro className="h-4 w-4" />} k="Price / m²" v={prop.price_per_m2} />
          </Section>

          <Section title="Property">
            <KV icon={<Home className="h-4 w-4" />} k="Type" v={prop.property_type} />
            <KV icon={<Zap className="h-4 w-4" />} k="Energy label" v={prop.energy_label} />
            <KV icon={<Ruler className="h-4 w-4" />} k="Living area" v={prop.living_area} />
            <KV k="Plot area" v={prop.plot_area} />
            <KV icon={<Bed className="h-4 w-4" />} k="Rooms / Bedrooms" v={`${prop.rooms ?? "—"} / ${prop.bedrooms ?? "—"}`} />
            <KV k="Construction year" v={prop.construction_year} />
            <KV icon={<Car className="h-4 w-4" />} k="Parking" v={prop.parking} />
          </Section>

          <Section title="Condition & Features">
            <KV k="Heating" v={prop.heating} />
            <KV k="Insulation" v={prop.insulation} />
            <KV k="Maintenance (inside)" v={prop.maintenance_inside} />
            <KV k="Maintenance (outside)" v={prop.maintenance_outside} />
            <KV k="Garden" v={prop.garden} />
            <KV k="Garden orientation" v={prop.garden_orientation} />
            <KV k="VVE / month" v={prop.vve} />
            <KV k="Erfpacht" v={prop.erfpacht} />
            <KV k="Acceptance" v={prop.acceptance} />
          </Section>

          {prop.description && (
            <Section title="Description">
              <p className="whitespace-pre-wrap text-sm">{prop.description}</p>
            </Section>
          )}
        </div>

        {/* Right: contact + notes + meta */}
        <div className="space-y-6 lg:col-span-1">
          <Section title="Agency">
            <KV icon={<Building2 className="h-4 w-4" />} k="Name" v={prop.agency_name} />
            <KV icon={<Phone className="h-4 w-4" />} k="Phone" v={prop.agency_phone} />
            <KV
              icon={<Mail className="h-4 w-4" />}
              k="Email"
              v={
                prop.agency_email ? (
                  <a className="text-[var(--color-brand-600)] hover:underline" href={`mailto:${prop.agency_email}`}>
                    {prop.agency_email}
                  </a>
                ) : null
              }
            />
            <KV
              icon={<Globe className="h-4 w-4" />}
              k="Website"
              v={
                prop.agency_website ? (
                  <a className="text-[var(--color-brand-600)] hover:underline" href={prop.agency_website} target="_blank" rel="noopener noreferrer">
                    {prop.agency_website}
                  </a>
                ) : null
              }
            />
          </Section>

          <Section title="Listing meta">
            <KV icon={<Calendar className="h-4 w-4" />} k="Scrape date" v={prop.scrape_date} />
            <KV k="Listed since" v={prop.listed_since} />
            <KV k="Days on market" v={prop.days_on_market} />
            <KV icon={<MapPin className="h-4 w-4" />} k="Address" v={prop.address} />
            <KV k="Last synced" v={formatDate(prop.last_synced_at)} />
          </Section>

          <Section title="Notes">
            <textarea
              className="input min-h-[140px] resize-y"
              value={effectiveNotes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes about this property…"
            />
            <button
              type="button"
              onClick={() => saveM.mutate({ notes: effectiveNotes })}
              className="btn-outline mt-3"
              disabled={saveM.isPending}
            >
              {saveM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save notes
            </button>
          </Section>
        </div>
      </div>

      <EmailModal property={prop as Property} open={showEmail} onClose={() => setShowEmail(false)} />
    </PageContainer>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function KV({
  k,
  v,
  icon,
  highlight,
}: {
  k: string;
  v: React.ReactNode;
  icon?: React.ReactNode;
  highlight?: boolean;
}) {
  const empty = v === null || v === undefined || v === "";
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
        {icon}
        <span>{k}</span>
      </div>
      <div className={highlight ? "font-semibold text-[var(--color-brand-700)]" : "font-medium"}>
        {empty ? <span className="text-[var(--muted-foreground)]">—</span> : v}
      </div>
    </div>
  );
}
