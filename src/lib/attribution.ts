// Where the visitor came from (UTM tags from Yandex Direct, external referrer).
// Captured on the landing page and kept for the session, so a lead sent from another page still knows its ad.
const KEY = "hd_attr";
const UTM = /^(utm_\w+|yclid|gclid)$/;

type Attribution = { utm: Record<string, string>; ref: string };

export function captureAttribution() {
  try {
    const utm: Record<string, string> = {};
    new URLSearchParams(window.location.search).forEach((v, k) => {
      if (UTM.test(k)) utm[k] = v;
    });
    const ref = document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : "";
    const prev = readAttribution();
    // New ad click overrides; otherwise keep the first source of the session.
    if (Object.keys(utm).length || (!prev.ref && ref)) {
      sessionStorage.setItem(KEY, JSON.stringify({ utm: Object.keys(utm).length ? utm : prev.utm, ref: ref || prev.ref }));
    }
  } catch {
    // storage blocked (private mode) — the lead just goes without the source
  }
}

export function readAttribution(): Attribution {
  try {
    const a = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (a && typeof a === "object") return { utm: a.utm || {}, ref: a.ref || "" };
  } catch {}
  return { utm: {}, ref: "" };
}
