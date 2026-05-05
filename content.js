"use strict";

(() => {
  if (window.__vimkeysLoaded) return;
  window.__vimkeysLoaded = true;

  const SCROLL_STEP = 60;
  const SCROLL_HALF_PAGE_DIVISOR = 2;
  const HUD_FADE_MS = 1500;

  let mode = "normal";
  let pendingKey = "";
  let hudTimer = 0;

  // ── HUD ──

  const hud = document.createElement("div");
  hud.id = "vimkeys-hud";
  document.documentElement.appendChild(hud);

  function showHud(text) {
    hud.textContent = text;
    hud.classList.add("vimkeys-visible");
    clearTimeout(hudTimer);
    hudTimer = setTimeout(() => hud.classList.remove("vimkeys-visible"), HUD_FADE_MS);
  }

  function setMode(next) {
    mode = next;
    pendingKey = "";
    showHud("-- " + mode.toUpperCase() + " --");
  }

  // ── Scroll helpers ──

  function scrollTarget() {
    return document.scrollingElement || document.documentElement;
  }

  function scrollBy(x, y) {
    scrollTarget().scrollBy({ left: x, top: y, behavior: "auto" });
  }

  function scrollTo(x, y) {
    scrollTarget().scrollTo({ left: x, top: y, behavior: "auto" });
  }

  function halfPage() {
    return window.innerHeight / SCROLL_HALF_PAGE_DIVISOR;
  }

  // ── Editable detection ──

  function isEditable(el) {
    if (!el) return false;
    const tag = el.tagName;
    if (tag === "INPUT") {
      const type = (el.type || "").toLowerCase();
      return type === "" || type === "text" || type === "search" || type === "url"
        || type === "email" || type === "password" || type === "number" || type === "tel";
    }
    if (tag === "TEXTAREA" || tag === "SELECT") return true;
    return el.isContentEditable;
  }

  // ── Normal-mode key map ──

  const normalKeys = {
    h() { scrollBy(-SCROLL_STEP, 0); },
    j() { scrollBy(0, SCROLL_STEP); },
    k() { scrollBy(0, -SCROLL_STEP); },
    l() { scrollBy(SCROLL_STEP, 0); },
    d() { scrollBy(0, halfPage()); },
    u() { scrollBy(0, -halfPage()); },
    G() {
      const el = scrollTarget();
      scrollTo(0, el.scrollHeight);
    },
    H() { history.back(); },
    L() { history.forward(); },
    r() { location.reload(); },
    "'": () => { setMode("insert"); },
  };

  // Two-key sequences: first key → { second key → action }
  const sequences = {
    g: {
      g() { scrollTo(0, 0); },
    },
    y: {
      y() {
        navigator.clipboard.writeText(location.href).then(
          () => showHud("Yanked: " + location.href),
          () => showHud("Yank failed (no clipboard permission)")
        );
      },
    },
  };

  // ── Key handler ──

  function handleNormal(e) {
    const key = e.key;

    // Complete a pending two-key sequence
    if (pendingKey) {
      const map = sequences[pendingKey];
      pendingKey = "";
      if (map && map[key]) {
        e.preventDefault();
        map[key]();
        return;
      }
      // First key didn't lead anywhere — fall through and try as standalone
    }

    // Start a two-key sequence
    if (sequences[key] && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      pendingKey = key;
      e.preventDefault();
      return;
    }

    // Single-key actions
    const action = normalKeys[key];
    if (action) {
      e.preventDefault();
      action();
    }
  }

  function handleInsert(e) {
    if (!getIsInputTarget(e) && e.key === '"') {
      e.preventDefault();
      setMode("normal");
    }
  }

  // ── Main listener ──

  document.addEventListener("keydown", (e) => {
    // Never intercept keys with Ctrl/Alt/Meta held
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    // Never intercept inside a modifier-key event (e.g. dead keys)
    if (e.isComposing) return;

    // Auto-enter insert mode when an editable element is focused
    if (mode === "normal" && isEditable(e.target)) {
      setMode("insert");
    }

    if (mode === "normal") {
      handleNormal(e);
    } else {
      handleInsert(e);
    }
  }, true);

  // Return to normal mode when an editable loses focus
  document.addEventListener("focusout", (e) => {
    if (mode === "insert" && isEditable(e.target)) {
      setMode("normal");
    }
  }, true);

  // Initialise
  showHud("-- NORMAL --");
})();

function getIsInputTarget(event) {
  return (
    event.target !== document.body &&
    ((target) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      if (["INPUT", "TEXTAREA"].includes(target.tagName)) {
        return true;
      }
      if (target.getAttribute("contenteditable")) {
        return true;
      }
      // if (["A", "BUTTON", "DIV"].includes(target.tagName)) {
      //   return false;
      // }
      // if (target.tabIndex === -1) {
      //   return false;
      // }
      // if (target.tabIndex >= 0) {
      //   return false;
      // }
      return false;
    })(event.composedPath()[0])
  );
}
