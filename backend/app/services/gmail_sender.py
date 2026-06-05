"""
Gmail send service. Reads OAuth credentials from gmail_credentials,
auto-refreshes the access token when expired, and sends a MIME message
via the Gmail API.

Synchronous (gmail API client is sync). Always called via
asyncio.to_thread from the async caller so a hung Google request can
never freeze the event loop.
"""
from __future__ import annotations

import base64
import logging
from datetime import datetime
from email.message import EmailMessage as _MimeMessage
from typing import Optional

from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from ..db.models import GmailCredential

logger = logging.getLogger(__name__)


class GmailSendError(Exception):
    pass


def _credentials_from_row(row: GmailCredential) -> Credentials:
    """Build a google-auth Credentials object from a stored row."""
    return Credentials(
        token=row.access_token,
        refresh_token=row.refresh_token,
        token_uri=row.token_uri or "https://oauth2.googleapis.com/token",
        client_id=row.client_id,
        client_secret=row.client_secret,
        scopes=(row.scopes or "").split(),
    )


def _refresh_if_needed(creds: Credentials) -> bool:
    """Refresh the access token if expired. Returns True if refreshed."""
    if creds.expired and creds.refresh_token:
        creds.refresh(GoogleRequest())
        return True
    return False


def send_via_gmail(
    *,
    row: GmailCredential,
    to: str,
    subject: str,
    body_text: str,
    body_html: Optional[str] = None,
    cc: Optional[str] = None,
    attachment_path: Optional[str] = None,
) -> dict:
    """Send a single message via Gmail API.

    Returns Gmail's response dict (contains 'id', 'threadId') on
    success; raises GmailSendError on any failure.

    Caller is responsible for invoking this in a thread (e.g.
    asyncio.to_thread) since googleapiclient is synchronous.
    """
    creds = _credentials_from_row(row)
    refreshed = False
    try:
        refreshed = _refresh_if_needed(creds)
    except Exception as e:
        raise GmailSendError(f"refresh failed: {e}") from e

    # Build MIME message.
    msg = _MimeMessage()
    msg["From"] = row.email_address
    msg["To"] = to
    if cc:
        msg["Cc"] = cc
    msg["Subject"] = subject
    if body_html:
        msg.set_content(body_text or "")
        msg.add_alternative(body_html, subtype="html")
    else:
        msg.set_content(body_text or "")

    if attachment_path:
        try:
            with open(attachment_path, "rb") as f:
                data = f.read()
            # Best-effort MIME type — Gmail API accepts octet-stream too
            import mimetypes
            mtype, _ = mimetypes.guess_type(attachment_path)
            maintype, subtype = (mtype or "application/octet-stream").split("/", 1)
            import os
            msg.add_attachment(
                data,
                maintype=maintype,
                subtype=subtype,
                filename=os.path.basename(attachment_path),
            )
        except Exception as e:
            logger.warning(f"Attachment skipped ({attachment_path}): {e}")

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode("ascii")

    service = build("gmail", "v1", credentials=creds, cache_discovery=False)
    try:
        resp = service.users().messages().send(
            userId="me",
            body={"raw": raw},
        ).execute()
    except Exception as e:
        raise GmailSendError(f"Gmail API send failed: {e}") from e

    # Persist refreshed token + new expiry back to caller's row (caller
    # owns the SQLAlchemy session; we just mutate the object).
    if refreshed:
        row.access_token = creds.token
        row.token_expiry = creds.expiry

    return resp


__all__ = ["send_via_gmail", "GmailSendError"]
