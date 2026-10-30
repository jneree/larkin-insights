// Link previews for shared notes (Julien, 30 October 2026: like Granola's). A link of the form
// /n/<code> reaches the preview server (api/n.js), which answers with the page plus this
// conversation's title, a short subtitle and an image (api/og.js): the lime card, design B.
// The summary never goes into a preview: only the title, the date and who shared it.

export const API = "https://jvdtgnwexspohnsbxpbl.supabase.co/functions/v1/capture-v1-shared-notes";
export const CODE = /^[A-Za-z0-9_-]{22}$/;
export const SITE = "https://insights.getlarkin.com";
/** The black wordmark from the Larkin design system (the logo on a lime fill is one colour). */
export const WORDMARK = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjE4OS4wMCAzMzMuMDAgNDMxLjgwIDEyOS4yMCIgd2lkdGg9IjQzMS44IiBoZWlnaHQ9IjEyOS4yIj48dGl0bGU+TGFya2luIHdvcmRtYXJrLCBibGFjazwvdGl0bGU+PHBhdGggZD0iTTE4OSA0NjBWMzM2SDIxMi45MVY0NjBaTTI1MC42OSA0NjIuMTNRMjQwLjI0IDQ2Mi4xMyAyMzMuNDIgNDU4LjU4UTIyNi42IDQ1NS4wNCAyMjMuNDEgNDQ5LjAyUTIyMC4yMiA0NDIuOTkgMjIwLjIyIDQzNS43M1EyMjAuMjIgNDI3LjU4IDIyNC4zOCA0MjEuMzhRMjI4LjU1IDQxNS4xOCAyMzcuMDUgNDExLjczUTI0NS41NSA0MDguMjcgMjU4LjQ4IDQwOC4yN0gyODAuNjNRMjgwLjYzIDQwMS43MiAyNzguNzcgMzk3LjQ3UTI3Ni45MSAzOTMuMjIgMjczLjEgMzkxLjA5UTI2OS4yOSAzODguOTcgMjYzLjQ0IDM4OC45N1EyNTYuNTQgMzg4Ljk3IDI1MS42NiAzOTIuMDdRMjQ2Ljc5IDM5NS4xNyAyNDUuNTUgNDAxLjcySDIyMi4zNVEyMjMuNDEgMzkxLjk4IDIyOC44MSAzODQuODlRMjM0LjIyIDM3Ny44MSAyNDMuMTYgMzczLjkxUTI1Mi4xMSAzNzAuMDEgMjYzLjQ0IDM3MC4wMVEyNzYuMiAzNzAuMDEgMjg1LjQxIDM3NC4xN1EyOTQuNjIgMzc4LjM0IDI5OS41OCAzODYuNFEzMDQuNTQgMzk0LjQ2IDMwNC41NCA0MDUuOTdWNDYwSDI4NC43TDI4Mi4yMiA0NDYuMzZIMjgxLjUxUTI3OC42OCA0NTAuMjYgMjc1LjQgNDUzLjI3UTI3Mi4xMiA0NTYuMjggMjY4LjIzIDQ1OC4yM1EyNjQuMzMgNDYwLjE4IDI1OS45IDQ2MS4xNVEyNTUuNDcgNDYyLjEzIDI1MC42OSA0NjIuMTNaTTI1OC40OCA0NDMuN1EyNjMuNDQgNDQzLjcgMjY3LjA4IDQ0Mi4wMlEyNzAuNzEgNDQwLjM0IDI3My4zNiA0MzcuNVEyNzYuMDIgNDM0LjY3IDI3Ny41MyA0MzAuODZRMjc5LjAzIDQyNy4wNSAyNzkuNTYgNDIyLjk4SDI2MS4xNFEyNTUuNjUgNDIyLjk4IDI1Mi4yIDQyNC4zMVEyNDguNzQgNDI1LjYzIDI0Ny4xNSA0MjguMDNRMjQ1LjU1IDQzMC40MiAyNDUuNTUgNDMzLjYxUTI0NS41NSA0MzYuNzkgMjQ3LjE1IDQzOS4xUTI0OC43NCA0NDEuNCAyNTEuNzUgNDQyLjU1UTI1NC43NiA0NDMuNyAyNTguNDggNDQzLjdaTTMxMS44NSA0NjBWMzcyLjE0SDMzMi4yMkwzMzQuMzUgMzkxLjQ1SDMzNS4wNVEzMzguOTUgMzgyLjA2IDM0My41NiAzNzcuNTRRMzQ4LjE2IDM3My4wMiAzNTQuMSAzNzEuNTJRMzYwLjAzIDM3MC4wMSAzNjcuNDcgMzcwLjAxVjM5NS4zNEgzNjAuOTJRMzU0Ljg5IDM5NS4zNCAzNTAuMiAzOTYuNjdRMzQ1LjUxIDM5OCAzNDIuMzIgNDAwLjkyUTMzOS4xMyA0MDMuODUgMzM3LjQ1IDQwOC42M1EzMzUuNzYgNDEzLjQxIDMzNS43NiA0MjAuMTRWNDYwWk00MzEuMTUgNDYwIDM5Mi43MSA0MTEuNjQgNDI2LjU1IDM3Mi4xNEg0NTQuODlMNDExLjE0IDQyMS41Nkw0MTAuOTYgNDAyLjYxTDQ2MC43NCA0NjBaTTM3Mi4zNCA0NjBWMzM2SDM5Ni4yNlY0NjBaTTQ2NS4xMiA0NjBWMzcyLjE0SDQ4OS4wNFY0NjBaTTQ5Ni44MyA0NjBWMzcyLjE0SDUxNy4yTDUxOS4zMyAzODYuNDlINTIwLjA0UTUyNC4yOSAzNzguNjkgNTMxLjU1IDM3NC4zNVE1MzguODEgMzcwLjAxIDU0OS44IDM3MC4wMVE1NjAuNzggMzcwLjAxIDU2OC40IDM3NC43MVE1NzYuMDEgMzc5LjQgNTgwIDM4OC40M1E1ODMuOTggMzk3LjQ3IDU4My45OCA0MTAuNzVWNDYwSDU2MC4wN1Y0MTIuODhRNTYwLjA3IDQwMS45IDU1NS42NCAzOTYuMDVRNTUxLjIxIDM5MC4yMSA1NDEuNjUgMzkwLjIxUTUzNS42MiAzOTAuMjEgNTMwLjg0IDM5My4xM1E1MjYuMDYgMzk2LjA1IDUyMy40IDQwMS40NVE1MjAuNzQgNDA2Ljg2IDUyMC43NCA0MTQuNjVWNDYwWiIgZmlsbD0iIzE1MTUxNSI+PC9wYXRoPjxjaXJjbGUgY3g9IjQ3Ny4wOCIgY3k9IjM0OC4wIiByPSIxNS4wIiBmaWxsPSIjMTUxNTE1Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSI2MDUuODAiIGN5PSI0NDYuNTAiIHI9IjE1LjAiIGZpbGw9IiMxNTE1MTUiPjwvY2lyY2xlPjwvc3ZnPg==";
export const WORDMARK_RATIO = 431.8 / 129.2;

