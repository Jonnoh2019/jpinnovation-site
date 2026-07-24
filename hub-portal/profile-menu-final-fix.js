(() => {
  "use strict";

  const VERSION = "admin-account-popover-photo-rpc-20260724d";
  if (window.__jpAdminAccountPopoverPhotoRpc === VERSION) return;
  window.__jpAdminAccountPopoverPhotoRpc = VERSION;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = (value = "") => String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;"
  })[char]);
  const clean = (value = "") => String(value || "").trim().toLowerCase();
  const stateRef = () => { try { if (typeof state !== "undefined") return state; } catch (_) {} return window.state || {}; };
  const backend = () => { try { if (typeof portalBackend !== "undefined") return portalBackend; } catch (_) {} return window.portalBackend || null; };
  const current = () => { try { if (typeof currentUser === "function") return currentUser(); } catch (_) {} return stateRef().currentUser || null; };
  const notify = (title, detail = "", error = false) => {
    const fn = error ? (window.showErrorToast || window.showSuccessToast) : window.showSuccessToast;
    if (typeof fn === "function") return fn(title, detail);
    console[error ? "warn" : "log"](`[${VERSION}] ${title}`, detail);
  };

  let serverProfiles = [];
  let activeMenu = null;
  let activeSource = null;
  const pendingStatuses = new Set(["pending", "awaiting", "awaiting_approval", "pending_approval"]);

  function normalise(row) {
    if (!row) return null;
    const email = clean(row.email || row.user_email || "");
    const id = row.id || row.user_id || row.auth_user_id || email;
    if (!id && !email) return null;
    return {
      ...row,
      id,
      user_id: row.user_id || row.auth_user_id || row.id || id,
      email,
      name: row.name || row.full_name || row.fullName || email || "Member",
      role: row.role || row.account_type || row.accountType || "client",
      profilePhotoUrl: row.profilePhotoUrl ?? row.profile_photo_url ?? "",
      profilePhotoPendingUrl: row.profilePhotoPendingUrl ?? row.profile_photo_pending_url ?? "",
      profilePhotoStatus: row.profilePhotoStatus ?? row.profile_photo_status ?? "none",
      profilePhotoSubmittedAt: row.profilePhotoSubmittedAt ?? row.profile_photo_submitted_at ?? "",
      profilePhotoReviewedAt: row.profilePhotoReviewedAt ?? row.profile_photo_reviewed_at ?? ""
    };
  }

  const keyFor = (profile) => clean(profile?.email || profile?.user_id || profile?.id || "");
  const same = (a, b) => keyFor(a) === keyFor(b) || (a?.user_id && a.user_id === b?.user_id) || (a?.id && a.id === b?.id);

  function mergeProfile(row) {
    const profile = normalise(row);
    if (!profile) return null;
    const app = stateRef();
    app.users = Array.isArray(app.users) ? app.users : [];
    app.members = Array.isArray(app.members) ? app.members : [];
    [app.users, app.members].forEach((list) => {
      const index = list.findIndex((item) => same(item, profile));
      if (index >= 0) list[index] = { ...list[index], ...profile };
      else list.push(profile);
    });
    if (app.currentUser && same(app.currentUser, profile)) app.currentUser = { ...app.currentUser, ...profile };
    try { if (typeof saveState === "function") saveState(); } catch (_) {}
    return profile;
  }

  function pendingPhotos() {
    const app = stateRef();
    const source = serverProfiles.length ? serverProfiles : [...(app.users || []), ...(app.members || [])].map(normalise).filter(Boolean);
    const map = new Map();
    source.forEach((profile) => {
      const pending = profile?.profilePhotoPendingUrl || profile?.profile_photo_pending_url || "";
      const status = String(profile?.profilePhotoStatus || profile?.profile_photo_status || "").toLowerCase();
      if (pending && pendingStatuses.has(status)) map.set(keyFor(profile), normalise(profile));
    });
    return Array.from(map.values());
  }

  function exposePending() {
    try {
      window.pendingProfilePhotos = pendingPhotos;
      if (typeof pendingProfilePhotos !== "undefined") pendingProfilePhotos = pendingPhotos;
    } catch (_) {}
  }

  async function refreshProfiles(render = false) {
    const pb = backend();
    if (!pb?.from) return false;
    try {
      const { data, error } = await pb.from("profiles").select("*").order("full_name", { ascending: true });
      if (error) throw error;
      serverProfiles = Array.isArray(data) ? data.map(normalise).filter(Boolean) : [];
      serverProfiles.forEach(mergeProfile);
      exposePending();
      try { if (typeof renderNotifications === "function") renderNotifications(); } catch (_) {}
      if (render) {
        try { if (typeof renderView === "function") renderView(stateRef().activeView || "admin"); } catch (_) {}
      }
      return true;
    } catch (error) {
      console.warn(`[${VERSION}] profile refresh failed`, error);
      return false;
    }
  }

  function missingRpc(error) {
    return /function|schema cache|not found|does not exist/i.test(error?.message || "");
  }

  async function submitPhotoForApproval(dataUrl) {
    const pb = backend();
    if (!pb?.rpc) throw new Error("Profile photo approval backend is unavailable.");
    const { data, error } = await pb.rpc("submit_profile_photo_for_approval", { p_photo_data: dataUrl });
    if (error) throw error;
    mergeProfile(data);
    await refreshProfiles(false);
  }

  async function moderatePhoto(profile, action) {
    const pb = backend();
    if (!pb?.rpc) throw new Error("Profile photo approval backend is unavailable.");
    const target = profile?.user_id || profile?.id;
    if (!target) throw new Error("Selected member is missing a user ID.");
    const { data, error } = await pb.rpc("admin_moderate_profile_photo", {
      p_target_user: target,
      p_action: action,
      p_reason: ""
    });
    if (error) throw error;
    mergeProfile(data);
    await refreshProfiles(false);
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("That photo could not be read."));
      reader.readAsDataURL(file);
    });
  }

  function installPhotoHandlers() {
    exposePending();
    document.addEventListener("change", async (event) => {
      const input = event.target;
      if (input?.id !== "profilePhotoInput") return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const file = input.files?.[0];
      if (!file) return;
      if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
        input.value = "";
        return notify("Photo not accepted.", "Please upload a PNG, JPG or WebP image.", true);
      }
      if (file.size > 2.5 * 1024 * 1024) {
        input.value = "";
        return notify("Photo is too large.", "Please upload an image under 2.5MB.", true);
      }

      input.disabled = true;
      try {
        await submitPhotoForApproval(await readFileAsDataUrl(file));
        notify("Profile photo submitted.", "Your profile photo has been submitted for approval.");
        try { if (typeof renderNotifications === "function") renderNotifications(); } catch (_) {}
        try { if (typeof renderView === "function") renderView("profile"); } catch (_) {}
      } catch (error) {
        console.error(`[${VERSION}] profile photo submit failed`, error);
        notify(
          missingRpc(error) ? "Photo approval setup is missing." : "Photo upload was not saved for approval.",
          missingRpc(error) ? "Run supabase-profile-photo-approvals.sql once in Supabase, then try again." : (error.message || "Please try again."),
          true
        );
      } finally {
        input.disabled = false;
        input.value = "";
      }
    }, true);

    document.addEventListener("click", async (event) => {
      const button = event.target.closest?.(".profile-photo-action");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const email = clean(button.dataset.email || "");
      const userId = String(button.dataset.userId || "");
      const profile = pendingPhotos().find((item) => clean(item.email) === email || String(item.user_id || item.id || "") === userId);
      if (!profile) return notify("Photo request not found.", "Refresh registrations and try again.", true);

      const action = button.dataset.photoAction === "reject" ? "reject" : "approve";
      button.disabled = true;
      try {
        await moderatePhoto(profile, action);
        notify(action === "approve" ? "Profile photo approved." : "Profile photo rejected.", "The approval queue has been updated.");
        try { if (typeof renderNotifications === "function") renderNotifications(); } catch (_) {}
        try { if (typeof renderView === "function") renderView("admin"); } catch (_) {}
      } catch (error) {
        console.error(`[${VERSION}] profile photo moderation failed`, error);
        notify(
          missingRpc(error) ? "Photo approval setup is missing." : "Photo approval failed.",
          missingRpc(error) ? "Run supabase-profile-photo-approvals.sql once in Supabase, then try again." : (error.message || "Please try again."),
          true
        );
      } finally {
        button.disabled = false;
      }
    }, true);
  }

  function closeAccountMenu() {
    if (activeMenu) activeMenu.remove();
    activeMenu = null;
    activeSource = null;
    $$(".jp-account-menu-source[aria-expanded='true'],[data-account-more][aria-expanded='true']").forEach((button) => button.setAttribute("aria-expanded", "false"));
  }

  function sourceContext(source) {
    const row = source.closest("[data-account-row],.account-management-card-final,.admin-member-row,.admin-stable-row,.feed-item");
    const actions = row ? $$(".admin-action", row).filter((button) => button.dataset.adminAction) : [];
    const profileButton = row ? $(".view-profile-button,[data-profile-member-id],[data-profile-member-email],[data-view-member]", row) : null;
    return { row, actions, profileButton };
  }

  function positionMenu(menu, source) {
    const rect = source.getBoundingClientRect();
    const margin = 10;
    const width = Math.min(288, window.innerWidth - margin * 2);
    const maxHeight = Math.max(150, window.innerHeight - margin * 2 - 12);
    Object.assign(menu.style, {
      width: `${width}px`,
      maxHeight: `${maxHeight}px`,
      left: `${Math.max(margin, Math.min(window.innerWidth - width - margin, rect.right - width))}px`,
      top: "0px",
      visibility: "hidden"
    });
    document.body.appendChild(menu);
    const height = Math.min(menu.offsetHeight || 240, maxHeight);
    const below = rect.bottom + 8;
    const above = rect.top - height - 8;
    const top = below + height + 18 > window.innerHeight && above > margin ? above : Math.min(below, window.innerHeight - height - 18);
    menu.style.top = `${Math.max(margin, top)}px`;
    menu.style.visibility = "visible";
  }

  function compactAccountMenus() {
    $$(".admin-actions,.amf-actions,.admin-stable-actions").forEach((actions) => {
      if (actions.closest(".profile-photo-admin-card") || actions.classList.contains("profile-photo-actions")) return;
      const buttons = $$(".admin-action", actions).filter((button) => button.dataset.adminAction);
      if (!buttons.length) return;
      $$(".jp-account-menu-source", actions).forEach((button) => button.remove());
      buttons.forEach((button) => {
        button.classList.add("jp-inline-admin-action-source");
        button.setAttribute("aria-hidden", "true");
        button.setAttribute("tabindex", "-1");
      });
      actions.dataset.jpPopoverReady = VERSION;
      actions.insertAdjacentHTML("afterbegin", `<button class="secondary-button jp-account-menu-source" type="button" aria-haspopup="menu" aria-expanded="false">Manage</button>`);
    });
  }

  function installAccountPopover() {
    document.addEventListener("click", (event) => {
      const item = event.target.closest?.(".jp-account-popover-action");
      if (item) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        const ctx = activeSource ? sourceContext(activeSource) : { actions: [], profileButton: null };
        const action = item.dataset.adminAction || "";
        const sourceButton = ctx.actions.find((button) => button.dataset.adminAction === action && clean(button.dataset.email || "") === clean(item.dataset.email || ""));
        closeAccountMenu();
        if (action === "view-profile" && ctx.profileButton) ctx.profileButton.click();
        else sourceButton?.click();
        return;
      }

      const source = event.target.closest?.(".jp-account-menu-source,[data-account-more]");
      if (!source) {
        if (!event.target.closest?.(".jp-account-actions-popover")) closeAccountMenu();
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const ctx = sourceContext(source);
      if (!ctx.actions.length && !ctx.profileButton) return;
      closeAccountMenu();
      activeSource = source;
      source.setAttribute("aria-expanded", "true");
      const items = [];
      if (ctx.profileButton) items.push(`<button type="button" role="menuitem" class="jp-account-popover-action" data-admin-action="view-profile" data-email="${esc(ctx.profileButton.dataset.profileMemberEmail || "")}">View profile</button>`);
      ctx.actions.forEach((button) => {
        const action = button.dataset.adminAction || "";
        const danger = button.classList.contains("danger-action") || ["remove", "suspend"].includes(action);
        const primary = button.classList.contains("primary-button") || ["upgrade", "verify", "restore"].includes(action);
        const label = String(button.textContent || "").trim() || action || "Action";
        items.push(`<button type="button" role="menuitem" class="jp-account-popover-action ${danger ? "danger" : primary ? "primary" : ""}" data-admin-action="${esc(action)}" data-email="${esc(button.dataset.email || "")}">${esc(label)}</button>`);
      });
      const menu = document.createElement("div");
      menu.className = "jp-account-actions-popover";
      menu.setAttribute("role", "menu");
      menu.innerHTML = items.join("");
      activeMenu = menu;
      positionMenu(menu, source);
    }, true);
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeAccountMenu(); }, true);
    window.addEventListener("scroll", closeAccountMenu, true);
    window.addEventListener("resize", closeAccountMenu);
  }

  function addStyles() {
    if ($("#jpAdminAccountPopoverPhotoRpcStyles")) return;
    const style = document.createElement("style");
    style.id = "jpAdminAccountPopoverPhotoRpcStyles";
    style.textContent = `
      .jp-inline-admin-action-source{display:none!important}
      .admin-actions:has(.jp-account-menu-source),.amf-actions:has(.jp-account-menu-source),.admin-stable-actions:has(.jp-account-menu-source){display:flex!important;justify-content:flex-end!important;gap:0!important;overflow:visible!important;min-height:0!important}
      .jp-account-menu-source{min-height:38px!important;padding:8px 14px!important;border-radius:14px!important;white-space:nowrap!important}
      .jp-account-actions-popover{position:fixed;z-index:2147483600;display:grid;gap:6px;padding:8px;border-radius:18px;border:1px solid rgba(74,144,255,.45);background:linear-gradient(145deg,rgba(10,18,28,.985),rgba(4,8,13,.985));box-shadow:0 22px 70px rgba(0,0,0,.6);backdrop-filter:blur(18px);box-sizing:border-box;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
      .jp-account-actions-popover button{width:100%;min-height:42px;border:1px solid rgba(255,255,255,.12);border-radius:13px;background:rgba(255,255,255,.055);color:#eef5ff;font:inherit;font-weight:850;text-align:left;padding:9px 11px}
      .jp-account-actions-popover button.primary{background:linear-gradient(135deg,#075ee8,#0088ff);border-color:rgba(80,170,255,.7);color:#fff}
      .jp-account-actions-popover button.danger{color:#fecdd3;border-color:rgba(251,113,133,.42);background:rgba(127,29,29,.2)}
      .admin-member-row,.account-management-card-final,.admin-stable-row{overflow:visible!important}
    `;
    document.head.appendChild(style);
  }

  function start() {
    addStyles();
    installPhotoHandlers();
    installAccountPopover();
    compactAccountMenus();
    refreshProfiles(false);
    new MutationObserver(() => { compactAccountMenus(); exposePending(); }).observe(document.body, { childList: true, subtree: true });
    window.jpProfilePhotoRpcWorkflow = { version: VERSION, refreshProfiles, pendingPhotos, submitPhotoForApproval, moderatePhoto };
    console.info(`[${VERSION}] installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
