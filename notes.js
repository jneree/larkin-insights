// Shared conversation notes. The link carries the share code after "#", so it never
// reaches this host or a link preview service; the page asks Larkin's server for the
// sections the person chose and writes them as text (never as HTML).
"use strict";

const API = "https://jvdtgnwexspohnsbxpbl.supabase.co/functions/v1/capture-v1-shared-notes";
const CODE = /^[A-Za-z0-9_-]{22}$/;
const page = document.getElementById("page");

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function texts(value) {
  return Array.isArray(value) ? value.filter(item => typeof item === "string" && item.trim()) : [];
}
// Insight points: plain text (older links) or { text, why, next, lead }.
function points(value) {
  if (!Array.isArray(value)) return [];
  return value.map(item => typeof item === "string" ? { text: item } : item)
    .filter(item => item && typeof item.text === "string" && item.text.trim())
    .map(item => ({ text: item.text, lead: str(item.lead) }));
}

// The app's conversation page (28 October 2026): white tiles, each opening with a tag. Grey, green
// for what worked and red for what to work on with a small rising or falling line, lime for what
// to do next.
const SVG = "http://www.w3.org/2000/svg";
function svg(tag, attributes) {
  const node = document.createElementNS(SVG, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}
function trend(rising) {
  const icon = svg("svg", { viewBox: "0 0 12 8", width: "12", height: "8", "aria-hidden": "true", class: "trend" });
  const y = value => rising ? value : 8 - value;
  icon.append(svg("path", { d: `M0 ${y(8)} L4 ${y(4)} L7 ${y(6.5)} L12 ${y(0)} M8 ${y(0)} L12 ${y(0)} L12 ${y(4)}` }));
  return icon;
}
function tag(text, tone = "grey") {
  const node = el("h2", `tag ${tone}`);
  node.append(el("span", null, text));
  if (tone === "worked" || tone === "to-work-on") node.append(trend(tone === "worked"));
  return node;
}
function tagged(label, ...children) {
  const node = el("section", "tile");
  node.append(label, ...children);
  return node;
}
/// The last two words held together: never one word alone on a last line.
function hold(text) {
  const at = text.lastIndexOf(" ");
  return at > 0 ? `${text.slice(0, at)}\u00a0${text.slice(at + 1)}` : text;
}
/// A verdict at 16/500 in ink, then what happened in the one grey.
function verdict(lead, rest) {
  const node = el("p", "verdict");
  node.append(el("strong", null, rest ? lead : hold(lead)));
  if (rest) node.append(document.createTextNode(" "), el("span", "soft", hold(rest)));
  return node;
}
/// "Curious and open." and the rest of the paragraph.
function leadOf(text) {
  const match = /[.!?…]\s/.exec(text);
  if (!match) return [text, null];
  const rest = text.slice(match.index + 2).trim();
  return [text.slice(0, match.index + 1), rest || null];
}
function point(item) {
  if (!item.lead) return el("p", "verdict", item.text);
  return verdict(/[.!?…]$/.test(item.lead) ? item.lead : `${item.lead}.`, item.text);
}
/// The notes' bullets, each point with its sub-points under it (Detailed notes).
function bullets(entries, details = []) {
  const ul = el("ul", "bullets");
  entries.forEach((entry, index) => {
    const li = el("li", null, entry);
    const sub = texts(details[index]);
    if (sub.length) {
      const inner = el("ul", "bullets sub");
      for (const text of sub) inner.append(el("li", null, text));
      li.append(inner);
    }
    ul.append(li);
  });
  return ul;
}
function panel(children) {
  const node = el("div", "panel");
  node.append(...children);
  return node;
}

// The notes pill names the template, with its icon (the app's, as masks so they take the pill's ink).
const TEMPLATE_ICONS = {
  "short notes": "tothepoint", "notes": "notes", "detailed notes": "notes", "1:1": "oneonone", "team meeting": "teammeeting",
  "standup": "standup", "brainstorm": "brainstorm", "client call": "clientcall", "sales discovery": "salesdiscovery",
  "interview": "interview", "lecture": "lecture", "talk": "talk", "catch-up": "catchup",
};
function pill(text, icon) {
  const button = el("button", "tab");
  button.type = "button";
  button.setAttribute("role", "tab");
  if (icon) {
    const mark = el("span", `template-icon icon-${icon}`);
    mark.setAttribute("aria-hidden", "true");
    button.append(mark);
  }
  button.append(el("span", null, text));
  return button;
}

/// How they talked: the sentence, then each scale with this conversation's dot and their usual's
/// ring. A record lights its scale: a lime line from the usual, a lime dot and "Highest ever".
function talkedTile(talked, name) {
  const scales = (talked && Array.isArray(talked.scales) ? talked.scales : [])
    .filter(s => str(s?.left) && str(s?.right) && typeof s.position === "number");
  if (!scales.length) return null;
  const clamp = value => Math.min(1, Math.max(0, value));
  const node = tagged(tag(name ? `How ${name} talked` : "How they talked"));
  if (str(talked.sentence)) node.append(el("p", "verdict lead", talked.sentence));
  const list = el("div", "scales");
  const usualSeen = scales.some(s => typeof s.usual === "number");
  for (const scale of scales) {
    const row = el("div", "scale");
    const position = clamp(scale.position), usual = typeof scale.usual === "number" ? clamp(scale.usual) : null;
    const record = scale.record === "left" || scale.record === "right" ? scale.record : null;
    const leaned = record ?? (scale.leaned === "left" || scale.leaned === "right" ? scale.leaned : null);
    const ends = el("div", "ends");
    for (const side of ["left", "right"]) {
      const end = el("span", leaned === side ? "end leaned" : "end");
      const label = el("span", null, side === "left" ? scale.left : scale.right);
      const chip = record === side ? el("span", "highest", "Highest ever") : null;
      if (chip && side === "right") end.append(chip);
      end.append(label);
      if (chip && side === "left") end.append(chip);
      ends.append(end);
    }
    const track = el("div", "track");
    track.style.setProperty("--p", String(position));
    if (usual !== null) {
      track.style.setProperty("--u", String(usual));
      if (record) track.append(el("span", "lit"));
      track.append(el("span", "ring"));
    }
    track.append(el("span", record ? "dot highest-dot" : "dot"));
    track.setAttribute("aria-hidden", "true");
    let said = `${scale.left} to ${scale.right}: ${Math.round(position * 100)}% towards ${scale.right.toLowerCase()}`;
    if (usual !== null) said += `, usually ${Math.round(usual * 100)}%`;
    if (record) said += ". Highest ever.";
    row.setAttribute("role", "img");
    row.setAttribute("aria-label", said);
    ends.setAttribute("aria-hidden", "true");
    row.append(ends, track);
    list.append(row);
  }
  node.append(list);
  const key = el("div", "key");
  key.setAttribute("aria-hidden", "true");
  const mark = (className, text) => { const item = el("span", "key-item"); item.append(el("span", className), el("span", null, text)); return item; };
  key.append(mark("dot", "This conversation"));
  if (usualSeen) key.append(mark("ring", name ? `${name}’s usual` : "Their usual"));
  node.append(key);
  return node;
}

// Side by side (28 October 2026), read by the other person: the sharer by name (in ink) and "you"
// (in grey), the same tiles and sentence rules as the app's.
function sideBySideTiles(raw, name) {
  if (!raw || typeof raw !== "object") return [];
  const num = v => typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0;
  const pair = o => ({ me: num(o?.you), you: num(o?.them) });
  const talk = pair(raw.talk), longest = pair(raw.longest), pace = pair(raw.pace), softening = pair(raw.softening);
  const replies = { ...pair(raw.replies), quick: num(raw.replies?.quick) };
  const shared = raw.shared && str(raw.shared.word) ? { word: raw.shared.word, ...pair(raw.shared) } : null;
  const fillers = (Array.isArray(raw.fillers) ? raw.fillers : []).filter(f => str(f?.word)).slice(0, 5).map(f => ({ word: f.word, ...pair(f) }));
  if (talk.me + talk.you <= 0) return [];
  const who = name ?? "They";
  const cap = text => text.charAt(0).toUpperCase() + text.slice(1);
  const swatchOf = (label, tone) => { const s = el("span", "key-item"); s.append(el("span", `sw ${tone}`), el("span", null, label)); return s; };
  const keyRow = (a, b) => { const k = el("div", "side-key"); k.append(swatchOf(a, "me"), swatchOf(b, "you")); return k; };
  const lead = (first, rest) => verdict(first, rest);
  const tiles = [];
  const table = (heading, rows) => {
    const t = el("div", "side-table");
    const head = el("div", "side-row side-head");
    head.append(el("span", "side-cell-label", heading ?? ""), swatchOf(who, "me"), swatchOf("You", "you"));
    t.append(head);
    for (const [label, x, y] of rows) {
      const row = el("div", "side-row");
      row.append(el("span", "side-cell-label", label), el("span", x > y ? "side-cell strong" : "side-cell", String(Math.round(x))),
        el("span", y > x ? "side-cell strong" : "side-cell", String(Math.round(y))));
      t.append(row);
    }
    return t;
  };

  // How you came across as a paragraph only, then what each cared about as its own tile
  // (Julien, 29 October 2026).
  const reading = str(raw.readingShared), me = raw.you ?? {}, you = raw.them ?? {};
  if (reading) {
    const [first, rest] = leadOf(cap(reading.replaceAll("{name}", name ?? "they")));
    tiles.push(tagged(tag("How you came across", "next"), lead(first, rest)));
  }
  if (str(me.caredAbout) && str(you.caredAbout)) {
    const cols = el("div", "side-cols");
    for (const [label, tone, value] of [[who, "me", me.caredAbout], ["You", "you", you.caredAbout]]) {
      const col = el("div", "side-col");
      col.append(swatchOf(label, tone), el("p", "side-phrase", hold(`${value}.`)));
      cols.append(col);
    }
    tiles.push(tagged(tag("Cared most about", "next"), cols));
  }

  // How you talked, both on the four scales (29 October 2026): the sharer in ink, the reader in grey.
  const ENDS = { assertiveness: ["Softened", "Direct", "said things directly", "softened them"],
    listening: ["About plans", "About people", "asked about people", "asked about plans"],
    clarity: ["Thinks out loud", "Gets to the point", "got to the point", "thought out loud"],
    framing: ["Facts first", "Story first", "led with stories", "led with facts"] };
  const scales = (Array.isArray(raw.scales) ? raw.scales : []).filter(x => ENDS[x?.area]).slice(0, 4)
    .map(x => ({ area: x.area, me: Math.min(100, num(x.you)), you: Math.min(100, num(x.them)) }));
  if (scales.length) {
    const widest = scales.reduce((a, b) => Math.abs(b.me - b.you) > Math.abs(a.me - a.you) ? b : a);
    const [, , right, left] = ENDS[widest.area];
    const talkedLead = Math.abs(widest.me - widest.you) < 15 ? "You talked in much the same way."
      : widest.me > widest.you ? `${who} ${right}; you ${left}.` : `${who} ${left}; you ${right}.`;
    const list = el("div", "scales");
    for (const scale of scales) {
      const row = el("div", "scale");
      const ends = el("div", "ends");
      ends.append(el("span", "end", ENDS[scale.area][0]), el("span", "end", ENDS[scale.area][1]));
      const track = el("div", "side-track");
      track.append(el("span", "side-rail"));
      for (const [tone, value] of [["you", scale.you], ["me", scale.me]]) {
        const dot = el("span", `side-dot ${tone}`);
        dot.style.setProperty("--p", String(value / 100));
        track.append(dot);
      }
      row.setAttribute("role", "img");
      row.setAttribute("aria-label", `${ENDS[scale.area][0]} to ${ENDS[scale.area][1]}: ${who} ${Math.round(scale.me)}, you ${Math.round(scale.you)}, out of 100`);
      ends.setAttribute("aria-hidden", "true"); track.setAttribute("aria-hidden", "true");
      row.append(ends, track);
      list.append(row);
    }
    tiles.push(tagged(tag("How you talked", "next"), lead(talkedLead), list, keyRow(who, "You")));
  }

  const share = talk.me / (talk.me + talk.you);
  const talkLead = Math.abs(share - 0.5) < 0.05 ? "You both talked about as much."
    : `${share > 0.5 ? who : "You"} talked ${Math.abs(share - 0.5) <= 0.15 ? "a little more" : "more"}.`;
  const split = el("div", "split");
  const a = el("span", "seg me"), b = el("span", "seg you");
  a.style.flexGrow = String(talk.me); b.style.flexGrow = String(talk.you);
  split.append(a, b); split.setAttribute("aria-hidden", "true");
  const pct = v => `${Math.round(v / (talk.me + talk.you) * 100)}%`;
  tiles.push(tagged(tag("Talking time", "next"), lead(talkLead), split, keyRow(`${who} · ${pct(talk.me)}`, `You · ${pct(talk.you)}`)));

  const clock = s => `${Math.floor(Math.round(s) / 60)}:${String(Math.round(s) % 60).padStart(2, "0")}`;
  const top = Math.max(longest.me, longest.you, 1);
  const bars = el("div", "side-bars");
  for (const [label, tone, value] of [[who, "me", longest.me], ["You", "you", longest.you]]) {
    const row = el("div", "side-bar-row");
    const track = el("div", "side-bar-track"), bar = el("span", `side-bar ${tone}`);
    bar.style.width = `${Math.max(4, value / top * 100)}%`;
    track.append(bar);
    row.append(el("span", "side-who", label), track, el("span", "side-num", clock(value)));
    bars.append(row);
  }
  tiles.push(tagged(tag("Longest turn", "next"), lead(`${longest.me >= longest.you ? who : "You"} held the floor longest.`), bars));

  if (fillers.length) {
    const mine = fillers.filter(f => f.me >= 3 && f.me > f.you).sort((x, y) => y.me - x.me)[0];
    const yours = fillers.filter(f => f.you >= 3 && f.you > f.me).sort((x, y) => y.you - x.you)[0];
    const owner = name ? `${name}’s` : "Theirs";
    const fillerLead = mine && yours ? `${owner} is “${mine.word}”; yours is “${yours.word}”.` : mine ? `${owner} is “${mine.word}”.` : yours ? `Yours is “${yours.word}”.` : null;
    const parts = [table("Times said", fillers.map(f => [`“${f.word}”`, f.me, f.you]))];
    if (fillerLead) parts.unshift(lead(fillerLead));
    tiles.push(tagged(tag("Filler words", "next"), ...parts));
  }

  // Vocabulary (29 October 2026): the comparison only; a score out of 100 comes with a Larkin
  // report, so the reader is invited to get their own.
  const vocab = raw.vocabulary && typeof raw.vocabulary === "object" ? pair(raw.vocabulary) : null;
  if (vocab && vocab.me + vocab.you > 0) {
    const said = raw.words ? pair(raw.words) : null, different = raw.distinct ? pair(raw.distinct) : null;
    const top = Math.max(vocab.me, vocab.you), bottom = Math.min(vocab.me, vocab.you);
    const meLead = vocab.me > vocab.you;
    const saidLess = said ? (meLead ? said.me < said.you : said.you < said.me) : false;
    const vocabLead = (top - bottom) / top < 0.05 ? "You both drew on a similar range of words."
      : `${meLead ? who : "You"} ${saidLess ? "said less, with a wider vocabulary" : "had the wider vocabulary"}.`;
    const count = n => Math.round(n).toLocaleString("en-US");
    const halves = el("div", "side-halves");
    for (const [label, tone, value, s, d] of [[who, "me", vocab.me, said?.me, different?.me], ["You", "you", vocab.you, said?.you, different?.you]]) {
      const half = el("div", "side-half");
      half.append(el("b", "side-big", String(Math.round(value))), swatchOf(label, tone));
      if (s && d) half.append(el("p", "side-unit-plain", `${count(d)} different words in\u00a0${count(s)}`));
      halves.append(half);
    }
    const nudge = el("div", "side-nudge");
    const get = el("a", "side-get", "Get Larkin");
    get.href = "https://getlarkin.com/?utm_source=shared-notes&utm_medium=link&utm_content=vocabulary";
    nudge.append(el("p", null, hold("Want your own vocabulary score? Use Larkin for a few days to get yours.")), get);
    tiles.push(tagged(tag("Vocabulary", "next"), lead(vocabLead), halves, el("p", "side-unit", "Different words in every 1,000"), nudge));
  }

  const high = Math.max(pace.me, pace.you), low = Math.min(pace.me, pace.you);
  const paceLead = !high || (high - low) / high <= 0.08 ? "You matched each other’s pace." : `${pace.me > pace.you ? who : "You"} spoke faster.`;
  const nums = el("div", "side-nums");
  for (const [label, tone, value] of [[who, "me", pace.me], ["You", "you", pace.you]]) {
    const col = el("div", "side-numcol");
    col.append(el("b", null, String(Math.round(value))), swatchOf(label, tone));
    nums.append(col);
  }
  tiles.push(tagged(tag("Pace", "next"), lead(paceLead), nums, el("p", "side-unit", "Words a minute")));

  const soft = softening.me + softening.you < 3 ? null : softening.me > softening.you * 1.15 ? `${name ?? "they"} softened a little more`
    : softening.you > softening.me * 1.15 ? "you softened a little more" : "you both softened about as much";
  const wordsLead = shared && soft ? `You both said “${shared.word}”, and ${soft}.` : shared ? `You both said “${shared.word}”.` : soft ? `${cap(soft)}.` : null;
  if (wordsLead) {
    const rows = [];
    if (shared) rows.push([`“${shared.word}”`, shared.me, shared.you]);
    if (soft) rows.push(["“maybe”, “I\u00a0think”", softening.me, softening.you]);
    tiles.push(tagged(tag("Same words", "next"), lead(wordsLead), table(null, rows)));
  }

  const fast = replies.me < 0.5 && replies.you < 0.5;
  const track = el("div", "side-track");
  track.append(el("span", "side-rail"));
  for (const [tone, value] of [["me", replies.me], ["you", replies.you]]) {
    const dot = el("span", `side-dot ${tone}`);
    dot.style.setProperty("--p", String(Math.min(value, 2) / 2));
    track.append(dot);
  }
  track.setAttribute("aria-hidden", "true");
  const ends = el("div", "side-ends"); ends.append(el("span", null, "Instant"), el("span", null, "2 seconds"));
  const secs = v => `${v.toFixed(2)} s`;
  tiles.push(tagged(tag("Replies", "next"), fast ? lead("No dead air.", replies.quick ? `You both answered in under half a second: ${replies.quick} replies came without a pause.` : null)
    : lead(`${replies.me <= replies.you ? who : "You"} answered faster.`), track, ends, keyRow(`${who} · ${secs(replies.me)}`, `You · ${secs(replies.you)}`)));
  return tiles;
}

function show(...nodes) {
  page.replaceChildren(...nodes);
  page.setAttribute("aria-busy", "false");
}

function state(title, message, action) {
  const node = el("div", "head state");
  node.append(el("h1", null, title), el("p", null, message));
  if (action) node.append(action);
  show(node);
}

// A shared report (kind "report", 9 October 2026): the person's month with Larkin, only the parts
// about them (title, numbers, rhythm, how they talk, contradictions, fun facts, line of the month).
// Always dark, like the report in the app.
// A shared report (Julien, 9 October 2026; Figma "Oct 9 Report visuals (Claude)", Option 2): the
// app's page, section by section on alternating blacks. A graphic only where it explains faster
// than words, each moving once as its section scrolls into view; still when motion is reduced.
const QUIET = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const SPELLED = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const onShow = new WeakMap();

function eyebrow(text) { return el("p", "caps report-eyebrow", text); }
function block(...children) {
  const node = el("section", "report-section");
  node.append(...children);
  return node;
}
function str(value) { return typeof value === "string" && value.trim() ? value : null; }
function spelled(number) { return number <= 12 ? SPELLED[number] : String(number); }
function capitalised(text) { return text.charAt(0).toUpperCase() + text.slice(1); }
function later(section, action) { onShow.set(section, [...(onShow.get(section) ?? []), action]); }

/// "6h 50m" or "45m" in minutes; null for anything else.
function minutesOf(text) {
  const match = /^(?:(\d+)h\s*)?(\d+)m$/.exec(text.trim());
  return match ? Number(match[1] ?? 0) * 60 + Number(match[2]) : null;
}

/// Every run of digits grown to `progress`, keeping its zero padding: "6h 50m" at half is "3h 25m".
function counted(text, progress) {
  return text.replace(/\d+/g, digits => {
    const value = String(Math.round(Number(digits) * progress));
    return digits.length > 1 && digits[0] === "0" ? value.padStart(digits.length, "0") : value;
  });
}

/// A big number that counts up from zero when its section shows.
function number(section, text, className, duration = 800) {
  const node = el("p", `report-number${className ? ` ${className}` : ""}`, text);
  node.setAttribute("aria-label", text);
  if (!QUIET && /\d/.test(text)) {
    node.textContent = counted(text, 0);
    later(section, () => {
      const start = performance.now();
      const frame = now => {
        const t = Math.min(1, (now - start) / duration);
        node.textContent = t < 1 ? counted(text, 1 - Math.pow(1 - t, 3)) : text;
        if (t < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }
  return node;
}

function bar(fraction, tone, index = 0) {
  const track = el("div", "report-bar");
  const fill = el("span", tone);
  fill.style.setProperty("--w", `${Math.max(0, Math.min(1, fraction)) * 100}%`);
  fill.style.setProperty("--i", String(index));
  track.append(fill);
  track.setAttribute("aria-hidden", "true");
  return track;
}

function quoteCard(quote, who) {
  const card = el("figure", "report-quote-card");
  const mark = el("span", "report-mark", "“");
  mark.setAttribute("aria-hidden", "true");
  card.append(mark, el("blockquote", null, quote));
  if (who) card.append(el("figcaption", null, who));
  return card;
}

function renderReport(report) {
  document.body.classList.add("report");
  if (!QUIET) document.body.classList.add("motion");
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.content = "#151515";
  const who = str(report.sharedBy);
  const nodes = [];

  const hero = block();
  hero.classList.add("report-hero");
  const dot = el("span", "report-dot"); dot.setAttribute("aria-hidden", "true");
  hero.append(dot, eyebrow(`${who ? `${who}’s` : "A"} ${str(report.month) ?? "month"} with Larkin`),
    el("h1", "report-title", `${report.title}.`));
  if (str(report.subtitle)) hero.append(el("p", "report-text report-muted", report.subtitle));
  if (str(report.when)) hero.append(el("p", "report-small", report.when));
  nodes.push(hero);

  // Time with people, with an AI and of videos nearby: numbers count up while their bars grow.
  const durations = (Array.isArray(report.measured) ? report.measured : [])
    .filter(r => str(r?.number) && str(r?.label) && minutesOf(r.number) !== null);
  if (durations.length) {
    const section = block();
    const total = durations.reduce((sum, r) => sum + minutesOf(r.number), 0);
    const longest = Math.max(1, ...durations.map(r => minutesOf(r.number)));
    const rows = el("div", "report-rows");
    durations.forEach((row, index) => {
      const item = el("div", "report-row");
      const tone = /\bAI\b/.test(row.label) ? "lime" : /video/.test(row.label) ? "muted" : "white";
      item.append(number(section, row.number, "white"), bar(minutesOf(row.number) / longest, tone, index), el("p", "report-small", row.label));
      rows.append(item);
    });
    section.append(eyebrow("The month, measured"),
      el("h2", "report-heading", `${capitalised(spelled(Math.max(1, Math.round(total / 60))))} hours of ${who ? `${who}’s` : "their"} life, heard.`),
      rows);
    nodes.push(section);
  }

  // The day plays back: bars rise in order from 6 am, the late ones last.
  const rhythm = report.rhythm && typeof report.rhythm === "object" ? report.rhythm : null;
  if (rhythm && str(rhythm.title)) {
    const hours = Array.isArray(rhythm.hours) && rhythm.hours.length === 24 ? rhythm.hours.map(h => Number(h) || 0) : [];
    const section = block(eyebrow("Rhythm"), el("h2", "report-heading", `${rhythm.title}.`));
    if (str(rhythm.line)) section.append(el("p", "report-text", rhythm.line));
    if (hours.length) {
      const peak = Math.max(1, ...hours);
      const chart = el("div", "report-chart");
      chart.setAttribute("role", "img");
      chart.setAttribute("aria-label", "Words by hour of the day");
      for (let k = 0; k < 24; k++) {
        const hour = (k + 6) % 24, words = hours[hour];
        const item = el("span", hour >= 23 || hour < 3 ? "late" : "");
        if (!words) item.classList.add("empty");
        item.style.setProperty("--h", `${Math.max(3, Math.round(words / peak * 120))}px`);
        item.style.setProperty("--i", String(k));
        chart.append(item);
      }
      const axis = el("div", "report-axis");
      axis.setAttribute("aria-hidden", "true");
      for (const label of ["6 am", "noon", "6 pm", "midnight"]) axis.append(el("span", null, label));
      section.append(chart, axis);
    }
    nodes.push(section);
  }

  // Four scales; each dot slides from the middle to where the person sits, the side they lean to in white.
  const style = report.style && typeof report.style === "object" ? report.style : null;
  if (style && str(style.headline)) {
    const section = block(eyebrow(who ? `How ${who} talks` : "How they talk"), el("h2", "report-heading", style.headline));
    const scales = el("div", "report-scales");
    for (const area of Array.isArray(style.areas) ? style.areas : []) {
      if (!str(area?.title)) continue;
      const scale = el("div", "report-scale");
      const track = el("div", "track");
      const position = typeof area.position === "number" ? Math.min(1, Math.max(0, area.position)) : null;
      if (position !== null) {
        const point = el("span", "point");
        point.style.setProperty("--p", String(position));
        track.append(point);
      }
      const ends = el("div", "ends");
      const left = el("span", position !== null && position < 0.5 ? "lean" : null, area.left ?? "");
      const right = el("span", position !== null && position >= 0.5 ? "lean" : null, area.right ?? "");
      ends.append(left, right);
      scale.append(el("p", "scale-title", area.title), track, ends);
      scales.append(scale);
    }
    section.append(scales);
    if (str(style.quote)) section.append(quoteCard(style.quote, who));
    nodes.push(section);
  }

  // Each contradiction on its own card; the lime line lands after the first, like a punchline.
  const contradictions = Array.isArray(report.contradictions) ? report.contradictions.filter(c => str(c?.claim) && str(c?.twist)) : [];
  if (contradictions.length) {
    const section = block(eyebrow(`${who ?? "They"}, in contradiction`));
    contradictions.forEach((item, index) => {
      const card = el("article", "report-card");
      const twist = el("p", "report-heading report-twist", item.twist);
      twist.style.setProperty("--i", String(index));
      card.append(el("h2", "report-heading", item.claim), twist);
      if (str(item.context)) card.append(el("p", "report-caption", item.context));
      section.append(card);
    });
    nodes.push(section);
  }

  // Numbers count up, fast: the count itself is the joke.
  const facts = Array.isArray(report.funFacts) ? report.funFacts.filter(f => str(f?.number) && str(f?.text)) : [];
  if (facts.length) {
    const section = block(eyebrow("Fun facts"), el("h2", "report-heading", "Things only Larkin noticed."));
    const rows = el("div", "report-facts");
    for (const fact of facts) {
      const row = el("div", "report-fact");
      row.append(number(section, fact.number, null, 1000), el("p", "report-text", fact.text));
      rows.append(row);
    }
    section.append(rows);
    nodes.push(section);
  }

  // The quote writes itself in, word by word: the page's only typing.
  if (report.line && str(report.line.quote)) {
    const section = block(eyebrow("Line of the month"));
    section.classList.add("report-line-section");
    const mark = el("span", "report-mark", "“");
    mark.setAttribute("aria-hidden", "true");
    const quote = el("p", "report-line");
    quote.setAttribute("aria-label", report.line.quote);
    const words = report.line.quote.trim().split(/\s+/);
    words.forEach((word, index) => {
      if (index > 0) quote.append(document.createTextNode(" "));
      const span = el("span", "word", word);
      span.setAttribute("aria-hidden", "true");
      quote.append(span);
    });
    later(section, () => quote.querySelectorAll(".word").forEach((span, index) => setTimeout(() => span.classList.add("on"), 110 * (index + 1))));
    section.append(mark, quote);
    if (str(report.line.context)) section.append(el("p", "report-small", report.line.context));
    nodes.push(section);
  }

  const hook = el("aside", "hook");
  const cta = el("a", "pill pill-ink", "Get Larkin");
  cta.href = "https://getlarkin.com/?utm_source=shared-report&utm_medium=link&utm_content=hook";
  hook.append(el("h2", null, "What would your month say about you?"),
    el("p", null, "Larkin listens to your day and tells you what your conversations say: your rhythm, how you talk, and the lines worth keeping."),
    cta);
  nodes.push(hook);

  const discover = document.querySelector(".discover .eyebrow");
  if (discover) discover.textContent = "This report was written by Larkin";
  const foot = document.querySelector(".foot p");
  if (foot) foot.textContent = "The person who shared this report chose to and can stop at any time. It never shows who they talked with or what was said.";
  document.title = `${report.title} · Larkin`;
  show(...nodes);
  reveal(nodes.filter(node => node.classList.contains("report-section")));
}

/// Marks each section shown once 30% of it is on screen, and starts its counts and typing.
function reveal(sections) {
  const play = section => {
    if (section.classList.contains("shown")) return;
    section.classList.add("shown");
    for (const action of onShow.get(section) ?? []) action();
  };
  if (QUIET || !("IntersectionObserver" in window)) { sections.forEach(section => section.classList.add("shown")); return; }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      play(entry.target);
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.3 });
  sections.forEach(section => observer.observe(section));
}

function render(notes) {
  if (notes.kind === "report") return renderReport(notes);
  const name = str(notes.sharedBy);

  // The header, as on the app's conversation page (28 October 2026): the title, the date under it,
  // then who was talking and why.
  const head = el("header", "head");
  const by = name ? `Shared by ${name}` : "Shared from Larkin";
  const meta = el("p", "meta");
  if (str(notes.when)) meta.append(document.createTextNode(`${notes.when} · `));
  meta.append(el("span", "nowrap", by));
  head.append(el("h1", null, notes.title), meta);
  if (str(notes.summary)) head.append(el("p", "summary", notes.summary));

  // Insights: the sharer's own coaching is written to them ("you"), so its tags say whose it is.
  const insights = [];
  const cameAcross = str(notes.cameAcross);
  if (cameAcross) {
    const [lead, rest] = leadOf(cameAcross);
    insights.push(tagged(tag(name ? `How ${name} came across` : "How they came across"), verdict(lead, rest)));
  }
  const talked = talkedTile(notes.talked, name);
  if (talked) insights.push(talked);
  const areas = Array.isArray(notes.insights) ? notes.insights : [];
  const worked = areas.flatMap(area => points(area?.worked)), slipped = areas.flatMap(area => points(area?.slipped));
  if (worked.length) insights.push(tagged(tag("Worked", "worked"), ...worked.map(point)));
  if (slipped.length) insights.push(tagged(tag("To work on", "to-work-on"), ...slipped.map(point)));
  const tryNext = texts(notes.tryNext);
  if (tryNext.length) insights.push(tagged(tag("What to do next", "next"), bullets(tryNext)));
  // Larkin's take left the app on 28 October 2026 and is no longer shown, even from older links.

  // Notes: each group or template section under a grey tag, like the insights' tiles. "How the
  // conversation went" left the app too; older links still show it.
  const notesTiles = [];
  const overview = texts(notes.overview);
  if (overview.length) notesTiles.push(tagged(tag("How the conversation went"), bullets(overview)));
  if (notes.notes && typeof notes.notes === "object") {
    for (const [label, entries] of [["Main points", texts(notes.notes.keyPoints)], ["Decisions", texts(notes.notes.decisions)],
      ["Open questions", texts(notes.notes.openQuestions)]]) {
      if (entries.length) notesTiles.push(tagged(tag(label), bullets(entries)));
    }
  }
  for (const section of Array.isArray(notes.sections) ? notes.sections : []) {
    if (!str(section?.title)) continue;
    const parts = [];
    if (str(section.text)) parts.push(el("p", "sentence", section.text));
    const sectionPoints = texts(section.points);
    if (sectionPoints.length) parts.push(bullets(sectionPoints, Array.isArray(section.details) ? section.details : []));
    if (parts.length) notesTiles.push(tagged(tag(section.title), ...parts));
  }
  const todos = texts(notes.todos);
  if (todos.length) notesTiles.push(tagged(tag("To-do"), bullets(todos)));

  // Insights and the notes under two pills, one at a time, as in the app. The link opens on the
  // notes: they are what the people in the conversation came for, and always shared.
  const template = str(notes.template) ?? (Array.isArray(notes.sections) && notes.sections.length ? "Notes" : "Short notes");
  const notesPanel = panel(notesTiles.length ? notesTiles : [el("p", "empty", "No notes for this conversation.")]);
  const side = sideBySideTiles(notes.sideBySide, name);
  // Insights, Side by side and the notes under pills, one at a time, as in the app. The link opens on
  // Side by side when it was shared (the part the other person came for), otherwise on the notes.
  const tabsList = [];
  if (insights.length) tabsList.push(["insights", pill("Insights", null), panel(insights)]);
  if (side.length) tabsList.push(["side-by-side", pill("Side by side", null), panel(side)]);
  tabsList.push(["notes", pill(template, TEMPLATE_ICONS[template.toLowerCase()] ?? "notes"), notesPanel]);
  const nodes = [head];
  if (tabsList.length > 1) {
    const tabs = el("div", "pills");
    tabs.setAttribute("role", "tablist");
    const select = (on) => {
      for (const [, button, body] of tabsList) {
        const selected = button === on;
        button.setAttribute("aria-selected", String(selected));
        button.tabIndex = selected ? 0 : -1;
        body.hidden = !selected;
      }
    };
    for (const [id, button, body] of tabsList) {
      button.addEventListener("click", () => select(button));
      button.id = `tab-${id}`; body.id = `panel-${id}`;
      button.setAttribute("aria-controls", body.id); body.setAttribute("role", "tabpanel"); body.setAttribute("aria-labelledby", button.id);
      tabs.append(button);
    }
    tabs.addEventListener("keydown", event => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const at = tabsList.findIndex(([, button]) => button.getAttribute("aria-selected") === "true");
      const next = tabsList[Math.min(tabsList.length - 1, Math.max(0, at + (event.key === "ArrowLeft" ? -1 : 1)))][1];
      select(next); next.focus();
    });
    select((side.length ? tabsList.find(([id]) => id === "side-by-side") : tabsList.find(([id]) => id === "notes"))[1]);
    nodes.push(tabs, ...tabsList.map(([, , body]) => body));
  } else {
    nodes.push(notesPanel);
  }

  // The hook: what Larkin would give the reader, about themselves, privately.
  const hook = el("aside", "hook");
  const cta = el("a", "pill", "Get Larkin");
  cta.href = "https://getlarkin.com/?utm_source=shared-notes&utm_medium=link&utm_content=hook";
  hook.append(el("h2", null, "How did you come across?"),
    el("p", null, "Larkin writes notes like these from every conversation, and gives you a private read on how you came across: what worked, what to work on and what to do next."),
    cta);
  nodes.push(hook);

  document.title = `${notes.title} · Larkin`;
  show(...nodes);
}

async function load() {
  const code = location.hash.slice(1);
  document.title = "Conversation notes · Larkin";
  if (!code) {
    return state("Notes shared from Larkin.", "Open the full link you were sent to read the notes.");
  }
  if (!CODE.test(code)) {
    return state("These notes aren’t shared.", "The link may be incomplete. Ask the person who sent it for a new one.");
  }
  page.setAttribute("aria-busy", "true");
  try {
    const response = await fetch(`${API}?code=${encodeURIComponent(code)}`, { cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" });
    if (response.status === 404) {
      return state("These notes aren’t shared anymore.", "The person who shared them stopped sharing, or the link is incomplete.");
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    if (!body || !body.notes || typeof body.notes.title !== "string") throw new Error("Unexpected reply");
    render(body.notes);
  } catch {
    const retry = el("button", "pill pill-small pill-quiet", "Try again");
    retry.type = "button";
    retry.addEventListener("click", load);
    state("These notes couldn’t be loaded.", "Check your connection and try again.", retry);
  }
}

window.addEventListener("hashchange", load);
load();
