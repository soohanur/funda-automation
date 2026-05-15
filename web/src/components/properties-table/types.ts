/**
 * Public types for the PropertiesTable module. Defines the row shape
 * the table consumes (a superset of API Property + LatestProperty so
 * Dashboard + Global Data can share the same component) and the
 * column metadata used by header + Row.
 */
import type { Property } from "@/lib/api/properties";

/**
 * Row shape consumed by the table. Wider than Property so other
 * callers (e.g. Dashboard's LatestProperty) plug in without coercion.
 * All sheet-derived fields are optional strings.
 */
export type PropertiesTableRow = {
  id: number;
  url: string;
  scrape_date?: string | null;
  address?: string | null;
  listed_since?: string | null;
  days_on_market?: string | null;
  asking_price?: string | null;
  woz_value?: string | null;
  suggested_bid?: string | null;
  bidding_price?: string | null;
  price_per_m2?: string | null;
  living_area?: string | null;
  plot_area?: string | null;
  rooms?: string | null;
  bedrooms?: string | null;
  construction_year?: string | null;
  property_type?: string | null;
  energy_label?: string | null;
  heating?: string | null;
  insulation?: string | null;
  maintenance_inside?: string | null;
  maintenance_outside?: string | null;
  garden?: string | null;
  garden_orientation?: string | null;
  parking?: string | null;
  vve?: string | null;
  erfpacht?: string | null;
  acceptance?: string | null;
  description?: string | null;
  images?: string | null;
  agency_name?: string | null;
  agency_phone?: string | null;
  agency_email?: string | null;
  agency_website?: string | null;
  sheet_tab?: string | null;
  email_status?: string | null;
};

export type ColumnDef = {
  key: keyof PropertiesTableRow;
  label: string;
  sortable?: boolean;
  width: string; // CSS length used for grid-template-columns
};

// Re-export the canonical Property type so callers can import both
// from a single module entry point.
export type { Property };
