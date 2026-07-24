(() => {
  "use strict";

  const VERSION = "admin-account-popover-photo-bridge-20260724a";
  if (window.__jpAdminAccountPopoverPhotoBridge === VERSION) return;
  window.__jpAdminAccountPopoverPhotoBridge = VERSION;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = (value = "") => String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;"
  })[char]);
  const clean = (value = "") => String(value || "").trim().toLowerCase();
  const appState = () => { try { if (typeof state !== "undefined") return state; } catch (_) {} return window.state || {}; };
  const backend = () => { try { if (typeof portalBackend !== "undefined") return portalBackend; } catch (_) {} return window.portalBackend || null; };
  const current = () => { try { if (typeof currentUser === "function") return currentUser(); } catch (_) {} return appState().currentUser || null; };
  const toast = (title, detail = "", isError = false) => {
    const fn = isError ? (window.showErrorToast || window.showSuccessToast) : window.showSuccessToast;
    if (typeof fn === "function") return fn(title, detail);
    console[isError ? "warn" : "log"](`[${VERSION}] ${title}`, detail);
  };

  function normalise(raw) {
    if (!raw) return null;
    const email = clean(raw.email || raw.user_email || "");
    const id = raw.id || raw.user_id || raw.auth_user_id || email;
    if (!id && !email) return null;
    const name = raw.name || raw.full_name || raw.fullName || email || "Member";
    return {
      ...raw,
      id,
      user_id: raw.user_id || raw.auth_user_id || raw.id || id,
      email,
      name,
      profilePhotoUrl: raw.profilePhotoUrl || raw.profile_photo_url || "",
      profilePhotoPendingUrl: raw.profilePhotoPendingUrl || raw.profile_photo_pending_url || "",
      profilePhotoStatus: raw.profilePhotoStatus || raw.profile_photo_status || "",
      profilePhotoSubmittedAt: raw.profilePhotoSubmittedAt || raw.profile_photo_submitted_at || ""
    };
  }

  const profileKey = (profile) => clean(profile?.email || profile?.id || profile?.user_id || "");

  function mergeProfile(profile) {
    const app = appState();
    if (!app || !profile) return;
    app.users = Array.isArray(app.users) ? app.users : [];
    app.members = Array.isArray(app.members) ? app.members : [];
    const key = profileKey(profile);
    const same = (item) => profileKey(item) === key || (profile.user_id && item?.user_id === profile.user_id) || (profile.id && item?.id === profile.id);
    [app.users, app.members].forEach((list) => {
      const index = list.findIndex(same);
      if (index >= 0) list[index] = { ...list[index], ...profile };
      else list.push(profile);
    });
    if (app.currentUser && same(app.currentUser)) app.currentUser = { ...app.currentUser, ...profile };
    try { if (typeof saveState === "function") saveState(); } catch (_) {}
  }

  function allProfiles() {
    const map = new Map();
    const add = (raw) => {
      const profile = normalise(raw);
      if (!profile) return;
      const key = profileKey(profile);
      if (!key) return;
      const existing = map.get(key) || {};
      map.set(key, {
        ...existing,
        ...profile,
        profilePhotoUrl: profile.profilePhotoUrl || existing.profilePhotoUrl || "",
        profilePhotoPendingUrl: profile.profilePhotoPendingUrl || existing.profilePhotoPendingUrl || ""
      });
    };
    try { if (Array.isArray(secureAdminProfiles)) secureAdminProfiles.forEach((row) => add(typeof secureProfileUser === "function" ? secureProfileUser(row) : row)); } catch (_) {}
    const app = appState();
    (app.users || []).forEach(add);
    (app.members || []).forEach(add);
    const me = current();
    if (me) add(me);
    return Array.from(map.values());
  }

  function pendingPhotos() {
    const map = new Map();
    allProfiles().forEach((profile) => {
      const status = String(profile.profilePhotoStatus || profile.profile_photo_status || "").toLowerCase();
      const pending = profile.profilePhotoPendingUrl || profile.profile_photo_pending_url || "";
      if (pending && status === "pending") map.set(profileKey(profile), profile);
    });
    return Array.from(map.values());
  }

  async function refreshProfiles() {
    const pb = backend();
    if (!pb?.from) return false;
    try {
      const { data, error } = await pb.from("profiles").select("*").order("full_name", { ascending: true });
      if (error) throw error;
      if (Array.isArray(data)) data.forEach((row) => mergeProfile(normalise(row)));
      try { if (typeof renderNotifications === "function") renderNotifications(); } catch (_) {}
      return true;
    } catch (error) {
      console.warn(`[${VERSION}] profile refresh skipped`, error);
      return false;
    }
  }

  async function updatePhotoRecord(profile, action) {
    const pb = backend();
    if (!pb?.from) throw new Error("Secure profile backend is unavailable.");
    const pending = profile.profilePhotoPendingUrl || profile.profile_photo_pending_url || "";
    const changes = action === "approve"
      ? { profile_photo_url: pending, profile_photo_pending_url: null, profile_photo_status: "approved", profile_photo_reviewed_at: new Date().toISOString() }
      : { profile_photo_pending_url: null, profile_photo_status: profile.profilePhotoUrl || profile.profile_photo_url ? "approved" : "rejected", profile_photo_reviewed_at: new Date().toISOString() };
    let query = pb.from("profiles").update(changes);
    query = profile.user_id || profile.id ? query.eq("user_id", profile.user_id || profile.id) : query.eq("email", profile.email);
    const { error } = await query;
    if (error) throw error;
    mergeProfile(normalise({ ...profile, ...changes }));
    await refreshProfiles();
  }

  function installPhotoBridge() {
    try { window.pendingProfilePhotos = pendingPhotos; if (typeof pendingProfilePhotos !== "undefined") pendingProfilePhotos = pendingPhotos; } catch (_) {}
    document.addEventListener("click", async (event) => {
      const button = event.target.closest?.(".profile-photo-action");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const profile = pendingPhotos().find((item) => clean(item.email) === clean(button.dataset.email || ""));
      if (!profile) return toast("Photo request not found.", "Refresh registrations and try again.", true);
      button.disabled = true;
      try {
        await updatePhotoRecord(profile, button.dataset.photoAction === "approve" ? "approve" : "reject");
        toast(button.dataset.photoAction === "approve" ? "Profile photo approved." : "Profile photo rejected.", "The member record has been updated.");
        try { renderNotifications(); renderView("admin"); } catch (_) {}
      } catch (error) {
        console.error(`[${VERSION}] photo approval failed`, error);
        toast("Photo approval failed.", error.message || "Please try again.", true);
      } finally {
        button.disabled = false;
      }
    }, true);
    document.addEventListener("change", async (event) => {
      const input = event.target;
      if (input?.id !== "profilePhotoInput") return;
      const file = input.files?.[0];
      const user = current();
      const pb = backend();
      if (!file || !user?.id || !pb?.from) return;
      if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) return toast("Photo not accepted.", "Please upload a PNG, JPG or WebP image.", true);
      if (file.size > 2.5 * 1024 * 1024) return toast("Photo is too large.", "Please upload an image under 2.5MB.", true);
      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("That photo could not be read."));
          reader.readAsDataURL(file);
        });
        const changes = { profile_photo_pending_url: dataUrl, profile_photo_status: "pending", profile_photo_submitted_at: new Date().toISOString() };
        const { error } = await pb.from("profiles").update(changes).eq("user_id", user.id);
        if (error) throw error;
        mergeProfile(normalise({ ...user, ...changes }));
        await refreshProfiles();
        toast("Profile photo submitted.", "Your profile photo has been submitted for approval.");
        try { renderNotifications(); renderView("profile"); } catch (_) {}
      } catch (error) {
        input.value = "";
        console.error(`[${VERSION}] photo upload failed`, error);
        toast("Photo upload was not saved for approval.", "The live approval queue could not be updated. Please try again.", true);
      }
    }, true);
  }

  let activeMenu = null;
  function closeMenu() {
    if (activeMenu) activeMenu.remove();
    activeMenu = null;
    $$(".jp-account-menu-source[aria-expanded='true'],[data-account-more][aria-expanded='true']").forEach((button) => button.setAttribute("aria-expanded", "false"));
  }
  function placeMenu(menu, source) {
    const rect = source.getBoundingClientRect();
    const margin = 10;
    const width = Math.min(280, window.innerWidth - margin * 2);
    menu.style.width = `${width}px`;
    menu.style.left = `${Math.max(margin, Math.min(window.innerWidth - width - margin, rect.right - width))}px`;
    menu.style.top = "0px";
    menu.style.visibility = "hidden";
    document.body.appendChild(menu);
    const height = menu.offsetHeight || 240;
    const below = rect.bottom + 8;
    const above = rect.top - height - 8;
    const useAbove = below + height + 18 > window.innerHeight && above > margin;
    menu.style.top = `${Math.max(margin, useAbove ? above : Math.min(below, window.innerHeight - height - 18))}px`;
    menu.style.visibility = "visible";
  }
  function compactAccountMenus() {
    $$(".admin-actions,.amf-actions,.admin-stable-actions").forEach((actions) => {
      if (actions.closest(".profile-photo-admin-card") || actions.dataset.jpPopoverReady === VERSION) return;
      const buttons = $$(".admin-action", actions).filter((button) => button.dataset.adminAction);
      if (!buttons.length) return;
      actions.dataset.jpPopoverReady = VERSION;
      buttons.forEach((button) => {
        button.classList.add("jp-inline-admin-action-source");
        button.setAttribute("aria-hidden", "true");
        button.setAttribute("tabindex", "-1");
      });
      actions.insertAdjacentHTML("afterbegin", `<button class="secondary-button jp-account-menu-source" type="button" aria-haspopup="menu" aria-expanded="false">Manage</button>`);
    });
  }
  function installAccountPopover() {
    document.addEventListener("click", (event) => {
      const popAction = event.target.closest?.(".jp-account-popover-action");
      if (popAction) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        const sourceButton = $(`.jp-inline-admin-action-source[data-admin-action="${CSS.escape(popAction.dataset.adminAction || "")}"][data-email="${CSS.escape(popAction.dataset.email || "")}"]`);
        closeMenu();
        sourceButton?.click();
        return;
      }
      const source = event.target.closest?.(".jp-account-menu-source,[data-account-more]");
      if (!source) {
        if (!event.target.closest?.(".jp-account-actions-popover")) closeMenu();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const row = source.closest("[data-account-row],.account-management-card-final,.admin-member-row,.admin-stable-row,.feed-item");
      const inlineActions = row ? $$(".admin-action", row).filter((button) => button.dataset.adminAction) : [];
      if (!inlineActions.length) return;
      closeMenu();
      source.setAttribute("aria-expanded", "true");
      const menu = document.createElement("div");
      menu.className = "jp-account-actions-popover";
      menu.setAttribute("role", "menu");
      menu.innerHTML = inlineActions.map((button) => {
        const action = button.dataset.adminAction || "";
        const danger = button.classList.contains("danger-action") || ["remove", "suspend"].includes(action);
        const primary = button.classList.contains("primary-button");
        const label = String(button.textContent || "").trim() || action || "Action";
        return `<button type="button" role="menuitem" class="jp-account-popover-action ${danger ? "danger" : primary ? "primary" : ""}" data-admin-action="${esc(action)}" data-email="${esc(button.dataset.email || "")}">${esc(label)}</button>`;
      }).join("");
      activeMenu = menu;
      placeMenu(menu, source);
    }, true);
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(); }, true);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
  }

  function addStyles() {
    if ($("#jpAdminAccountPopoverPhotoBridgeStyles")) return;
    const style = document.createElement("style");
    style.id = "jpAdminAccountPopoverPhotoBridgeStyles";
    style.textContent = `
      .jp-inline-admin-action-source{display:none!important}
      .admin-actions:has(.jp-account-menu-source),.amf-actions:has(.jp-account-menu-source),.admin-stable-actions:has(.jp-account-menu-source){display:flex!important;justify-content:flex-end!important;gap:0!important;overflow:visible!important}
      .jp-account-menu-source{min-height:40px!important;padding:8px 14px!important;border-radius:14px!important}
      .jp-account-actions-popover{position:fixed;z-index:2147483600;display:grid;gap:6px;padding:8px;border-radius:18px;border:1px solid rgba(74,144,255,.42);background:linear-gradient(145deg,rgba(10,18,28,.98),rgba(4,8,13,.98));box-shadow:0 22px 70px rgba(0,0,0,.55);backdrop-filter:blur(18px);box-sizing:border-box}
      .jp-account-actions-popover button{width:100%;min-height:42px;border:1px solid rgba(255,255,255,.12);border-radius:13px;background:rgba(255,255,255,.055);color:#eef5ff;font:inherit;font-weight:850;text-align:left;padding:9px 11px}
      .jp-account-actions-popover button.primary{background:linear-gradient(135deg,#075ee8,#0088ff);border-color:rgba(80,170,255,.7);color:#fff}
      .jp-account-actions-popover button.danger{color:#fecdd3;border-color:rgba(251,113,133,.42);background:rgba(127,29,29,.2)}
      .admin-member-row,.account-management-card-final,.admin-stable-row{overflow:visible!important}
    `;
    document.head.appendChild(style);
  }

  function start() {
    addStyles();
    installPhotoBridge();
    installAccountPopover();
    compactAccountMenus();
    refreshProfiles();
    new MutationObserver(() => compactAccountMenus()).observe(document.body, { childList: true, subtree: true });
    window.jpAdminAccountPopoverPhotoBridge = { version: VERSION, refreshProfiles, pendingPhotos };
    console.info(`[${VERSION}] installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();