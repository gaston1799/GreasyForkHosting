// ==UserScript==
// @name         Ko-fi Donation Bar (gaston1799)
// @namespace    https://github.com/gaston1799/GreasyForkHosting
// @version      1.0.0
// @description  Injects a live donation progress bar under the Support section on ko-fi.com/gaston1799, powered by the public ko-fi-donations feed. Shows goal progress, donor list, and an empty state until the first donation arrives.
// @author       gaston1799
// @match        https://ko-fi.com/gaston1799
// @match        https://ko-fi.com/gaston1799/*
// @icon         https://ko-fi.com/favicon.ico
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(() => {
  "use strict";

  const FEED_URL =
    "https://raw.githubusercontent.com/gaston1799/ko-fi-donations/main/donations.json";
  const PROFILE = "gaston1799";

  // ---------------------------------------------------------------------------
  // Styling — matches Ko-fi's dark navy theme by default and flips to a light
  // theme when the OS prefers it. Accent uses Ko-fi's brand red.
  // ---------------------------------------------------------------------------
  const style = document.createElement("style");
  style.textContent = `
.donation-bar--kofi {
  --kofi-bg: #22272f;
  --kofi-panel: #2b313b;
  --kofi-line: #3a414d;
  --kofi-text: #f5f5f5;
  --kofi-muted: #a3abb8;
  --kofi-accent: #ff5f5f;
  --kofi-fill-a: #ff5f5f;
  --kofi-fill-b: #ff8f5f;
  display: block;
  margin: 14px 0;
  border: 1px solid var(--kofi-line);
  border-radius: 8px;
  background: var(--kofi-panel);
  color: var(--kofi-text);
  padding: 14px 16px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.45;
  text-align: left;
}
.donation-bar--kofi * { box-sizing: border-box; }
.donation-bar--kofi a { color: var(--kofi-accent); }
.donation-bar--kofi .donation-head {
  display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 4px 12px;
}
.donation-bar--kofi h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--kofi-text); }
.donation-bar--kofi .donation-meta,
.donation-bar--kofi .donation-total { margin: 0; color: var(--kofi-muted); font-size: 12.5px; }
.donation-bar--kofi .donation-track {
  height: 12px; margin: 10px 0 6px; border-radius: 999px; background: #181c22; overflow: hidden;
}
.donation-bar--kofi .donation-fill {
  height: 100%; width: 0%; border-radius: 999px;
  background: linear-gradient(90deg, var(--kofi-fill-a), var(--kofi-fill-b));
  transition: width 0.6s ease;
}
.donation-bar--kofi .donation-list {
  display: grid; gap: 8px; margin: 12px 0 0; padding: 0; list-style: none;
}
.donation-bar--kofi .donation-list li {
  display: flex; flex-wrap: wrap; gap: 2px 10px; align-items: baseline;
  border-top: 1px solid var(--kofi-line); padding-top: 8px;
}
.donation-bar--kofi .donation-from { font-weight: 700; color: var(--kofi-text); }
.donation-bar--kofi .donation-msg { color: var(--kofi-muted); }
.donation-bar--kofi .donation-amt { color: var(--kofi-accent); font-weight: 800; white-space: nowrap; }
.donation-bar--kofi .donation-date { margin-left: auto; color: var(--kofi-muted); font-size: 11.5px; }
.donation-bar--kofi .donation-empty { margin: 4px 0 0; color: var(--kofi-muted); font-style: italic; }
@media (prefers-color-scheme: light) {
  .donation-bar--kofi {
    --kofi-bg: #f4f4f4;
    --kofi-panel: #ffffff;
    --kofi-line: #e2e5ea;
    --kofi-text: #1c1f26;
    --kofi-muted: #626a75;
  }
  .donation-bar--kofi .donation-track { background: #eceff3; }
}
`;
  document.head.appendChild(style);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const money = (amount, currency) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currency || "USD",
      }).format(Number(amount) || 0);
    } catch {
      return `${Number(amount) || 0} ${currency || "USD"}`.trim();
    }
  };

  const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };

  const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[char]));

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------
  const render = (feed) => {
    const goal = feed && feed.goal ? feed.goal : {};
    const donations = Array.isArray(feed && feed.donations) ? feed.donations : [];
    const target = Number(goal.target) || 0;
    const currency = goal.currency || "USD";
    const raised = donations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const percent = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
    const complete = target > 0 && raised >= target;
    const title = escapeHtml(goal.title || "Support the build");

    const list = donations.length
      ? `<ul class="donation-list">${donations
          .map(
            (d) => `
            <li>
              <span class="donation-from">${escapeHtml(d.from || "Anonymous")}</span>
              <span class="donation-msg">${d.message ? escapeHtml(d.message) : ""}</span>
              <span class="donation-amt">${money(d.amount, d.currency || currency)}</span>
              <span class="donation-date">${formatDate(d.date)}</span>
            </li>`,
          )
          .join("")}</ul>`
      : `<p class="donation-empty">Be the first to fuel the fund — every coffee moves the goal.</p>`;

    return `<div class="donation-bar--kofi" data-donation-bar>
      <div class="donation-head">
        <h3>${title}</h3>
        <p class="donation-meta">${money(raised, currency)} of ${money(target, currency)} raised${target ? ` · ${percent}%` : ""}</p>
      </div>
      <div class="donation-track" role="progressbar" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${raised}" aria-label="${title}">
        <div class="donation-fill" style="width: ${percent}%"></div>
      </div>
      <p class="donation-total">${percent}% complete${complete ? " · goal reached — thank you!" : ""}</p>
      ${list}
    </div>`;
  };

  const inject = (barHtml) => {
    if (document.querySelector("[data-donation-bar]")) return; // never double-inject
    const anchor = findSupportAnchor();
    if (!anchor) return;
    const bar = document.createElement("div");
    bar.innerHTML = barHtml;
    anchor.insertAdjacentElement("afterend", bar.firstElementChild);
  };

  // Find the "Support <name>" / donate section on the Ko-fi profile page.
  // Tries known containers first, then falls back to a heading whose text
  // matches "support <name>" or a donate link pointing at this profile.
  const findSupportAnchor = () => {
    const selectors = [
      `section[class*="support"]`,
      `[class*="support-panel"]`,
      `[class*="donation-panel"]`,
      `[class*="donate-panel"]`,
      `#new-donate-panel`,
      `[data-testid*="support"]`,
      `iframe[src*="ko-fi.com/${PROFILE}"]`,
      `a[href*="ko-fi.com/${PROFILE}/donate"]`,
      `a[href*="ko-fi.com/${PROFILE}"][href*="gift"]`,
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) return el.closest("div,section,aside") || el;
    }
    // Heading fallback: "Support Gaston1799" or "Donate"
    const headings = document.querySelectorAll("h1,h2,h3,h4,span,strong,[class*='title']");
    for (const heading of headings) {
      const text = (heading.textContent || "").trim().toLowerCase();
      if (text && (text.includes(`support ${PROFILE}`) || text === "support" || text.includes("donate"))) {
        const parent = heading.parentElement;
        if (parent) return parent;
      }
    }
    return null;
  };

  // ---------------------------------------------------------------------------
  // Boot: wait for the page to render (Ko-fi is client-rendered), then fetch
  // the feed and inject. Retries for up to ~10s, then gives up quietly.
  // ---------------------------------------------------------------------------
  const boot = () => {
    if (!findSupportAnchor()) {
      if (window.__kofiDonationBarRetries === undefined) window.__kofiDonationBarRetries = 0;
      if (window.__kofiDonationBarRetries++ < 20) {
        setTimeout(boot, 500);
        return;
      }
      return;
    }
    fetch(FEED_URL)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((feed) => inject(render(feed)))
      .catch((err) => console.error("[kofi-donation-bar] feed failed to load:", err));
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
