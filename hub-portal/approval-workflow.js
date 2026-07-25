(() => {
  "use strict";

  const VERSION = "approval-workflow-20260725b";
  if (window.__jpApprovalWorkflow === VERSION) return;
  window.__jpApprovalWorkflow = VERSION;

  const clean = (value = "") => String(value || "").trim().toLowerCase();
  const $ = (selector, root = document) => root.querySelector(selector);
  const pendingStatuses = new Set(["pending", "awaiting", "awaiting_approval", "pending_approval"]);
  let serverProfiles = [];
  let serverPhotoApprovals = [];
  let busyPhotoAction = false;

  const appState = () => {
    try { if (typeof state !== "undefined") return state; } catch (_) {}
    return window.state || {};
  };

  const backend = () => {
    try { if (typeof portalBackend !== "undefined") return portalBackend; } catch (_) {}
    return window.portalBackend || null;
  };

  const toast = (title, detail = "", isError = false) => {
    const fn = isError ? (window.showErrorToast || window.showSuccessToast) : window.showSuccessToast;
    if (typeof fn === "function") return fn(title, detail);
    console[isError ? "warn" : "log"](`[${VERSION}] ${title}`, detail);
  };

  const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));
  const withTimeout = (promise, ms, label) => Promise.race([
    promise,
    sleep(ms).then(() => { throw new Error(label || "The request timed out. Please try again."); })
  ]);

  function closeTransientUi() {
    const body = document.body;
    const root = document.documentElement;
    ["overflow", "pointerEvents", "touchAction"].forEach((prop) => {
      body.style[prop] = "";
      root.style[prop] = "";
    });
    [
      "member-profile-menu-open",
      "mobile-dashboard-menu-open",
      "jp-menu-hard-lock",
      "jp-profile-menu-open",
      "jp-profile-nav-lock",
      "jp-profile-regression-lock",
      "profile-menu-open"
    ].forEach((name) => body.classList.remove(name));

    $("#appShell")?.classList.remove("mobile-menu-open");
    $("#dashboardSidebar")?.classList.remove("open");
    $("#mobileMenuBackdrop")?.classList.remove("open");
    $("#mobileMenuButton")?.setAttribute("aria-expanded", "false");

    $("#memberProfileMenu")?.classList.remove("open", "is-opening", "is-closing");
    $("#memberProfileMenu")?.setAttribute("aria-hidden", "true");
    $("#memberProfileButton")?.setAttribute("aria-expanded", "false");

    $("#notificationPopover")?.classList.remove("open");
    $("#notificationPopover")?.setAttribute("aria-hidden", "true");
    $("#topNotificationBell")?.setAttribute("aria-expanded", "false");

    document.querySelectorAll(".jp-account-actions-popover,.profile-menu-backdrop,.member-profile-backdrop,.notification-backdrop,.jp-stale-overlay").forEach((node) => node.remove());
  }

  function safeRenderView(view, targetId = "") {
    closeTransientUi();
    try {
      if (typeof renderView === "function") renderView(view || "notifications");
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      if (targetId) {
        window.requestAnimationFrame(() => {
          const target = document.getElementById(targetId);
          if (!target) return;
          if (target.matches("details")) target.open = true;
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    } catch (error) {
      console.error(`[${VERSION}] navigation failed`, error);
      toast("That section could not be opened.", "Please try again.", true);
    } finally {
      window.setTimeout(closeTransientUi, 80);
    }
  }

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
  const sameProfile = (a, b) => keyFor(a) === keyFor(b) || (a?.user_id && a.user_id === b?.user_id) || (a?.id && a.id === b?.id);

  function mergeProfile(row) {
    const profile = normalise(row);
    if (!profile) return null;
    const s = appState();
    s.users = Array.isArray(s.users) ? s.users : [];
    s.members = Array.isArray(s.members) ? s.members : [];
    [s.users, s.members].forEach((list) => {
      const index = list.findIndex((item) => sameProfile(item, profile));
      if (index >= 0) list[index] = { ...list[index], ...profile };
      else list.push(profile);
    });
    if (s.currentUser && sameProfile(s.currentUser, profile)) s.currentUser = { ...s.currentUser, ...profile };
    try { if (typeof saveState === "function") saveState(); } catch (_) {}
    return profile;
  }

  function pendingPhotos() {
    const s = appState();
    const source = serverPhotoApprovals.length ? serverPhotoApprovals : (serverProfiles.length ? serverProfiles : [...(s.users || []), ...(s.members || [])].map(normalise).filter(Boolean));
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

  async function refreshPhotoApprovals() {
    const pb = backend();
    if (!pb?.rpc) return false;
    try {
      const { data, error } = await pb.rpc("admin_list_profile_photo_approvals");
      if (error) throw error;
      serverPhotoApprovals = Array.isArray(data) ? data.map(normalise).filter(Boolean) : [];
      serverPhotoApprovals.forEach(mergeProfile);
      exposePending();
      return true;
    } catch (error) {
      serverPhotoApprovals = [];
      if (!/Admin access required/i.test(error?.message || "")) console.warn(`[${VERSION}] approval queue refresh failed`, error);
      exposePending();
      return false;
    }
  }

  async function refreshProfiles(render = false) {
    const pb = backend();
    try {
      if (pb?.from) {
        const { data, error } = await pb.from("profiles").select("*").order("full_name", { ascending: true });
        if (error) throw error;
        serverProfiles = Array.isArray(data) ? data.map(normalise).filter(Boolean) : [];
        serverProfiles.forEach(mergeProfile);
      }
    } catch (error) {
      console.warn(`[${VERSION}] profile refresh failed`, error);
    }
    await refreshPhotoApprovals();
    try { if (typeof renderNotifications === "function") renderNotifications(); } catch (_) {}
    if (render) safeRenderView(appState().activeView || "admin");
  }

  function missingRpc(error) {
    return /function|schema cache|not found|does not exist/i.test(error?.message || "");
  }

  async function submitPhotoForApproval(dataUrl) {
    const pb = backend();
    if (!pb?.rpc) throw new Error("Profile photo approval backend is unavailable.");
    const { data, error } = await withTimeout(
      pb.rpc("submit_profile_photo_for_approval", { p_photo_data: dataUrl }),
      20000,
      "Photo upload timed out."
    );
    if (error) throw error;
    mergeProfile(data);
    await refreshProfiles(false);
  }

  async function moderatePhoto(profile, action) {
    const pb = backend();
    if (!pb?.rpc) throw new Error("Profile photo approval backend is unavailable.");
    const target = profile?.user_id || profile?.id;
    if (!target) throw new Error("Selected member is missing a user ID.");
    const { data, error } = await withTimeout(
      pb.rpc("admin_moderate_profile_photo", {
        p_target_user: target,
        p_action: action,
        p_reason: ""
      }),
      20000,
      "Photo approval timed out."
    );
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

  document.addEventListener("change", async (event) => {
    const input = event.target;
    if (input?.id !== "profilePhotoInput") return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    closeTransientUi();

    const file = input.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
      input.value = "";
      return toast("Photo not accepted.", "Please upload a PNG, JPG or WebP image.", true);
    }
    if (file.size > 2.5 * 1024 * 1024) {
      input.value = "";
      return toast("Photo is too large.", "Please upload an image under 2.5MB.", true);
    }

    input.disabled = true;
    try {
      await submitPhotoForApproval(await readFileAsDataUrl(file));
      toast("Profile photo submitted.", "Your profile photo has been submitted for approval.");
      safeRenderView("profile");
    } catch (error) {
      console.error(`[${VERSION}] profile photo submit failed`, error);
      toast(
        missingRpc(error) ? "Photo approval setup is missing." : "Photo upload was not saved for approval.",
        missingRpc(error) ? "Run supabase-profile-photo-approvals.sql once in Supabase, then try again." : (error.message || "Please try again."),
        true
      );
      closeTransientUi();
    } finally {
      input.disabled = false;
      input.value = "";
      window.setTimeout(closeTransientUi, 80);
    }
  }, true);

  document.addEventListener("click", async (event) => {
    const button = event.target.closest?.(".profile-photo-action");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    if (busyPhotoAction) return;
    busyPhotoAction = true;
    closeTransientUi();

    button.disabled = true;
    const email = clean(button.dataset.email || "");
    const userId = String(button.dataset.userId || "");
    try {
      await refreshPhotoApprovals();
      const profile = pendingPhotos().find((item) => clean(item.email) === email || String(item.user_id || item.id || "") === userId);
      if (!profile) {
        toast("Photo request not found.", "The approval queue has refreshed. Please check the admin section again.", true);
        return safeRenderView("admin", "adminProfilePhotos");
      }

      const action = button.dataset.photoAction === "reject" ? "reject" : "approve";
      await moderatePhoto(profile, action);
      toast(action === "approve" ? "Profile photo approved." : "Profile photo rejected.", "The approval queue has been updated.");
      safeRenderView("admin", "adminProfilePhotos");
    } catch (error) {
      console.error(`[${VERSION}] profile photo moderation failed`, error);
      toast(
        missingRpc(error) ? "Photo approval setup is missing." : "Photo approval failed.",
        missingRpc(error) ? "Run supabase-profile-photo-approvals.sql once in Supabase, then try again." : (error.message || "Please try again."),
        true
      );
      closeTransientUi();
    } finally {
      button.disabled = false;
      busyPhotoAction = false;
      window.setTimeout(closeTransientUi, 80);
    }
  }, true);

  document.addEventListener("click", (event) => {
    const shortcut = event.target.closest?.("#notificationPopover .notification-shortcut");
    if (!shortcut) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const text = String(shortcut.textContent || "").toLowerCase();
    const fallbackView = text.includes("photo") || text.includes("approval") || text.includes("registration") ? "admin" : "notifications";
    const view = shortcut.dataset.viewLink || shortcut.dataset.view || fallbackView;
    safeRenderView(view, shortcut.dataset.targetId || (view === "admin" ? "adminProfilePhotos" : ""));
  }, true);

  window.addEventListener("click", (event) => {
    const target = event.target;
    const topBell = target.closest?.("#topNotificationBell");
    const closeButton = target.closest?.("#closeNotifications");
    const shortcut = target.closest?.("#notificationPopover .notification-shortcut");
    if (!topBell && !closeButton && !shortcut) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (topBell) {
      const willOpen = !$("#notificationPopover")?.classList.contains("open");
      closeTransientUi();
      try { if (typeof renderNotifications === "function") renderNotifications(); } catch (error) { console.warn(`[${VERSION}] notification render failed`, error); }
      const popover = $("#notificationPopover");
      const bell = $("#topNotificationBell");
      if (popover) {
        popover.classList.toggle("open", willOpen);
        popover.setAttribute("aria-hidden", willOpen ? "false" : "true");
      }
      bell?.setAttribute("aria-expanded", willOpen ? "true" : "false");
      return;
    }

    if (closeButton) {
      $("#notificationPopover")?.classList.remove("open");
      $("#notificationPopover")?.setAttribute("aria-hidden", "true");
      $("#topNotificationBell")?.setAttribute("aria-expanded", "false");
      closeTransientUi();
      return;
    }

    if (shortcut) {
      const postId = shortcut.dataset.postId || "";
      const replyId = shortcut.dataset.replyId || "";
      const targetId = shortcut.dataset.targetId || "";
      if (postId && typeof openBoardNotification === "function") {
        closeTransientUi();
        try { openBoardNotification(postId, replyId); }
        catch (error) {
          console.error(`[${VERSION}] board notification failed`, error);
          safeRenderView("boards");
        } finally {
          window.setTimeout(closeTransientUi, 50);
        }
        return;
      }
      const text = String(shortcut.textContent || "").toLowerCase();
      const fallbackView = text.includes("photo") || text.includes("approval") || text.includes("registration") ? "admin" : "notifications";
      safeRenderView(shortcut.dataset.viewLink || fallbackView, targetId || (fallbackView === "admin" ? "adminProfilePhotos" : ""));
    }
  }, true);

  function addStyles() {
    if ($("#jpApprovalWorkflowStyles")) return;
    const style = document.createElement("style");
    style.id = "jpApprovalWorkflowStyles";
    style.textContent = `
      .workspace-header-actions{align-items:center!important}
      #mobileMenuButton.mobile-dashboard-menu,#dashboardHomeButton.header-icon-button{box-sizing:border-box!important;align-self:center!important}
      #dashboardHomeButton.header-icon-button{aspect-ratio:1/1!important;padding:0!important;display:grid!important;place-items:center!important}
      @media(max-width:760px){
        #mobileMenuButton.mobile-dashboard-menu{height:56px!important;min-height:56px!important;max-height:56px!important;border-radius:18px!important;padding:0 16px!important}
        #dashboardHomeButton.header-icon-button{width:56px!important;height:56px!important;min-width:56px!important;max-width:56px!important;min-height:56px!important;max-height:56px!important;border-radius:18px!important}
        .account-control-cluster{min-height:56px!important}
      }
      @media(min-width:761px){
        #mobileMenuButton.mobile-dashboard-menu{height:48px!important;min-height:48px!important;max-height:48px!important}
        #dashboardHomeButton.header-icon-button{width:48px!important;height:48px!important;min-width:48px!important;max-width:48px!important;min-height:48px!important;max-height:48px!important}
      }
    `;
    document.head.appendChild(style);
  }

  addStyles();
  exposePending();
  refreshProfiles(false);
  window.jpApprovalWorkflow = { version: VERSION, closeTransientUi, refreshProfiles, refreshPhotoApprovals, pendingPhotos, submitPhotoForApproval, moderatePhoto };
  console.info(`[${VERSION}] installed`);
})();