/** The share code in "/n/<code>", or null. */
export function codeFromPath(path) {
  const match = /^\/n\/([A-Za-z0-9_-]{22})\/?$/.exec(path || "");
  return match ? match[1] : null;
}

const str = value => (typeof value === "string" && value.trim() ? value.trim() : null);

/** "Tue, October 27, 2026" from the page's "Oct 27, 2026 · 3:35 PM · 30 min"; null if unreadable. */
export function cardDate(when) {
  const first = str(when)?.split(" · ")[0];
  const date = first ? new Date(`${first} 12:00 UTC`) : null;
  if (!date || Number.isNaN(date.getTime())) return first ?? null;
  return date.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** The preview's words for one shared page (notes or a report); generic when there is none. */
export function previewMeta(notes) {
  const title = str(notes?.title);
  if (!title) return null;
  const by = str(notes.sharedBy);
  const day = str(notes.when)?.split(" · ")[0] ?? null;
  const report = notes.kind === "report";
  const description = report ? `${by ? `${by}’s` : "A"} month with Larkin` : [by ? `Notes shared by ${by}` : "Notes shared from Larkin", day].filter(Boolean).join(" · ");
  return { title, description, date: report ? str(notes.month) : cardDate(notes.when), with: by ? `With ${by}` : null };
}

function escape(text) {
  return String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/** index.html with this link's title, subtitle, image and address in place of the generic ones. */
export function withPreview(html, meta, code) {
  if (!meta || !CODE.test(code || "")) return html;
  const set = (attr, name, value) => {
    const re = new RegExp(`(<meta ${attr}="${name}" content=")[^"]*(">)`);
    html = html.replace(re, (_, a, b) => a + escape(value) + b);
  };
  set("property", "og:title", meta.title);
  set("property", "og:description", meta.description);
  set("name", "description", meta.description);
  set("property", "og:image", `${SITE}/og/${code}`);
  set("property", "og:image:alt", `${meta.title}. ${meta.description}.`);
  set("property", "og:url", `${SITE}/n/${code}`);
  return html.replace(/<title>[^<]*<\/title>/, `<title>${escape(meta.title)} · Larkin</title>`);
}
