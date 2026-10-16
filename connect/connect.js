// Connect ChatGPT (16 October 2026): ChatGPT sends the person here with a request id in the
// fragment. The page shows which app asks, takes the person's connection passphrase, and sends
// them back to the app with a one-time code (or a refusal). The passphrase only goes to Larkin.
(() => {
  const endpoint = "https://jvdtgnwexspohnsbxpbl.supabase.co/functions/v1/larkin-mcp/approval";
  const request = new URLSearchParams(location.hash.slice(1)).get("request");
  const status = document.getElementById("status");
  const form = document.getElementById("approve");
  const who = document.getElementById("who");
  const field = document.getElementById("passphrase");
  const error = document.getElementById("error");
  const connect = document.getElementById("connect");
  const cancel = document.getElementById("cancel");

  function stop(message) {
    form.hidden = true;
    status.hidden = false;
    status.textContent = message;
  }

  async function send(body) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ request, ...body }),
    });
    return { ok: response.ok, body: await response.json().catch(() => ({})) };
  }

  function leave(redirect, message) {
    stop(message);
    // Only back to the app the server checked at registration.
    if (typeof redirect === "string" && /^(https:\/\/(chatgpt\.com|chat\.openai\.com)\/|http:\/\/(localhost|127\.0\.0\.1)[:/])/.test(redirect)) {
      location.replace(redirect);
    }
  }

  async function load() {
    if (!request) return stop("This link is incomplete. Start again from ChatGPT.");
    try {
      const response = await fetch(`${endpoint}?request=${encodeURIComponent(request)}`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return stop(body.error_description || "This link has expired. Start again from ChatGPT.");
      const name = body.client && body.client.name ? body.client.name : "An app";
      who.textContent = `${name} wants to read your Larkin conversations. You’ll go back to ${body.client.returnsTo} after.`;
      status.hidden = true;
      form.hidden = false;
      field.focus();
    } catch {
      stop("Larkin can’t be reached. Check your connection and reload the page.");
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.hidden = true;
    connect.disabled = cancel.disabled = true;
    try {
      const { ok, body } = await send({ decision: "approve", passphrase: field.value });
      if (ok && body.redirect) return leave(body.redirect, "Connected. Going back to ChatGPT…");
      if (body.error === "wrong_passphrase" && body.attempts_left > 0) {
        error.textContent = `${body.error_description} ${body.attempts_left} ${body.attempts_left === 1 ? "try" : "tries"} left.`;
        error.hidden = false;
        field.select();
      } else {
        stop(body.error_description || "This link has expired. Start again from ChatGPT.");
      }
    } catch {
      error.textContent = "Larkin can’t be reached. Check your connection and try again.";
      error.hidden = false;
    }
    connect.disabled = cancel.disabled = false;
  });

  cancel.addEventListener("click", async () => {
    connect.disabled = cancel.disabled = true;
    try {
      const { body } = await send({ decision: "deny" });
      leave(body.redirect, "Not connected. You can close this page.");
    } catch {
      stop("Not connected. You can close this page.");
    }
  });

  load();
})();
