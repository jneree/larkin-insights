// The page for a /n/<code> link, with that conversation's own link preview (see preview.js).
import { API, CODE, withPreview, previewMeta } from "../preview.js";

export const config = { runtime: "edge" };

export default async function handler(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") ?? "";
  const page = await fetch(new URL("/index.html", url)).then(response => response.text());
  let meta = null;
  if (CODE.test(code)) {
    try {
      const response = await fetch(`${API}?code=${code}`, { headers: { accept: "application/json" } });
      if (response.ok) meta = previewMeta((await response.json())?.notes);
    } catch { /* the generic preview */ }
  }
  return new Response(withPreview(page, meta, code), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // A changed or stopped link shows within five minutes.
      "cache-control": "public, max-age=0, s-maxage=300",
      "referrer-policy": "no-referrer",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
