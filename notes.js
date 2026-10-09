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
function eyebrow(text) { return el("p", "caps report-eyebrow", text); }
function block(...children) {
  const node = el("section", "report-section");
  node.append(...children);
  return node;
}
function str(value) { return typeof value === "string" && value.trim() ? value : null; }

function renderReport(report) {
  document.body.classList.add("report");
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.content = "#151515";
  const who = str(report.sharedBy);
  const nodes = [];

  const hero = el("header", "report-hero");
  const dot = el("span", "report-dot"); dot.setAttribute("aria-hidden", "true");
  hero.append(dot, eyebrow(`${who ? `${who}’s` : "A"} ${str(report.month) ?? "month"} with Larkin`),
    el("h1", "report-title", `${report.title}.`));
  if (str(report.subtitle)) hero.append(el("p", "report-lead", report.subtitle));
  if (str(report.when)) hero.append(el("p", "report-when", report.when));
  nodes.push(hero);

  const measured = Array.isArray(report.measured) ? report.measured.filter(r => str(r?.number) && str(r?.label)) : [];
  if (measured.length) {
    const rows = el("div", "report-stats");
    for (const row of measured) {
      const item = el("div", "report-stat");
      item.append(el("p", "report-number", row.number), el("p", null, row.label));
      rows.append(item);
    }
    nodes.push(block(eyebrow("The month, measured"), rows));
  }

  const rhythm = report.rhythm && typeof report.rhythm === "object" ? report.rhythm : null;
  if (rhythm && str(rhythm.title)) {
    const hours = Array.isArray(rhythm.hours) && rhythm.hours.length === 24 ? rhythm.hours.map(h => Number(h) || 0) : [];
    const children = [eyebrow("Rhythm"), el("h2", "report-heading", `${rhythm.title}.`)];
    if (str(rhythm.line)) children.push(el("p", "report-lead", rhythm.line));
    if (hours.length) {
      const peak = Math.max(1, ...hours);
      const chart = el("div", "report-chart");
      chart.setAttribute("role", "img");
      chart.setAttribute("aria-label", "Words by hour of the day");
      for (let k = 0; k < 24; k++) {
        const hour = (k + 6) % 24, words = hours[hour];
        const bar = el("span", hour >= 23 || hour < 3 ? "bar late" : "bar");
        bar.style.height = `${Math.max(2, Math.round(words / peak * 100))}%`;
        if (!words) bar.classList.add("empty");
        chart.append(bar);
      }
      const axis = el("div", "report-axis");
      axis.setAttribute("aria-hidden", "true");
      for (const label of ["6 am", "noon", "6 pm", "midnight", "6 am"]) axis.append(el("span", null, label));
      children.push(chart, axis);
    }
    nodes.push(block(...children));
  }

  const style = report.style && typeof report.style === "object" ? report.style : null;
  if (style && str(style.headline)) {
    const children = [eyebrow(who ? `How ${who} talks` : "How they talk"), el("h2", "report-heading", style.headline)];
    const scales = el("div", "report-scales");
    for (const area of Array.isArray(style.areas) ? style.areas : []) {
      if (!str(area?.title)) continue;
      const scale = el("div", "report-scale");
      const track = el("div", "track");
      if (typeof area.position === "number") {
        const point = el("span", "point");
        point.style.left = `calc(${Math.min(1, Math.max(0, area.position)) * 100}% - ${area.position * 14}px)`;
        track.append(point);
      }
      const ends = el("div", "ends");
      ends.append(el("span", null, area.left ?? ""), el("span", null, area.right ?? ""));
      scale.append(el("p", "scale-title", area.title), track, ends);
      scales.append(scale);
    }
    children.push(scales);
    if (str(style.quote)) children.push(el("p", "report-quote", `“${style.quote}”`));
    nodes.push(block(...children));
  }

  const contradictions = Array.isArray(report.contradictions) ? report.contradictions.filter(c => str(c?.claim) && str(c?.twist)) : [];
  contradictions.forEach((item, index) => {
    const children = [eyebrow(`${who ?? "They"}, in contradiction · ${index + 1} of ${contradictions.length}`),
      el("h2", "report-heading report-claim", item.claim), el("p", "report-twist", item.twist)];
    if (str(item.context)) children.push(el("p", "report-context", item.context));
    nodes.push(block(...children));
  });

  const facts = Array.isArray(report.funFacts) ? report.funFacts.filter(f => str(f?.number) && str(f?.text)) : [];
  if (facts.length) {
    const rows = el("div", "report-facts");
    for (const fact of facts) {
      const row = el("div", "report-fact");
      row.append(el("p", "report-number", fact.number), el("p", null, fact.text));
      rows.append(row);
    }
    nodes.push(block(eyebrow("Fun facts"), el("h2", "report-heading", "Things only Larkin noticed."), rows));
  }

  if (report.line && str(report.line.quote)) {
    const children = [eyebrow("Line of the month"), el("p", "report-line", `“${report.line.quote}”`)];
    if (str(report.line.context)) children.push(el("p", "report-context", report.line.context));
    nodes.push(block(...children));
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
