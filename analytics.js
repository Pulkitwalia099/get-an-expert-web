// analytics.js — funnel events + exit survey for midsesh.com (PostHog).
//
// Loaded at the END of <body> on index.html and install.html, on purpose:
// it attaches to buttons, so those buttons have to already be on the page.
// PostHog itself is STARTED earlier, in the <head> snippet. This file only
// tells PostHog when things happen.
//
// The website funnel, in order:
//   viewed home  ->  clicked get started  ->  viewed install  ->  copied mcp url
//
// Keep these event names exactly as written. Renaming one later splits its
// history in PostHog, so the funnel would look like it reset.

(function () {
  // If PostHog is blocked (ad blocker) or has not loaded, do nothing quietly.
  if (typeof posthog === "undefined") return;

  var onInstall = /install/.test(location.pathname);

  // ---- Funnel events -------------------------------------------------------

  // Page-level step. index.html fires "viewed home", install.html "viewed install".
  posthog.capture(onInstall ? "viewed install" : "viewed home");

  // One click listener handles both pages. If an element type is not on the
  // current page, its branch simply never fires.
  document.addEventListener("click", function (e) {
    // Homepage: both call-to-action buttons carry data-cta and lead to install.
    var cta = e.target.closest("[data-cta]");
    if (cta) {
      posthog.capture("clicked get started", {
        label: (cta.textContent || "").trim()
      });
      return;
    }

    // Install page: every copy button carries data-copy. The value tells us
    // which address they copied (which AI app / setup they picked).
    var copyBtn = e.target.closest("[data-copy]");
    if (copyBtn) {
      posthog.capture("copied mcp url", {
        target: copyBtn.dataset.copy || "unknown"
      });
    }
  });

  // ---- Exit survey (install page only) -------------------------------------
  // A small card that asks the one question worth knowing before a rebuild:
  // what almost stopped them. Shows once per browser, on exit intent or after
  // a long dwell. Every state is tracked, so even a dismissal is a data point.

  if (!onInstall) return;
  if (localStorage.getItem("gae_survey_seen")) return;

  var SEEN_KEY = "gae_survey_seen";
  var shown = false;

  var CHOICES = [
    "Not sure it's safe",
    "Too many steps",
    "My AI app wasn't ready",
    "Just looking"
  ];

  function injectStyle() {
    var css = [
      ".gae-survey{position:fixed;right:20px;bottom:20px;z-index:2147483000;",
      "width:min(340px,calc(100vw - 40px));background:#FBF8F1;color:#1C1A16;",
      "border:1px solid #E3DCCB;border-radius:16px;padding:20px;",
      "box-shadow:0 18px 40px -16px rgba(28,26,22,0.35);",
      "font-family:'Geist',-apple-system,system-ui,sans-serif;",
      "opacity:0;transform:translateY(16px);",
      "transition:opacity .24s cubic-bezier(0.23,1,0.32,1),transform .24s cubic-bezier(0.23,1,0.32,1);}",
      ".gae-survey.in{opacity:1;transform:translateY(0);}",
      ".gae-survey h4{margin:0 0 2px;font-size:15px;font-weight:600;}",
      ".gae-survey p{margin:0 0 14px;font-size:13.5px;color:#6B6455;line-height:1.5;}",
      ".gae-survey .gae-opts{display:flex;flex-direction:column;gap:8px;}",
      ".gae-survey button.gae-choice{text-align:left;font:inherit;font-size:13.5px;",
      "padding:10px 12px;border-radius:10px;border:1px solid #E3DCCB;background:#fff;",
      "color:#1C1A16;cursor:pointer;transition:border-color .16s cubic-bezier(0.23,1,0.32,1),transform .12s cubic-bezier(0.23,1,0.32,1);}",
      ".gae-survey button.gae-choice:active{transform:scale(0.97);}",
      ".gae-survey .gae-row{display:flex;gap:8px;margin-top:8px;}",
      ".gae-survey input.gae-text{flex:1;font:inherit;font-size:13.5px;padding:10px 12px;",
      "border-radius:10px;border:1px solid #E3DCCB;background:#fff;color:#1C1A16;min-width:0;}",
      ".gae-survey input.gae-text:focus{outline:2px solid #2F4A38;outline-offset:1px;border-color:#2F4A38;}",
      ".gae-survey button.gae-send{flex:none;font:inherit;font-size:13.5px;padding:10px 14px;",
      "border-radius:10px;border:none;background:#2F4A38;color:#F7F3E9;cursor:pointer;",
      "transition:transform .12s cubic-bezier(0.23,1,0.32,1);}",
      ".gae-survey button.gae-send:active{transform:scale(0.97);}",
      ".gae-survey .gae-x{position:absolute;top:12px;right:12px;border:none;background:none;",
      "color:#9A9384;font-size:18px;line-height:1;cursor:pointer;padding:4px;border-radius:6px;",
      "transition:transform .12s cubic-bezier(0.23,1,0.32,1);}",
      ".gae-survey .gae-x:active{transform:scale(0.9);}",
      ".gae-survey .gae-thanks{font-size:13.5px;color:#2F4A38;font-weight:500;}",
      "@media (hover:hover) and (pointer:fine){",
      ".gae-survey button.gae-choice:hover{border-color:#2F4A38;}",
      ".gae-survey button.gae-send:hover{background:#263B2D;}",
      ".gae-survey .gae-x:hover{color:#1C1A16;}}",
      "@media (prefers-reduced-motion:reduce){",
      ".gae-survey{transition:none;transform:none;}",
      ".gae-survey button:active,.gae-survey .gae-x:active{transform:none;}}"
    ].join("");
    var s = document.createElement("style");
    s.textContent = css;
    document.head.appendChild(s);
  }

  function markDone() {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch (err) {}
  }

  function buildCard(trigger) {
    var card = document.createElement("div");
    card.className = "gae-survey";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-label", "Quick question");

    var close = document.createElement("button");
    close.className = "gae-x";
    close.setAttribute("aria-label", "Close");
    close.textContent = "×";
    card.appendChild(close);

    var h = document.createElement("h4");
    h.textContent = "Before you go";
    card.appendChild(h);

    var q = document.createElement("p");
    q.textContent = "What almost stopped you from installing?";
    card.appendChild(q);

    var opts = document.createElement("div");
    opts.className = "gae-opts";
    CHOICES.forEach(function (label) {
      var b = document.createElement("button");
      b.className = "gae-choice";
      b.type = "button";
      b.textContent = label;
      b.addEventListener("click", function () { answer(label, "choice"); });
      opts.appendChild(b);
    });
    card.appendChild(opts);

    var row = document.createElement("div");
    row.className = "gae-row";
    var input = document.createElement("input");
    input.className = "gae-text";
    input.type = "text";
    input.placeholder = "Something else...";
    input.setAttribute("aria-label", "Something else");
    var send = document.createElement("button");
    send.className = "gae-send";
    send.type = "button";
    send.textContent = "Send";
    function sendText() {
      var v = input.value.trim();
      if (v) answer(v, "text");
    }
    send.addEventListener("click", sendText);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") sendText();
    });
    row.appendChild(input);
    row.appendChild(send);
    card.appendChild(row);

    function dismiss() {
      posthog.capture("survey dismissed");
      markDone();
      remove(card);
    }
    close.addEventListener("click", dismiss);

    function answer(value, kind) {
      posthog.capture("survey answered", { answer: value, kind: kind });
      markDone();
      while (card.firstChild) card.removeChild(card.firstChild);
      var t = document.createElement("div");
      t.className = "gae-thanks";
      t.textContent = "Thank you, that helps.";
      card.appendChild(t);
      setTimeout(function () { remove(card); }, 1800);
    }

    document.body.appendChild(card);
    // Force a reflow so the browser commits the starting styles, then flip the
    // class in the same tick so the entrance transition plays. This does not
    // rely on requestAnimationFrame, which pauses in backgrounded tabs.
    void card.offsetWidth;
    card.classList.add("in");
    posthog.capture("survey shown", { trigger: trigger });
  }

  function remove(card) {
    card.classList.remove("in");
    setTimeout(function () {
      if (card.parentNode) card.parentNode.removeChild(card);
    }, 260);
  }

  function trigger(reason) {
    if (shown) return;
    shown = true;
    injectStyle();
    buildCard(reason);
  }

  // Exit intent: pointer leaves through the top of the window (desktop only).
  document.addEventListener("mouseout", function (e) {
    if (!e.relatedTarget && e.clientY <= 0) trigger("exit");
  });

  // Fallback for touch / long readers: fire once after a long dwell.
  setTimeout(function () { trigger("timer"); }, 45000);
})();
