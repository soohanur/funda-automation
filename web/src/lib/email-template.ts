/**
 * Bid-email template (NL). Builds the subject, a plain-text fallback, and a
 * professional inline-styled HTML body from a property's dynamic values:
 *   companyName    -> agency name
 *   propertyAddress-> address
 *   biddingPrice   -> Bidding Price (asking - 22%), falls back to suggested bid
 *   validityDays   -> bid validity (working days)
 *
 * Inline styles only — email clients (Gmail/Outlook) strip <style>/external CSS.
 */
import type { Property } from "./api/properties";

const SENDER_NAME = "Nationale Vastgoed Combinatie";
const SENDER_PHONE = "085-2082323";

function euro(v: string | null | undefined): string {
  const n = parseInt(String(v ?? "").replace(/[^0-9]/g, ""), 10);
  if (!n) return "—";
  return `€ ${n.toLocaleString("nl-NL")}`;
}

export type BidEmail = { subject: string; text: string; html: string };

export function buildBidEmail(property: Property): BidEmail {
  const company = property.agency_name?.trim() || "team";
  const address = property.address?.trim() || property.url;
  const bidding = euro(property.bidding_price || property.suggested_bid);

  const subject = `Bod op ${address}`;

  const text = [
    `Beste team van ${company},`,
    ``,
    `Naar aanleiding van de verkoop van de woning aan de ${address} brengen wij u hierbij het volgende bod uit.`,
    ``,
    `Voorwaarden`,
    `- Koopsom: ${bidding}`,
    `- Financiering: Geen financieringsvoorbehoud`,
    `- Voorbehoud: Een conveniërend due diligence onderzoek van 3 werkdagen. Dit onderzoek gaat in na bezichtiging.`,
    `- Overdrachtsdatum: Volledig in overleg. Zowel op korte als lange termijn mogelijk.`,
    `- Roerende zaken: Kunnen indien gewenst achterblijven.`,
    `- Geldigheid bod: Tot vijf werkdagen na dagtekening van deze brief.`,
    ``,
    `Wij kopen de woning als professionele partij met direct beschikbare middelen. Daardoor is ons bod niet afhankelijk van een hypotheekaanvraag of andere externe goedkeuringen en kan bij overeenstemming direct worden doorgepakt.`,
    ``,
    `Wij realiseren ons dat iedere extra periode op de markt nieuwe bezichtigingen, onderhandelingen en onzekerheid met zich mee kan brengen. Met dit voorstel bieden wij een concreet aanbod waarbij u direct weet waar u aan toe bent, terwijl u zelf de regie houdt.`,
    ``,
    `Mocht jullie kantoor ander interessant vastgoed in de verkoop hebben of krijgen met potentie? Dan houden wij ons graag aanbevolen. Wij zijn op zoek naar transformatie objecten, verhuurde woningen, ontwikkelgronden, bedrijfspanden, klushuizen, en huizen van verkopers die direct of in stille verkoop wensen te verkopen. Wij kopen direct en met eigen middelen. Geen bestedingslimiet.`,
    ``,
    `Wij zien uw reactie graag tegemoet vóór bovengenoemde datum.`,
    ``,
    `Met vriendelijke groet,`,
    `${SENDER_NAME}`,
    `Telefoon: ${SENDER_PHONE}`,
  ].join("\n");

  const li = (label: string, value: string) =>
    `<li style="margin:0 0 8px 0;line-height:1.5;">
       <strong style="color:#0f172a;">${label}:</strong> ${value}
     </li>`;

  const p = (inner: string) =>
    `<p style="margin:0 0 16px 0;line-height:1.6;color:#334155;">${inner}</p>`;

  const html = `<!doctype html>
<html lang="nl">
<body style="margin:0;padding:0;background:#f1f5f9;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Bod op ${address} — ${bidding}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0"
        style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;
               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
               box-shadow:0 1px 3px rgba(15,23,42,0.08);">
        <!-- header -->
        <tr><td style="background:#0f3a73;padding:22px 32px;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:.2px;">
            ${SENDER_NAME}
          </span>
        </td></tr>
        <!-- body -->
        <tr><td style="padding:32px;">
          ${p(`Beste team van <strong style="color:#0f172a;">${company}</strong>,`)}
          ${p(`Naar aanleiding van de verkoop van de woning aan de <strong style="color:#0f172a;">${address}</strong> brengen wij u hierbij het volgende bod uit.`)}

          <h3 style="margin:24px 0 12px 0;font-size:15px;color:#0f3a73;text-transform:uppercase;letter-spacing:.5px;">Voorwaarden</h3>
          <ul style="margin:0 0 20px 0;padding-left:20px;color:#334155;font-size:15px;">
            ${li("Koopsom", `<span style="color:#0f3a73;font-weight:700;">${bidding}</span>`)}
            ${li("Financiering", "Geen financieringsvoorbehoud")}
            ${li("Voorbehoud", "Een conveniërend due diligence onderzoek van 3 werkdagen. Dit onderzoek gaat in na bezichtiging.")}
            ${li("Overdrachtsdatum", "Volledig in overleg. Zowel op korte als lange termijn mogelijk.")}
            ${li("Roerende zaken", "Kunnen indien gewenst achterblijven.")}
            ${li("Geldigheid bod", "Tot vijf werkdagen na dagtekening van deze brief.")}
          </ul>

          ${p("Wij kopen de woning als professionele partij met direct beschikbare middelen. Daardoor is ons bod niet afhankelijk van een hypotheekaanvraag of andere externe goedkeuringen en kan bij overeenstemming direct worden doorgepakt.")}
          ${p("Wij realiseren ons dat iedere extra periode op de markt nieuwe bezichtigingen, onderhandelingen en onzekerheid met zich mee kan brengen. Met dit voorstel bieden wij een concreet aanbod waarbij u direct weet waar u aan toe bent, terwijl u zelf de regie houdt.")}
          ${p("Mocht jullie kantoor ander interessant vastgoed in de verkoop hebben of krijgen met potentie? Dan houden wij ons graag aanbevolen. Wij zijn op zoek naar transformatie objecten, verhuurde woningen, ontwikkelgronden, bedrijfspanden, klushuizen, en huizen van verkopers die direct of in stille verkoop wensen te verkopen. Wij kopen direct en met eigen middelen. Geen bestedingslimiet.")}
          ${p("Wij zien uw reactie graag tegemoet vóór bovengenoemde datum.")}

          <p style="margin:24px 0 0 0;line-height:1.6;color:#334155;">
            Met vriendelijke groet,<br>
            <strong style="color:#0f172a;">${SENDER_NAME}</strong><br>
            Telefoon: ${SENDER_PHONE}
          </p>
        </td></tr>
        <!-- footer -->
        <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
          <span style="color:#94a3b8;font-size:12px;">
            ${SENDER_NAME} · Telefoon: ${SENDER_PHONE}
          </span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
