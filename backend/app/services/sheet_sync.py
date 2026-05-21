"""
Sheet → DB sync.

Pulls every row from every tab of the canonical Google Sheet and upserts it
into the `properties` table. Idempotent on URL. Scraper code is NOT touched —
it keeps writing to Sheets exactly as before; this is a one-way read mirror.
"""
from __future__ import annotations

import logging
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

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


_DIGITS_RE = re.compile(r"\d+")


def _default_bidding_from_asking(asking_price: Optional[str]) -> Optional[str]:
    """Compute the 25%-off default bidding price from an asking-price
    string. Returns None when asking can't be parsed to a positive int.
    Mirrors the read-time enrichment in properties.py so the value
    persisted in DB matches what the dashboard already displays."""
    if not asking_price:
        return None
    digits = _DIGITS_RE.findall(asking_price)
    if not digits:
        return None
    try:
        asking_int = int("".join(digits))
    except ValueError:
        return None
    if asking_int <= 0:
        return None
    return str(int(round(asking_int * 0.75)))


def _mirror_bidding_to_sheet_safe(url: str, bidding_price: str) -> None:
    """Best-effort write of the bidding price to Sheet col I. Runs in a
    background thread so the sync's HTTP response isn't blocked on
    Google. Failures are logged + swallowed — DB is the source of truth."""
    try:
        from funda.src.modules import SheetsWriter
        writer = SheetsWriter()
        writer.update_bidding_price(url, bidding_price)
    except Exception as e:
        logger.warning(f"Auto-bidding sheet mirror failed for {url}: {e}")


async def sync_properties(db: AsyncSession) -> Dict[str, int]:
    """
    Read all sheet rows and upsert into `properties` table. Returns counts.

    Side effect: for any property where the Sheet's Bidding Price column
    is empty but Asking Price is valid, computes the 25%-off default,
    persists it to DB, AND schedules a background write back to Sheet
    col I so the spreadsheet view also shows the default. Existing
    user-entered values are never overwritten.
    """
    from ..db.models import Property  # local import to dodge circulars

    rows = fetch_sheet_rows()
    inserted = 0
    updated = 0
    bidding_filled = 0
    now = datetime.utcnow()

    # Bulk lookup: get all existing URLs.
    existing_q = await db.execute(select(Property.id, Property.url))
    existing = {url: pid for pid, url in existing_q.all()}

    # Track URL → default bidding to write back to the sheet AFTER the
    # DB commit succeeds. Decouples DB persistence from the slower
    # Google API roundtrip.
    pending_sheet_writes: List[Tuple[str, str]] = []

    for row in rows:
        url = row["url"]
        sheet_tab = row.get("_sheet")
        payload = {k: v for k, v in row.items() if k != "_sheet" and k != "url" and v != ""}
        payload["last_synced_at"] = now
        if sheet_tab:
            payload["sheet_tab"] = sheet_tab

        # Auto-fill bidding price when the sheet leaves it empty but
        # asking is set. Only triggers when the SHEET value is empty —
        # the dict we just built only contains non-empty cells, so the
        # absence of 'bidding_price' here means the sheet cell was blank.
        sheet_bidding_blank = "bidding_price" not in payload
        asking_for_default = payload.get("asking_price")
        default_bid = _default_bidding_from_asking(asking_for_default) if sheet_bidding_blank else None

        if url in existing:
            pid = existing[url]
            obj = await db.get(Property, pid)
            if obj is None:
                continue
            for k, v in payload.items():
                setattr(obj, k, v)
            # Backfill bidding on existing rows whose DB bidding is
            # blank too (mirrors a fresh-state row that was synced
            # before this feature shipped).
            if default_bid and not (obj.bidding_price and obj.bidding_price.strip()):
                obj.bidding_price = default_bid
                pending_sheet_writes.append((url, default_bid))
                bidding_filled += 1
            updated += 1
        else:
            if default_bid:
                payload["bidding_price"] = default_bid
                pending_sheet_writes.append((url, default_bid))
                bidding_filled += 1
            obj = Property(url=url, **payload)
            db.add(obj)
            inserted += 1

    await db.commit()

    # Fire Sheet write-backs in background threads. Each call goes
    # through SheetsWriter's existing 4-attempt backoff so we don't
    # blast Google with a thundering herd; we still pace ourselves at
    # the caller level by spacing the dispatches across a thread pool
    # with limited concurrency.
    if pending_sheet_writes:
        import threading
        import queue
        import time as _time

        q: "queue.Queue[Tuple[str, str]]" = queue.Queue()
        for item in pending_sheet_writes:
            q.put(item)

        WORKER_COUNT = 2  # 2 concurrent writes ~= 30/min, safe under the 60/min cap
        SLEEP_BETWEEN = 1.0  # extra spacing inside each worker

        def worker():
            while True:
                try:
                    url, bid = q.get_nowait()
                except queue.Empty:
                    return
                try:
                    _mirror_bidding_to_sheet_safe(url, bid)
                except Exception as e:
                    logger.warning(f"sheet-write worker error: {e}")
                finally:
                    q.task_done()
                _time.sleep(SLEEP_BETWEEN)

        for _ in range(WORKER_COUNT):
            threading.Thread(target=worker, daemon=True, name="bid-mirror").start()

    return {
        "inserted": inserted,
        "updated": updated,
        "bidding_filled": bidding_filled,
        "total_rows": len(rows),
    }


__all__ = ["fetch_sheet_rows", "sync_properties", "HEADERS"]
