// Shared conversation notes. The link carries the share code after "#", so it never
// reaches this host or a link preview service; the page asks Larkin's server for the
// sections the person chose and writes them as text (never as HTML).
"use strict";

const API = "https://jvdtgnwexspohnsbxpbl.supabase.co/functions/v1/capture-v1-shared-notes";
const CODE = /^[A-Za-z0-9_-]{22}$/;
const SKILLS = new Set(["clarity", "listening", "framing", "assertiveness"]);
const page = document.getElementById("page");

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function list(items, className) {
  const ul = el("ul", className);
  for (const item of items) ul.append(el("li", null, item));
  return ul;
}
function texts(value) {
  return Array.isArray(value) ? value.filter(item => typeof item === "string" && item.trim()) : [];
}
// Insight points: plain text (older links) or { text, why, next }.
function points(value) {
  if (!Array.isArray(value)) return [];
  return value.map(item => typeof item === "string" ? { text: item } : item)
    .filter(item => item && typeof item.text === "string" && item.text.trim())
    .map(item => ({ text: item.text, why: typeof item.why === "string" ? item.why : null, next: typeof item.next === "string" ? item.next : null }));
}
function section(title, ...children) {
  const node = el("section", "section");
  node.append(el("h2", null, title), ...children);
  return node;
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
  const nodes = [];
  const head = el("header", "head");
  if (typeof notes.when === "string") head.append(el("p", "meta", notes.when));
  head.append(el("h1", null, notes.title));
  head.append(el("p", "byline", typeof notes.sharedBy === "string" ? `Shared by ${notes.sharedBy}` : "Shared from Larkin"));
  if (typeof notes.summary === "string") head.append(el("p", "summary", notes.summary));
  nodes.push(head);

  const overview = texts(notes.overview);
  if (overview.length) nodes.push(section("How the conversation went", list(overview, "points")));

  // The sharer's own coaching is written to them ("you"), so its headings name them.
  const name = typeof notes.sharedBy === "string" ? notes.sharedBy : null;
  if (typeof notes.cameAcross === "string") {
    nodes.push(section(name ? `How ${name} came across` : "How they came across", el("p", null, notes.cameAcross)));
  }

  const areas = Array.isArray(notes.insights) ? notes.insights : [];
  const tryNext = texts(notes.tryNext);
  if (areas.length || tryNext.length) {
    const cards = [];
    for (const area of areas) {
      const card = el("article", "card");
      const title = el("h3", "card-title", area.title);
      if (SKILLS.has(area.area)) title.style.setProperty("--bar", `var(--skill-${area.area})`);
      card.append(title);
      let hasMore = false;
      for (const [label, items] of [["What worked", points(area.worked)], ["What slipped", points(area.slipped)]]) {
        if (!items.length) continue;
        const ul = el("ul", "points");
        for (const point of items) {
          const li = el("li");
          li.append(el("span", null, point.text));
          if (point.why || point.next) {
            hasMore = true;
            const more = el("div", "more");
            if (point.why) more.append(el("p", null, point.why));
            if (point.next) {
              const next = el("p", "next");
              next.append(el("strong", null, "Next time: "), document.createTextNode(point.next));
              more.append(next);
            }
            li.append(more);
          }
          ul.append(li);
        }
        const group = el("div", "group");
        group.append(el("h4", "caps", label), ul);
        card.append(group);
      }
      // "See more" opens every point's why and next time in place, like Tell me more in the app.
      if (hasMore) {
        const toggle = el("button", "see-more", "See more");
        toggle.type = "button";
        toggle.setAttribute("aria-expanded", "false");
        toggle.addEventListener("click", () => {
          const open = card.classList.toggle("open");
          toggle.textContent = open ? "See less" : "See more";
          toggle.setAttribute("aria-expanded", String(open));
        });
        card.append(el("hr", "divider"), toggle);
      }
      cards.push(card);
    }
    if (tryNext.length) {
      const card = el("article", "feature");
      const ol = el("ol");
      for (const item of tryNext) ol.append(el("li", null, item));
      card.append(el("h3", "caps", "Try next"), ol);
      cards.push(card);
    }
    nodes.push(section(name ? `Insights for ${name}` : "Their insights", ...cards));
  }

  const groups = notes.notes && typeof notes.notes === "object"
    ? [[null, texts(notes.notes.keyPoints)], ["Decisions", texts(notes.notes.decisions)], ["Open questions", texts(notes.notes.openQuestions)]]
        .filter(([, items]) => items.length)
    : [];
  if (groups.length) {
    const card = el("div", "card");
    groups.forEach(([label, items], index) => {
      if (index > 0) card.append(el("hr", "divider"));
      const group = el("div", "group");
      if (label) group.append(el("h3", "caps", label));
      group.append(list(items, "points"));
      card.append(group);
    });
    nodes.push(section("Notes", card));
  }

  // Larkin's take: its suggestions to the sharer on the main problems discussed.
  const take = Array.isArray(notes.take)
    ? notes.take.filter(item => item && typeof item.topic === "string" && typeof item.suggestion === "string")
    : [];
  if (take.length) {
    const card = el("div", "card");
    take.forEach((item, index) => {
      if (index > 0) card.append(el("hr", "divider"));
      const group = el("div", "take");
      group.append(el("h3", "take-topic", item.topic), el("p", "take-text", item.suggestion));
      card.append(group);
    });
    nodes.push(section("Larkin’s take", card));
  }

  const todos = texts(notes.todos);
  if (todos.length) {
    const card = el("div", "card");
    card.append(list(todos, "points todos"));
    nodes.push(section("To-dos", card));
  }

  // The hook: what Larkin would give the reader, about themselves, privately.
  const hook = el("aside", "hook");
  const cta = el("a", "pill pill-ink", "Get Larkin");
  cta.href = "https://getlarkin.com/?utm_source=shared-notes&utm_medium=link&utm_content=hook";
  hook.append(el("h2", null, "How did you come across?"),
    el("p", null, "Larkin writes notes like these from every conversation, and gives you a private read on how you came across: what worked, what slipped and what to try next."),
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
