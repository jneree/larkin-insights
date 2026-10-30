// The link-preview image of a shared page: design B (Figma "Oct 30 Link previews (Claude)",
// 3456:2): lime, the one-colour wordmark, the title, the date and who shared it, all in ink.
import { ImageResponse } from "@vercel/og";
import { API, CODE, WORDMARK, WORDMARK_RATIO, previewMeta } from "../preview.js";

export const config = { runtime: "edge" };

/** DM Sans at one weight, only the glyphs needed, from Google Fonts (TrueType). */
async function font(weight, text) {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=DM+Sans:wght@${weight}&text=${encodeURIComponent(text)}`).then(r => r.text());
  const src = /src: url\((.+?)\) format\('(opentype|truetype)'\)/.exec(css)?.[1];
  if (!src) throw new Error("font");
  return fetch(src).then(r => r.arrayBuffer());
}

const h = (type, style, children) => ({ type, props: { style, children } });

export default async function handler(request) {
  const code = new URL(request.url).searchParams.get("code") ?? "";
  let meta = null;
  if (CODE.test(code)) {
    try {
      const response = await fetch(`${API}?code=${code}`);
      if (response.ok) meta = previewMeta((await response.json())?.notes);
    } catch { /* the generic card */ }
  }
  const title = meta?.title ?? "Notes from a conversation.";
  const lines = [meta?.date, meta?.with].filter(Boolean);
  const text = title + lines.join("") + "Larkin";
  const [semibold, medium] = await Promise.all([font(600, text), font(500, text)]);
  const ink = "#151515";
  const logoHeight = 56;
  return new ImageResponse(
    h("div", { width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between",
      background: "#D2ED28", padding: "68px 80px 64px", fontFamily: "DM Sans" }, [
      { type: "img", props: { src: WORDMARK, width: Math.round(logoHeight * WORDMARK_RATIO), height: logoHeight } },
      h("div", { display: "flex", fontSize: 76, lineHeight: 1.1, fontWeight: 600, letterSpacing: -2, color: ink, maxWidth: 900,
        marginTop: -20 }, title),
      h("div", { display: "flex", flexDirection: "column", fontSize: 34, lineHeight: 1.3, fontWeight: 500, color: "rgba(21,21,21,0.7)" },
        lines.map(line => h("div", { display: "flex" }, line))),
    ]),
    { width: 1200, height: 630, fonts: [{ name: "DM Sans", data: semibold, weight: 600 }, { name: "DM Sans", data: medium, weight: 500 }],
      headers: { "cache-control": "public, max-age=0, s-maxage=300" } },
  );
}
