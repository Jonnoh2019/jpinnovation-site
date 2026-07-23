(() => {
  "use strict";

  const VERSION = "thread-profile-signout-fix-20260723b";
  const INACTIVE = new Set(["", "free", "pending", "rejected", "suspended", "removed"]);
  let signingOut = false;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clean = (value) => String(value || "").trim().toLowerCase();
  const esc = (value) => {
    if (typeof escapeHtml === "function") return escapeHtml(value == null ? "" : String(value));
    return String(value == null ? "" : value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));
  };

  function roleOf(user) {
    if (!user) return "client";
    const email = clean(user.email);
    const role = clean(user.account_type || user.accountType || user.role || "client");
    const membership = clean(user.membership_status || user.membershipStatus || "");
    const status = clean(user.status || "active");
    if (email === "jpinnovation.enquiries@gmail.com" || role === "admin") return status === "removed" ? "client" : "admin";
    if (role === "member" && !INACTIVE.has(membership) && status !== "removed") return "member";
    return "client";
  }

  function current() {
    try { return typeof currentUser === "function" ? currentUser() : null; } catch { return null; }
  }

  function toast(title, detail = "", error = false) {
    if (typeof showSuccessToast === "function" && !error) { showSuccessToast(title, detail); return; }
    $(".jp-thread-fix-toast")?.remove();
    const node = document.createElement("div");
    node.className = "jp-thread-fix-toast" + (error ? " is-error" : "");
    node.innerHTML = `<strong>${esc(title)}</strong>${detail ? `<span>${esc(detail)}</span>` : ""}`;
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 4200);
  }

  function initials(value) {
    const parts = String(value || "JP").trim().split(/\s+/).filter(Boolean);
    return (parts.length ? parts.slice(0, 2).map((part) => part[0]).join("") : "JP").toUpperCase();
  }

  function memberFromName(name) {
    const wanted = clean(name);
    let found = null;
    try { found = (state?.users || []).find((item) => clean(item.name || item.full_name) === wanted || clean(item.email) === wanted); } catch {}
    if (!found) { try { found = (state?.members || []).find((item) => clean(item.name || item.full_name) === wanted || clean(item.email) === wanted); } catch {} }
    if (!found) {
      const user = current();
      if (user && clean(user.name || user.full_name) === wanted) found = user;
    }
    return found || { name };
  }

  function avatar(user, className = "jp-thread-author-avatar") {
    try {
      if (typeof profileAvatarMarkup === "function") return profileAvatarMarkup(user, `${className} jp-role-avatar`);
    } catch {}
    const role = roleOf(user);
    const photo = user?.profilePhotoUrl || user?.profile_photo_url || "";
    if (photo) return `<span class="${esc(className)} jp-role-avatar role-${esc(role)} has-photo"><img src="${esc(photo)}" alt="${esc(user?.name || "Member")} profile photo"></span>`;
    return `<span class="${esc(className)} jp-role-avatar role-${esc(role)}">${esc(initials(user?.name || user?.email))}</span>`;
  }

  function roleBadge(user) {
    const role = roleOf(user);
    const label = role === "admin" ? "JP Admin" : role === "member" ? "Hub Member" : "Client Portal";
    return `<span class="jp-author-role-badge role-${esc(role)}">${esc(label)}</span>`;
  }

  function dateText(value) {
    const raw = String(value || "").trim();
    if (!raw || /today|just now/i.test(raw)) return raw || "Recently";
    const parsed = Date.parse(raw);
    if (!Number.isFinite(parsed)) return raw;
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(parsed));
  }

  function closeMenusAndUnlock() {
    try { if (typeof setMemberProfileMenuOpen === "function") setMemberProfileMenuOpen(false); } catch {}
    try { if (typeof setMobileDashboardMenuOpen === "function") setMobileDashboardMenuOpen(false); } catch {}
    const menu = $("#memberProfileMenu");
    if (menu) {
      menu.classList.remove("open", "active", "show", "visible", "is-open", "is-opening", "is-closing");
      menu.hidden = true;
      menu.setAttribute("aria-hidden", "true");
      menu.style.removeProperty("display");
      menu.style.removeProperty("pointer-events");
    }
    $("#memberProfileButton")?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("member-profile-menu-open", "jp-profile-menu-open", "jp-profile-menu-locked", "mobile-dashboard-menu-open", "profile-menu-open", "menu-scroll-locked", "jp-menu-hard-lock");
    document.documentElement.classList.remove("member-profile-menu-open", "jp-profile-menu-open", "profile-menu-open", "menu-scroll-locked", "jp-menu-hard-lock");
    [document.body, document.documentElement].forEach((node) => {
      node.style.removeProperty("overflow");
      node.style.removeProperty("pointer-events");
      node.style.removeProperty("touch-action");
    });
    $$(".profile-menu-backdrop,.member-profile-backdrop,.jp-profile-menu-backdrop,.profile-backdrop,[data-profile-backdrop]").forEach((node) => node.remove());
  }

  function signOutUrl() {
    const params = new URLSearchParams(location.search || "");
    const mode = params.get("entry") === "client" ? "client" : "hub";
    return `/hub-portal/index.html?entry=${mode}&signin=1&signedout=1&v=${VERSION}`;
  }

  async function doSignOut(button) {
    if (signingOut) return;
    signingOut = true;
    if (button) {
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
    }
    closeMenusAndUnlock();
    try {
      try { if (typeof markHubOffline === "function") await markHubOffline(); } catch (error) { console.warn(`[${VERSION}] offline mark failed`, error); }
      try { if (portalBackend?.auth?.signOut) await portalBackend.auth.signOut(); } catch (error) { console.warn(`[${VERSION}] Supabase signOut failed; continuing local sign-out`, error); }
      try { localStorage.removeItem("jpActiveHubAccess"); } catch {}
      try { sessionStorage.removeItem("jpActiveHubAccess"); } catch {}
      try {
        if (typeof state !== "undefined" && state) {
          state.sessionEmail = "";
          state.activeUserEmail = "";
          if (typeof saveState === "function") saveState();
        }
      } catch {}
      document.documentElement.classList.remove("hub-member-session", "restoring-portal-session");
      document.body.classList.remove("hub-member-session");
      $("#appShell")?.classList.add("hidden");
      $("#publicShell")?.classList.remove("hidden");
      location.replace(signOutUrl());
    } catch (error) {
      console.error(`[${VERSION}] sign out failed`, error);
      signingOut = false;
      if (button) {
        button.disabled = false;
        button.removeAttribute("aria-busy");
      }
      toast("Sign out failed.", "Please try again.", true);
    }
  }

  function signOutTarget(event) {
    const target = event.target?.closest?.("#logoutButton,.profile-menu-signout,[data-profile-action='signout'],[data-action='signout']");
    if (target) return target;
    const row = event.target?.closest?.("#memberProfileMenu .profile-menu-link");
    if (row && /sign\s*out/i.test(row.textContent || "")) return row;
    return null;
  }

  function installSignOut() {
    if (window.jpThreadFixSignOutInstalled === VERSION) return;
    window.jpThreadFixSignOutInstalled = VERSION;
    const handler = (event) => {
      const button = signOutTarget(event);
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      doSignOut(button);
    };
    window.addEventListener("pointerdown", handler, true);
    window.addEventListener("touchstart", handler, true);
    window.addEventListener("mousedown", handler, true);
    window.addEventListener("click", handler, true);
  }

  function openProfileFor(member) {
    try { if (typeof renderMemberProfile === "function") { renderMemberProfile(member); return; } } catch (error) { console.warn(`[${VERSION}] member profile open failed`, error); }
    try { if (typeof renderView === "function") renderView("directory"); } catch {}
  }

  function enhanceThreads() {
    $$(".thread-card").forEach((card) => {
      if (card.dataset.jpThreadAuthorFixed === VERSION) return;
      const title = card.querySelector(":scope > h3");
      const meta = card.querySelector(":scope > .meta-row");
      if (!title || !meta) return;
      const pills = $$(":scope > .pill", meta);
      const authorPill = pills.find((pill) => pill.classList.contains("author-reputation"));
      if (!authorPill) return;
      const datePill = pills.find((pill) => pill !== authorPill && /\d|today|just now|yesterday|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(pill.textContent || ""));
      const rawAuthor = String(authorPill.childNodes?.[0]?.textContent || authorPill.textContent || "Hub member").replace(/JP Admin|Gold Trusted|Blue Verified|Hub Member|Client Portal|Member/gi, "").trim() || "Hub member";
      const member = memberFromName(rawAuthor);
      const fullName = member.name || member.full_name || rawAuthor;
      const username = member.username || (member.email ? member.email.split("@")[0] : "");
      const editedPill = pills.find((pill) => /edited/i.test(pill.textContent || ""));
      const header = document.createElement("div");
      header.className = "jp-thread-author-panel";
      header.innerHTML = `
        <button class="jp-thread-author-avatar-link" type="button" aria-label="Open ${esc(fullName)} profile">${avatar(member)}</button>
        <div class="jp-thread-author-copy">
          <div class="jp-thread-author-name-line"><button class="jp-thread-author-name" type="button">${esc(fullName)}</button>${roleBadge(member)}${member.verified || roleOf(member) === "admin" ? `<span class="jp-author-verified" aria-label="Verified">✓</span>` : ""}</div>
          <div class="jp-thread-author-subline">${username ? `<span>@${esc(username)}</span><span>•</span>` : ""}<span>${esc(dateText(datePill?.textContent || ""))}</span>${editedPill ? `<span>•</span><span>${esc(editedPill.textContent)}</span>` : ""}</div>
        </div>`;
      header.querySelectorAll("button").forEach((button) => button.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); openProfileFor(member); }));
      title.parentNode.insertBefore(header, title);
      authorPill.remove();
      datePill?.remove();
      if (!meta.querySelector(".pill,button,a")) meta.remove();
      card.querySelector(":scope > .thread-pin-actions")?.classList.add("jp-compact-admin-actions");
      card.querySelector(":scope > .report-button")?.classList.add("jp-thread-text-action");
      card.dataset.jpThreadAuthorFixed = VERSION;
    });
    $$(".reply-form").forEach((form) => {
      const text = form.querySelector("textarea");
      const button = form.querySelector("button[type='submit']");
      if (!text || !button || form.dataset.jpReplyDisableFixed === VERSION) return;
      const sync = () => { button.disabled = !text.value.trim(); };
      text.addEventListener("input", sync);
      sync();
      form.dataset.jpReplyDisableFixed = VERSION;
    });
  }

  function enhancePhotoRemoval() {
    const manager = $(".profile-photo-manager");
    if (!manager || manager.dataset.jpRemovePhotoFixed === VERSION) return;
    const user = current();
    const hasPhoto = Boolean(user?.profilePhotoUrl || user?.profile_photo_url || user?.profilePhotoPendingUrl || user?.profile_photo_pending_url);
    if (!hasPhoto) { manager.dataset.jpRemovePhotoFixed = VERSION; return; }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary-button jp-remove-profile-photo";
    button.textContent = "Use initials instead";
    const status = manager.querySelector("#profilePhotoStatus") || manager.querySelector(".form-status");
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const active = current();
      button.disabled = true;
      if (status) status.textContent = "Removing profile photo...";
      try {
        if (portalBackend && active?.id) {
          const { error } = await portalBackend.from("profiles").update({ profile_photo_url: null, profile_photo_pending_url: null, profile_photo_status: "none", profile_photo_submitted_at: null }).eq("user_id", active.id);
          if (error) throw error;
        }
        Object.assign(active, { profilePhotoUrl: "", profile_photo_url: "", profilePhotoPendingUrl: "", profile_photo_pending_url: "", profilePhotoStatus: "none", profile_photo_status: "none" });
        try { if (typeof syncMember === "function") syncMember(active); if (typeof saveState === "function") saveState(); } catch {}
        toast("Profile photo removed.", "Your initials avatar will be shown instead.");
        if (typeof renderView === "function") renderView("profile");
      } catch (error) {
        console.error(`[${VERSION}] remove profile photo failed`, error);
        toast("Photo could not be removed.", "Please try again.", true);
        if (status) status.textContent = "Photo could not be removed. Please try again.";
        button.disabled = false;
      }
    });
    manager.querySelector(".profile-photo-upload")?.insertAdjacentElement("afterend", button);
    manager.dataset.jpRemovePhotoFixed = VERSION;
  }

  function styles() {
    if ($("#jpThreadProfileSignoutStyles")) return;
    const style = document.createElement("style");
    style.id = "jpThreadProfileSignoutStyles";
    style.textContent = `
      .jp-thread-author-panel{display:flex;align-items:center;gap:12px;margin:12px 0 14px;padding:12px;border:1px solid rgba(46,144,255,.52);border-radius:18px;background:linear-gradient(135deg,rgba(8,31,54,.9),rgba(8,13,20,.96));box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}
      .jp-thread-author-avatar-link,.jp-thread-author-name{appearance:none;border:0;background:transparent;color:inherit;padding:0;cursor:pointer}.jp-thread-author-avatar-link{flex:0 0 auto}.jp-thread-author-avatar{width:64px!important;height:64px!important}
      .jp-thread-author-copy{min-width:0;display:grid;gap:4px}.jp-thread-author-name-line{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.jp-thread-author-name{font-weight:950;font-size:clamp(18px,4.6vw,24px);line-height:1.05;text-align:left}.jp-thread-author-subline{display:flex;gap:6px;flex-wrap:wrap;color:#b7c2d1;font-size:13px;font-weight:700}
      .jp-author-role-badge{display:inline-flex;align-items:center;min-height:24px;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:950;letter-spacing:.04em;text-transform:uppercase;border:1px solid rgba(255,255,255,.25)}.jp-author-role-badge.role-admin{background:linear-gradient(135deg,#8b6514,#c89b2c 55%,#f3d36a);color:#fff;border-color:#168bff}.jp-author-role-badge.role-member{background:rgba(18,98,190,.32);color:#fff;border-color:#c89b2c}.jp-author-role-badge.role-client{background:rgba(18,98,190,.26);color:#fff;border-color:rgba(255,255,255,.55)}.jp-author-verified{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#168bff;color:#fff;font-weight:950}
      .jp-compact-admin-actions{margin-top:8px!important}.jp-compact-admin-actions .board-pin-action{min-height:34px!important;padding:7px 12px!important;font-size:13px!important}.jp-thread-text-action{margin-top:8px!important;width:auto!important;min-height:32px!important;padding:5px 10px!important;border-color:transparent!important;background:transparent!important;color:#9fb8d8!important}.jp-remove-profile-photo{margin-left:8px!important;min-height:40px!important}.reply-form button[type=submit]:disabled{opacity:.45;cursor:not-allowed}
      .jp-thread-fix-toast{position:fixed;left:50%;bottom:16px;z-index:2147483647;transform:translateX(-50%);width:min(520px,calc(100vw - 24px));display:grid;gap:3px;padding:13px 15px;border-radius:17px;border:1px solid rgba(52,211,153,.45);background:rgba(3,34,24,.96);box-shadow:0 18px 44px rgba(0,0,0,.36);color:#fff}.jp-thread-fix-toast span{color:#b7c2d1}.jp-thread-fix-toast.is-error{border-color:rgba(248,113,113,.55);background:rgba(44,8,16,.97)}
      @media(max-width:430px){.jp-thread-author-panel{gap:10px;padding:10px;border-radius:16px}.jp-thread-author-avatar{width:58px!important;height:58px!important}.jp-thread-author-name{font-size:18px}.jp-thread-author-subline{font-size:12px}.jp-remove-profile-photo{display:block;margin:8px 0 0!important;width:100%}}
    `;
    document.head.appendChild(style);
  }

  function enhance() { enhanceThreads(); enhancePhotoRemoval(); }

  function install() {
    styles();
    installSignOut();
    enhance();
    const mount = $("#viewMount");
    if (mount) new MutationObserver(() => requestAnimationFrame(enhance)).observe(mount, { childList: true, subtree: true });
    console.info(`[${VERSION}] installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true }); else install();
})();
