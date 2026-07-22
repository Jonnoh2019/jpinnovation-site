(() => {
  "use strict";

  const VERSION = "access-tier-fix-20260722b";
  const CLIENT_VIEWS = new Set(["dashboard", "clientwork", "projects", "quotes", "messages", "notifications", "profile", "settings"]);
  const HUB_MEMBER_VIEWS = new Set(["dashboard", "clientwork", "onboarding", "boards", "projects", "quotes", "directory", "resources", "events", "messages", "notifications", "rewards", "profile", "settings"]);
  const ADMIN_ONLY_VIEWS = new Set(["admin", "metrics"]);
  const INACTIVE = new Set(["", "free", "pending", "rejected", "suspended", "removed"]);

  function clean(value) { return String(value || "").trim().toLowerCase(); }
  function escape(value) {
    if (typeof escapeHtml === "function") return escapeHtml(value == null ? "" : String(value));
    return String(value == null ? "" : value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));
  }
  function strictRole(user) {
    if (!user) return "guest";
    const email = clean(user.email);
    const rawRole = clean(user.account_type || user.accountType || user.role || "client");
    const membership = clean(user.membership_status || user.membershipStatus || "");
    const status = clean(user.status || "active");
    if (email === "jpinnovation.enquiries@gmail.com" || rawRole === "admin") return status === "removed" ? "client" : "admin";
    if (rawRole === "member" && !INACTIVE.has(membership) && status !== "removed") return "member";
    return "client";
  }
  function normalizeUser(user) {
    if (!user) return user;
    const role = strictRole(user);
    const membership = clean(user.membership_status || user.membershipStatus || "");
    user.role = role === "guest" ? "client" : role;
    user.account_type = user.role;
    user.accountType = user.role;
    user.membershipStatus = membership || (user.role === "member" || user.role === "admin" ? "active" : "free");
    user.membership_status = user.membershipStatus;
    user.level = user.role === "admin" ? "JP Admin" : (user.role === "member" ? "Innovation Hub member" : "Client Portal");
    user.onboardingComplete = user.role === "admin" || user.role === "client" ? true : Boolean(user.onboardingComplete);
    user.verified = user.role === "admin" || (user.role === "member" && Boolean(user.vetted || user.vetted_at || user.verified));
    user.suspended = user.membershipStatus === "suspended" || user.membershipStatus === "removed" || clean(user.status) === "removed";
    return user;
  }
  function getUser() { try { return normalizeUser(typeof currentUser === "function" ? currentUser() : null); } catch { return null; } }
  function hasHub(user = getUser()) { const role = strictRole(user); return role === "admin" || role === "member"; }
  function inClientContext(user = getUser()) {
    const params = new URLSearchParams(window.location.search);
    const entry = params.get("entry") === "hub" ? "hub" : "client";
    if (strictRole(user) === "admin") return entry === "client";
    return !hasHub(user);
  }
  function isAllowedView(view, user = getUser()) {
    const role = strictRole(user);
    if (role === "admin") return true;
    if (ADMIN_ONLY_VIEWS.has(view)) return false;
    if (role === "member") return HUB_MEMBER_VIEWS.has(view);
    return CLIENT_VIEWS.has(view);
  }
  function safeView(view, user = getUser()) { return isAllowedView(view, user) ? view : "dashboard"; }
  function toast(title, detail = "", isError = false) {
    if (typeof showSuccessToast === "function" && !isError) { showSuccessToast(title, detail); return; }
    document.querySelector(".jp-access-tier-toast")?.remove();
    const node = document.createElement("div");
    node.className = "jp-access-tier-toast" + (isError ? " is-error" : "");
    node.innerHTML = `<strong>${escape(title)}</strong>${detail ? `<span>${escape(detail)}</span>` : ""}`;
    document.body.appendChild(node);
    window.setTimeout(() => node.remove(), 4400);
  }
  function cleanOverlays() {
    document.getElementById("memberProfileMenu")?.classList.remove("open");
    document.getElementById("memberProfileMenu")?.setAttribute("aria-hidden", "true");
    document.getElementById("memberProfileButton")?.setAttribute("aria-expanded", "false");
    document.getElementById("notificationPopover")?.classList.remove("open");
    document.getElementById("notificationPopover")?.setAttribute("aria-hidden", "true");
    document.getElementById("topNotificationBell")?.setAttribute("aria-expanded", "false");
    document.getElementById("appShell")?.classList.remove("mobile-menu-open");
    document.body.classList.remove("member-profile-menu-open", "mobile-dashboard-menu-open", "profile-menu-navigating");
    document.body.style.overflow = "";
    document.body.style.pointerEvents = "";
  }
  let uiScheduled = false;
  function scheduleAccessUi() {
    if (uiScheduled) return;
    uiScheduled = true;
    window.requestAnimationFrame(() => { uiScheduled = false; applyAccessUi(); });
  }
  function applyAccessUi() {
    const user = getUser();
    const role = strictRole(user);
    const client = inClientContext(user);
    document.documentElement.dataset.jpAccessRole = role;
    const adminVisible = role === "admin" && !client;
    document.getElementById("profileAdminLink")?.classList.toggle("hidden", !adminVisible);
    document.getElementById("profileMetricsLink")?.classList.toggle("hidden", !adminVisible);
    document.getElementById("profileMyPosts")?.classList.toggle("hidden", client);
    document.querySelectorAll(".nav-link").forEach((button) => {
      const view = button.dataset.view || "dashboard";
      const hidden = !isAllowedView(view, user) || (client && !CLIENT_VIEWS.has(view));
      button.classList.toggle("hidden", hidden);
    });
    const roleText = role === "admin" ? "JP Admin" : (role === "member" ? "Innovation Hub member" : "Client Portal");
    const roleNode = document.getElementById("memberRole");
    if (roleNode) roleNode.textContent = client ? "Client Portal" : roleText;
  }
  async function fetchProfile(userId) {
    if (!portalBackend || !userId) return null;
    const columns = "user_id,email,full_name,business,account_type,membership_status,vetted_at,reputation_points,status,removed_at,removal_reason,profile_photo_url,profile_photo_pending_url,profile_photo_status";
    const { data, error } = await portalBackend.from("profiles").select(columns).eq("user_id", userId).maybeSingle();
    if (error) throw error;
    return data || null;
  }
  function profileToUser(row) {
    if (!row) return null;
    return normalizeUser({ id: row.user_id, user_id: row.user_id, email: clean(row.email), name: row.full_name || row.email || "Member", business: row.business || "", role: row.account_type || "client", account_type: row.account_type || "client", membershipStatus: row.membership_status || "free", membership_status: row.membership_status || "free", vetted: Boolean(row.vetted_at), vetted_at: row.vetted_at || "", verified: Boolean(row.vetted_at), status: row.status || "active", removedAt: row.removed_at || "", removalReason: row.removal_reason || "", reputationPoints: Number(row.reputation_points || 0), profilePhotoUrl: row.profile_photo_url || "", profilePhotoPendingUrl: row.profile_photo_pending_url || "", profilePhotoStatus: row.profile_photo_status || "none" });
  }
  function findAccount(button) {
    const userId = button.dataset.userId || button.closest?.("[data-user-id]")?.dataset.userId || "";
    const email = clean(button.dataset.email || "");
    try { const row = (secureAdminProfiles || []).find((profile) => profile.user_id === userId || clean(profile.email) === email); if (row) return profileToUser(row); } catch {}
    try { return normalizeUser((state.users || []).find((user) => user.id === userId || user.user_id === userId || clean(user.email) === email)); } catch { return null; }
  }
  async function rpc(name, params) { const { data, error } = await portalBackend.rpc(name, params); if (error) throw error; return Array.isArray(data) ? data[0] : data; }
  async function manageAccount(member, action, reason = "") {
    if (!portalBackend) throw new Error("Secure backend is not available.");
    const userId = member?.id || member?.user_id;
    if (!userId) throw new Error("This account is missing a user id.");
    const params = { p_user_id: userId, p_account_type: null, p_membership_status: null, p_profile_status: "active", p_reason: reason || "" };
    if (action === "upgrade") Object.assign(params, { p_account_type: "member", p_membership_status: "active" });
    else if (action === "downgrade") Object.assign(params, { p_account_type: "client", p_membership_status: "free" });
    else if (action === "suspend") Object.assign(params, { p_membership_status: "suspended" });
    else if (action === "restore" || action === "reactivate") Object.assign(params, { p_membership_status: strictRole(member) === "client" ? "free" : "active" });
    else if (action === "remove") Object.assign(params, { p_account_type: "client", p_membership_status: "removed", p_profile_status: "removed" });
    else return null;
    let result = null;
    try { result = await rpc("admin_manage_account", { p_user_id: userId, p_action: action, p_reason: reason || "" }); }
    catch (error) {
      if (!/admin_manage_account|function.*does not exist|schema cache|42883/i.test(error.message || "") && error.code !== "42883") throw error;
      result = await rpc("admin_set_account_access", params);
    }
    const latest = await fetchProfile(userId);
    if (!latest) throw new Error("The account update could not be confirmed from the database.");
    const role = clean(latest.account_type);
    const membership = clean(latest.membership_status);
    if (action === "upgrade" && (role !== "member" || membership !== "active")) throw new Error(`Upgrade did not persist. Database still shows ${role || "unknown"}/${membership || "unknown"}.`);
    if (action === "downgrade" && (role !== "client" || membership !== "free")) throw new Error(`Move to Client did not persist. Database still shows ${role || "unknown"}/${membership || "unknown"}.`);
    if (action === "suspend" && membership !== "suspended") throw new Error("Suspend did not persist in the database.");
    if ((action === "restore" || action === "reactivate") && membership === "suspended") throw new Error("Reactivate did not persist in the database.");
    return latest || result;
  }
  async function refreshAfterAccountChange(row) {
    try { await portalBackend?.auth?.refreshSession?.(); } catch {}
    try { if (typeof loadSecureAdminProfiles === "function") await loadSecureAdminProfiles(true); } catch (error) { console.warn(`[${VERSION}] profile refresh failed`, error); }
    try { if (typeof loadReliableAdminData === "function") await loadReliableAdminData(); } catch (error) { console.warn(`[${VERSION}] admin data refresh failed`, error); }
    try {
      const updated = profileToUser(row);
      if (updated && state?.users) {
        const email = clean(updated.email);
        const index = state.users.findIndex((item) => clean(item.email) === email || item.id === updated.id);
        if (index >= 0) state.users[index] = { ...state.users[index], ...updated }; else state.users.push(updated);
        if (typeof syncMember === "function") syncMember(state.users[index >= 0 ? index : state.users.length - 1]);
        if (typeof saveState === "function") saveState();
      }
    } catch (error) { console.warn(`[${VERSION}] local state refresh failed`, error); }
  }
  function shouldOwnAdminAction(button) { return ["upgrade", "downgrade", "suspend", "restore", "reactivate", "remove"].includes(button?.dataset?.adminAction || ""); }
  async function handleAdminButton(button) {
    const admin = getUser();
    if (strictRole(admin) !== "admin") throw new Error("Only JP Innovation admin accounts can manage access.");
    const member = findAccount(button);
    const action = button.dataset.adminAction;
    if (!member) throw new Error("This account could not be found in the refreshed list.");
    const isSelf = clean(member.email) === clean(admin.email) || (member.id && member.id === admin.id);
    if (isSelf && ["downgrade", "suspend", "restore", "reactivate", "remove"].includes(action)) throw new Error("Admins cannot change their own access level.");
    const reason = action === "remove" ? "Archived by JP Innovation admin" : (action === "suspend" ? "Suspended by JP Innovation admin" : "");
    button.disabled = true; button.classList.add("is-processing");
    const oldText = button.textContent; button.textContent = "Working...";
    try {
      const row = await manageAccount(member, action, reason);
      await refreshAfterAccountChange(row);
      applyAccessUi();
      const name = member.name || member.email || "Account";
      const messages = { upgrade: [name + " upgraded.", "Hub access is now active in the database."], downgrade: [name + " moved to Client Portal.", "Hub access has been removed."], suspend: [name + " suspended.", "Access is blocked until reactivated."], restore: [name + " reactivated.", "Access has been restored."], reactivate: [name + " reactivated.", "Access has been restored."], remove: [name + " archived.", "The account has been removed from active management."] };
      toast(...(messages[action] || ["Account updated.", "Database refreshed."]));
      if (typeof renderView === "function") renderView("admin");
    } finally { button.disabled = false; button.classList.remove("is-processing"); button.textContent = oldText; }
  }
  function installWrappers() {
    if (typeof hasActiveHubAccess === "function" && !hasActiveHubAccess.jpAccessTierWrapped) { hasActiveHubAccess = function jpHasActiveHubAccess(user = getUser()) { return hasHub(user); }; hasActiveHubAccess.jpAccessTierWrapped = true; }
    if (typeof isClientPortalContext === "function" && !isClientPortalContext.jpAccessTierWrapped) { isClientPortalContext = function jpIsClientPortalContext(user = getUser()) { return inClientContext(user); }; isClientPortalContext.jpAccessTierWrapped = true; }
    if (typeof currentUser === "function" && !currentUser.jpAccessTierWrapped) { const baseCurrentUser = currentUser; currentUser = function jpCurrentUser() { return normalizeUser(baseCurrentUser()); }; currentUser.jpAccessTierWrapped = true; }
    if (typeof syncSecureSession === "function" && !syncSecureSession.jpAccessTierWrapped) { const baseSync = syncSecureSession; syncSecureSession = async function jpSyncSecureSession() { const user = normalizeUser(await baseSync()); applyAccessUi(); return user; }; syncSecureSession.jpAccessTierWrapped = true; }
    if (typeof renderView === "function" && !renderView.jpAccessTierWrapped) { const baseRender = renderView; renderView = function jpRenderView(view) { const user = getUser(); const next = safeView(view || "dashboard", user); if (next !== view) toast("Access level updated.", "That area is not available for this account type.", true); cleanOverlays(); const result = baseRender(next); scheduleAccessUi(); return result; }; renderView.jpAccessTierWrapped = true; }
    if (typeof setLoggedInView === "function" && !setLoggedInView.jpAccessTierWrapped) { const baseLoggedIn = setLoggedInView; setLoggedInView = function jpSetLoggedInView() { normalizeUser(getUser()); const result = baseLoggedIn(); scheduleAccessUi(); return result; }; setLoggedInView.jpAccessTierWrapped = true; }
  }
  function installAdminActionCapture() {
    if (window.jpAccessTierAdminCaptureInstalled) return;
    window.jpAccessTierAdminCaptureInstalled = true;
    window.addEventListener("click", (event) => {
      const button = event.target?.closest?.(".admin-action");
      if (!button || !shouldOwnAdminAction(button)) return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      handleAdminButton(button).catch((error) => { console.error(`[${VERSION}] account action failed`, error); toast("Account update failed.", error.message || "Please try again.", true); try { if (typeof renderView === "function") renderView("admin"); } catch {} });
    }, true);
  }
  function delayedAuthPrompt() {
    const params = new URLSearchParams(window.location.search);
    const isPortalLanding = params.get("entry") === "hub" || params.get("entry") === "client";
    if (!isPortalLanding || getUser()) return;
    window.setTimeout(() => {
      if (getUser()) return;
      const auth = document.getElementById("authDialog");
      const upgrade = document.getElementById("upgradeDialog");
      const feature = document.getElementById("clientFeatureDialog");
      const anyOpen = auth?.classList.contains("open") || upgrade?.classList.contains("open") || feature?.classList.contains("open");
      if (!anyOpen && typeof openAuth === "function") openAuth(params.get("register") === "1" ? "register" : "signin");
    }, 2000);
  }
  function addStyles() {
    if (document.getElementById("jpAccessTierStyles")) return;
    const style = document.createElement("style");
    style.id = "jpAccessTierStyles";
    style.textContent = `.jp-access-tier-toast{position:fixed;left:50%;bottom:16px;z-index:2147483647;transform:translateX(-50%);width:min(520px,calc(100vw - 24px));display:grid;gap:3px;padding:13px 15px;border-radius:17px;border:1px solid rgba(52,211,153,.45);background:rgba(3,34,24,.96);box-shadow:0 18px 44px rgba(0,0,0,.36);color:#fff}.jp-access-tier-toast span{color:#b7c2d1}.jp-access-tier-toast.is-error{border-color:rgba(248,113,113,.55);background:rgba(44,8,16,.97)}[data-jp-access-role=client] #profileAdminLink,[data-jp-access-role=client] #profileMetricsLink,[data-jp-access-role=client] #profileMyPosts{display:none!important}`;
    document.head.appendChild(style);
  }
  function install() {
    addStyles(); installWrappers(); installAdminActionCapture(); applyAccessUi(); delayedAuthPrompt();
    const mount = document.getElementById("viewMount");
    if (mount) new MutationObserver(scheduleAccessUi).observe(mount, { childList: true, subtree: false });
    window.addEventListener("focus", scheduleAccessUi);
    window.addEventListener("pageshow", scheduleAccessUi);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true }); else install();
})();
