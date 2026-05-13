"""
Sheet → DB sync.

Pulls every row from every tab of the canonical Google Sheet and upserts it
into the `properties` table. Idempotent on URL. Scraper code is NOT touched —
it keeps writing to Sheets exactly as before; this is a one-way read mirror.
"""
from __future__ import annotations

import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

import gspread
from google.oauth2.service_account import Credentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# Make funda package importable.
_PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

# These come from the scraper's own config so we always read the same sheet.
from funda.src.config import config  # noqa: E402
from funda.src.modules.sheets_writer import HEADERS  # noqa: E402

_SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

# Map sheet header → Property column. Trailing whitespace / unicode handled
# by .strip() at lookup time. Kept explicit to survive future header renames.
_HEADER_TO_COL: Dict[str, str] = {
    "Scrape Date": "scrape_date",
    "Property URL": "url",
    "Address": "address",
    "Listed Since": "listed_since",
    "Days on Market": "days_on_market",
    "Asking Price (€)": "asking_price",
    "WOZ Value (€)": "woz_value",
    "Suggested Bid (€)": "suggested_bid",
    "Bidding Price": "bidding_price",
    "Price / m² (€)": "price_per_m2",
    "Living Area (m²)": "living_area",
    "Plot Area (m²)": "plot_area",
    "Rooms": "rooms",
    "Bedrooms": "bedrooms",
    "Construction Year": "construction_year",
    "Property Type": "property_type",
    "Energy Label": "energy_label",
    "Heating": "heating",
    "Insulation": "insulation",
    "Maintenance Inside": "maintenance_inside",
    "Maintenance Outside": "maintenance_outside",
    "Garden": "garden",
    "Garden Orientation": "garden_orientation",
    "Parking": "parking",
    "VVE (€/month)": "vve",
    "Erfpacht": "erfpacht",
    "Acceptance": "acceptance",
    "Description": "description",
    "Images": "images",
    "Agency Name": "agency_name",
    "Agency Phone": "agency_phone",
    "Agency Email": "agency_email",
    "Agency Website": "agency_website",
}


def _open_spreadsheet() -> gspread.Spreadsheet:
    creds = Credentials.from_service_account_file(
        config.GOOGLE_SHEETS_CREDENTIALS, scopes=_SCOPES
    )
    return gspread.authorize(creds).open_by_key(config.GOOGLE_SHEETS_SPREADSHEET_ID)


def fetch_sheet_rows() -> List[Dict[str, Any]]:
    """Pull every data row from every worksheet and return as dicts."""
    ss = _open_spreadsheet()
    out: List[Dict[str, Any]] = []
    for ws in ss.worksheets():
        try:
            values: List[List[str]] = ws.get_all_values()
        except Exception as e:
            logger.warning("Failed to read worksheet %s: %s", ws.title, e)
            continue
        if not values:
            continue
        header_row = [h.strip() for h in values[0]]
        for raw in values[1:]:
            if not any(c.strip() for c in raw):
                continue  # blank
            row = {
                _HEADER_TO_COL.get(header_row[i], None): (raw[i].strip() if i < len(raw) else "")
                for i in range(len(header_row))
            }
            row.pop(None, None)
            url = row.get("url") or ""
            if not url:
                continue
            row["_sheet"] = ws.title
            out.append(row)
    return out


async def sync_properties(db: AsyncSession) -> Dict[str, int]:
    """
    Read all sheet rows and upsert into `properties` table. Returns counts.
    """
    from ..db.models import Property  # local import to dodge circulars

    rows = fetch_sheet_rows()
    inserted = 0
    updated = 0
    now = datetime.utcnow()

    # Bulk lookup: get all existing URLs.
    existing_q = await db.execute(select(Property.id, Property.url))
    existing = {url: pid for pid, url in existing_q.all()}

    for row in rows:
        url = row["url"]
        sheet_tab = row.get("_sheet")
        payload = {k: v for k, v in row.items() if k != "_sheet" and k != "url" and v != ""}
        payload["last_synced_at"] = now
        if sheet_tab:
            payload["sheet_tab"] = sheet_tab
        if url in existing:
            pid = existing[url]
            # Update — only non-empty fields, never overwrite with blank.
            obj = await db.get(Property, pid)
            if obj is None:
                continue
            for k, v in payload.items():
                setattr(obj, k, v)
            updated += 1
        else:
            obj = Property(url=url, **payload)
            db.add(obj)
            inserted += 1

    await db.commit()
    return {"inserted": inserted, "updated": updated, "total_rows": len(rows)}


__all__ = ["fetch_sheet_rows", "sync_properties", "HEADERS"]
