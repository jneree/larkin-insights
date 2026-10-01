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

function render(notes) {
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
