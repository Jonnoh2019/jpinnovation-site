(() => {
  "use strict";

  const VERSION = "profile-photo-rpc-workflow-20260724a";
  if (window.__jpProfilePhotoRpcWorkflow === VERSION) return;
  window.__jpProfilePhotoRpcWorkflow = VERSION;

  const clean = (value = "") => String(value || "").trim().toLowerCase();
  const appState = () => { try { if (typeof state !== "undefined") return state; } catch (_) {} return window.state || {}; };
  const backend = () => { try { if (typeof portalBackend !== "undefined") return portalBackend; } catch (_) {} return window.portalBackend || null; };
  const current = () => { try { if (typeof currentUser === "function") return currentUser(); } catch (_) {} return appState().currentUser || null; };
  const toast = (title, detail = "", isError = false) => {
    const fn = isError ? (window.showErrorToast || window.showSuccessToast) : window.showSuccessToast;
    if (typeof fn === "function") return fn(title, detail);
    console[isError ? "warn" : "log"](`[${VERSION}] ${title}`, detail);
  };

  let serverProfiles = [];
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
    const app = appState();
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
    const source = serverProfiles.length ? serverProfiles : [
      ...(appState().users || []),
      ...(appState().members || [])
    ].map(normalise).filter(Boolean);
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

  async function refreshProfiles({ render = false } = {}) {
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
        try { if (typeof renderView === "function") renderView(appState().activeView || "admin"); } catch (_) {}
      }
      return true;
    } catch (error) {
      console.warn(`[${VERSION}] profile refresh failed`, error);
      return false;
    }
  }

  async function submitPhoto(dataUrl) {
    const pb = backend();
    if (!pb?.rpc) throw new Error("Profile photo approval backend is unavailable.");
    const { data, error } = await pb.rpc("submit_profile_photo_for_approval", { p_photo_data: dataUrl });
    if (error) throw error;
    mergeProfile(data);
    await refreshProfiles({ render: false });
    return data;
  }

  async function moderatePhoto(profile, action) {
    const pb = backend();
    if (!pb?.rpc) throw new Error("Profile photo approval backend is unavailable.");
    const target = profile?.user_id || profile?.id;
    if (!target) throw new Error("The selected member is missing a user ID.");
    const { data, error } = await pb.rpc("admin_moderate_profile_photo", {
      p_target_user: target,
      p_action: action,
      p_reason: ""
    });
    if (error) throw error;
    mergeProfile(data);
    await refreshProfiles({ render: false });
    return data;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("That photo could not be read."));
      reader.readAsDataURL(file);
    });
  }

  function installUploadHandler() {
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
        return toast("Photo not accepted.", "Please upload a PNG, JPG or WebP image.", true);
      }
      if (file.size > 2.5 * 1024 * 1024) {
        input.value = "";
        return toast("Photo is too large.", "Please upload an image under 2.5MB.", true);
      }

      input.disabled = true;
      try {
        const dataUrl = await readFileAsDataUrl(file);
        await submitPhoto(dataUrl);
        toast("Profile photo submitted.", "Your profile photo has been submitted for approval.");
        try { if (typeof renderNotifications === "function") renderNotifications(); } catch (_) {}
        try { if (typeof renderView === "function") renderView("profile"); } catch (_) {}
      } catch (error) {
        console.error(`[${VERSION}] photo submit failed`, error);
        const missingRpc = /function|schema cache|not found|does not exist/i.test(error?.message || "");
        toast(
          missingRpc ? "Photo approval setup is missing." : "Photo upload was not saved for approval.",
          missingRpc ? "Run supabase-profile-photo-approvals.sql once in Supabase, then try again." : (error.message || "Please try again."),
          true
        );
      } finally {
        input.disabled = false;
        input.value = "";
      }
    }, true);
  }

  function installModerationHandler() {
    document.addEventListener("click", async (event) => {
      const button = event.target.closest?.(".profile-photo-action");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const email = clean(button.dataset.email || "");
      const userId = String(button.dataset.userId || "");
      const profile = pendingPhotos().find((item) => clean(item.email) === email || String(item.user_id || item.id || "") === userId);
      if (!profile) return toast("Photo request not found.", "Refresh registrations and try again.", true);

      button.disabled = true;
      const action = button.dataset.photoAction === "reject" ? "reject" : "approve";
      try {
        await moderatePhoto(profile, action);
        toast(action === "approve" ? "Profile photo approved." : "Profile photo rejected.", "The approval queue has been updated.");
        try { if (typeof renderNotifications === "function") renderNotifications(); } catch (_) {}
        try { if (typeof renderView === "function") renderView("admin"); } catch (_) {}
      } catch (error) {
        console.error(`[${VERSION}] photo moderation failed`, error);
        const missingRpc = /function|schema cache|not found|does not exist/i.test(error?.message || "");
        toast(
          missingRpc ? "Photo approval setup is missing." : "Photo approval failed.",
          missingRpc ? "Run supabase-profile-photo-approvals.sql once in Supabase, then try again." : (error.message || "Please try again."),
          true
        );
      } finally {
        button.disabled = false;
      }
    }, true);
  }

  function start() {
    exposePending();
    installUploadHandler();
    installModerationHandler();
    refreshProfiles({ render: false });
    window.jpProfilePhotoRpcWorkflow = { version: VERSION, refreshProfiles, pendingPhotos, submitPhoto, moderatePhoto };
    console.info(`[${VERSION}] installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
