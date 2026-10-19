// Connect ChatGPT (16 October 2026): ChatGPT sends the person here with a request id in the
// fragment. The person approves in the Larkin app, signed in: on an iPhone the button opens Larkin,
// on a computer a QR code carries the request to the iPhone. This page waits, then returns to
// ChatGPT with a one-time code (or a refusal). A page opened from the QR code only hands over to
// Larkin: the page that ChatGPT opened is the one that returns to it.
(() => {
  const endpoint = "https://jvdtgnwexspohnsbxpbl.supabase.co/functions/v1/larkin-mcp/approval";
  const params = new URLSearchParams(location.hash.slice(1));
  const request = params.get("request");
  const fromQR = params.get("via") === "qr";
  const onIPhone = /iPhone|iPod/.test(navigator.userAgent);
  const $ = (id) => document.getElementById(id);
  let polling = null;
  let appName = "the app";

  function stop(message) {
    clearInterval(polling);
    $("ask").hidden = true;
    $("status").hidden = false;
    $("status").textContent = message;
  }

  function leave(redirect, message) {
    stop(message);
    // Only back to an app the server checked at registration.
    let mori = false;
    try {
      const url = new URL(redirect);
      mori = url.origin === "https://mori-time-map.jul-neree.chatgpt.site" && url.pathname === "/api/larkin/callback" && !url.hash && !url.username && !url.password;
    } catch { /* Invalid return addresses are never followed. */ }
    if (typeof redirect === "string" && (mori || /^(https:\/\/(chatgpt\.com|chat\.openai\.com)\/|http:\/\/(localhost|127\.0\.0\.1)[:/])/.test(redirect))) {
      location.replace(redirect);
    }
  }

  async function pickUp(extra = {}) {
    const response = await fetch(`${endpoint}/pickup`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ request, ...extra }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return stop(body.error_description || "This link has expired. Start again from the app you are connecting.");
    if (body.status === "approved") return leave(body.redirect, `Connected. Going back to ${appName}…`);
    if (body.status === "denied") return leave(body.redirect, "Not connected. You can close this page.");
  }

  function poll() {
    pickUp().catch(() => {});
  }

  function showQR(link) {
    const qr = qrcode(0, "M");
    qr.addData(link);
    qr.make();
    $("qr").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 12, scalable: true });
    $("scan").hidden = false;
  }

  async function load() {
    if (!request) return stop("This link is incomplete. Start again from the app you are connecting.");
    let body;
    try {
      const response = await fetch(`${endpoint}?request=${encodeURIComponent(request)}`);
      body = await response.json().catch(() => ({}));
      if (!response.ok) return stop(body.error_description || "This link has expired. Start again from the app you are connecting.");
    } catch {
      return stop("Larkin can’t be reached. Check your connection and reload the page.");
    }
    const name = body.client && body.client.name ? body.client.name : "An app";
    appName = name;
    document.title = `Connect ${name} · Larkin`;
    document.querySelector("h1").textContent = `Connect ${name} to Larkin.`;
    $("who").textContent = `${name} wants to read your Larkin conversations.`;
    $("open").href = body.appLink;
    if (onIPhone) {
      $("phone").hidden = false;
    } else {
      showQR(`https://insights.getlarkin.com/connect/#request=${encodeURIComponent(request)}&via=qr`);
    }
    if (fromQR) {
      // The computer's page returns to ChatGPT; this one only opens Larkin.
      $("waiting").textContent = `After you tap Connect, go back to your computer. ${appName} continues there.`;
      $("cancelRow").hidden = true;
    } else {
      polling = setInterval(poll, 2000);
      document.addEventListener("visibilitychange", () => { if (!document.hidden) poll(); });
      setTimeout(() => stop("This link has expired. Start again from the app you are connecting."), 15 * 60 * 1000);
    }
    $("status").hidden = true;
    $("ask").hidden = false;
    if (body.status !== "pending" && !fromQR) poll();
  }

  $("cancel").addEventListener("click", () => {
    $("cancel").disabled = true;
    pickUp({ cancel: true }).catch(() => stop("Not connected. You can close this page."));
  });

  load();
})();
