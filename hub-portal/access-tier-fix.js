(() => {
  "use strict";

  const VERSION = "access-tier-fix-20260722c";
  const CLIENT_VIEWS = new Set(["dashboard", "clientwork", "projects", "quotes", "messages", "notifications", "profile", "settings"]);
  const INACTIVE = new Set(["", "free", "pending", "rejected", "suspended", "removed"]);

  function clean(value) { return String(value || "").trim().toLowerCase(); }
  function esc(value) {
    if (typeof escapeHtml === "function") return escapeHtml(value == null ? "" : String(value));
    return String(value == null ? "" : value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));
  }
  function strictRole(user) {
    if (!user) return "guest";
    const email = clean(user.email);
    const role = clean(user.account_type || user.accountType || user.role || "client");
    const membership = clean(user.membership_status || user.membershipStatus || "");
    const status = clean(user.status || "active");
    if (email === "jpinnovation.enquiries@gmail.com" || role === "admin") return status === "removed" ? "client" : "admin";
    if (role === "member" && !INACTIVE.has(membership) && status !== "removed") return "member";
    return "client";
  }
  function normaliseLocalUser(user, profile) {
    if (!user && !profile) return null;
    const source = profile || user;
    const role = strictRole(source);
    const membership = clean(source.membership_status || source.membershipStatus || "") || (role === "client" ? "free" : "active");
    const target = user || {};
    Object.assign(target, {
      id: source.user_id || source.id || target.id,
      user_id: source.user_id || source.id || target.user_id,
      email: clean(source.email || target.email),
      name: source.full_name || source.name || target.name || source.email || "Member",
      business: source.business || target.business || "",
      role,
      account_type: role,
      accountType: role,
      membershipStatus: membership,
      membership_status: membership,
      status: source.status || target.status || "active",
      vetted: role === "admin" || Boolean(source.vetted_at || source.vetted),
      vetted_at: source.vetted_at || target.vetted_at || "",
      verified: role === "admin" || (role === "member" && Boolean(source.vetted_at || source.vetted || source.verified)),
      suspended: membership === "suspended" || membership === "removed" || clean(source.status) === "removed"
    });
    target.level = role === "admin" ? "JP Admin" : (role === "member" ? "Innovation Hub member" : "Client Portal");
    target.onboardingComplete = role === "admin" || role === "client" ? true : Boolean(target.onboardingComplete);
    return target;
  }
  function getUser() {
    try { return normaliseLocalUser(typeof currentUser === "function" ? currentUser() : null); } catch { return null; }
  }
  function entryMode() { return new URLSearchParams(window.location.search).get("entry") === "hub" ? "hub" : "client"; }
  function isClientContext(user = getUser()) { return strictRole(user) !== "admin" && strictRole(user) !== "member"; }
  function toast(title, detail = "", isError = false) {
    if (typeof showSuccessToast === "function" && !isError) { showSuccessToast(title, detail); return; }
    document.querySelector(".jp-access-tier-toast")?.remove();
    const node = document.createElement("div");
    node.className = "jp-access-tier-toast" + (isError ? " is-error" : "");
    node.innerHTML = `<strong>${esc(title)}</strong>${detail ? `<span>${esc(detail)}</span>` : ""}`;
    document.body.appendChild(node);
    window.setTimeout(() => node.remove(), 4300);
  }
  function applyAccessUi() {
    const user = getUser();
    const role = strictRole(user);
    const client = isClientContext(user);
    document.documentElement.dataset.jpAccessRole = role;
    document.documentElement.classList.toggle("hub-member-session", role === "admin" || role === "member");
    const adminVisible = role === "admin" && entryMode() === "hub";
    document.getElementById("profileAdminLink")?.classList.toggle("hidden", !adminVisible);
    document.getElementById("profileMetricsLink")?.classList.toggle("hidden", !adminVisible);
    document.getElementById("profileMyPosts")?.classList.toggle("hidden", client);
    document.querySelectorAll(".nav-link").forEach((button) => {
      const view = button.dataset.view || "dashboard";
      const hide = client && !CLIENT_VIEWS.has(view);
      button.classList.toggle("hidden", hide);
    });
    const roleNode = document.getElementById("memberRole");
    if (roleNode) roleNode.textContent = client ? "Client Portal" : (role === "admin" ? "JP Admin" : "Innovation Hub member");
  }
  async function loadSignedInProfile() {
    if (!portalBackend) return null;
    const { data: sessionData, error: sessionError } = await portalBackend.auth.getSession();
    if (sessionError || !sessionData?.session?.user) return null;
    const authUser = sessionData.session.user;
    const { data, error } = await portalBackend.from("profiles").select("user_id,email,full_name,business,account_type,membership_status,vetted_at,status").eq("user_id", authUser.id).maybeSingle();
    if (error) throw error;
    const profile = data || { user_id: authUser.id, email: authUser.email, full_name: authUser.user_metadata?.full_name || "", account_type: clean(authUser.email) === "jpinnovation.enquiries@gmail.com" ? "admin" : "client", membership_status: clean(authUser.email) === "jpinnovation.enquiries@gmail.com" ? "active" : "free", status: "active" };
    try {
      const email = clean(profile.email || authUser.email);
      let user = (state.users || []).find((item) => clean(item.email) === email || item.id === profile.user_id);
      if (!user) { user = { email }; state.users.push(user); }
      normaliseLocalUser(user, profile);
      state.sessionEmail = email;
      if (typeof syncMember === "function") syncMember(user);
      if (typeof saveState === "function") saveState();
    } catch {}
    return profile;
  }
  function blockClientHubIfNeeded() {
    const user = getUser();
    if (!user || entryMode() !== "hub" || !isClientContext(user)) return;
    document.getElementById("publicShell")?.classList.remove("hidden");
    document.getElementById("appShell")?.classList.add("hidden");
    if (typeof showUpgradeDialog === "function") showUpgradeDialog();
  }
  async function fetchProfile(userId) {
    const { data, error } = await portalBackend.from("profiles").select("user_id,email,full_name,business,account_type,membership_status,vetted_at,status").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    return data || null;
  }
  function findAccount(button) {
    const userId = button.dataset.userId || button.closest?.("[data-user-id]")?.dataset.userId || "";
    const email = clean(button.dataset.email || "");
    try { const row = (secureAdminProfiles || []).find((profile) => profile.user_id === userId || clean(profile.email) === email); if (row) return normaliseLocalUser(null, row); } catch {}
    try { return normaliseLocalUser((state.users || []).find((user) => user.id === userId || user.user_id === userId || clean(user.email) === email)); } catch { return null; }
  }
  async function rpc(name, params) { const { data, error } = await portalBackend.rpc(name, params); if (error) throw error; return Array.isArray(data) ? data[0] : data; }
  async function manageAccess(member, action) {
    const userId = member?.id || member?.user_id;
    if (!portalBackend || !userId) throw new Error("This account cannot be updated safely because it is missing a backend user id.");
    const params = { p_user_id: userId, p_account_type: null, p_membership_status: null, p_profile_status: "active", p_reason: "" };
    if (action === "upgrade") Object.assign(params, { p_account_type: "member", p_membership_status: "active" });
    else if (action === "downgrade") Object.assign(params, { p_account_type: "client", p_membership_status: "free" });
    else if (action === "suspend") Object.assign(params, { p_membership_status: "suspended", p_reason: "Suspended by JP Innovation admin" });
    else if (action === "restore" || action === "reactivate") Object.assign(params, { p_membership_status: strictRole(member) === "client" ? "free" : "active" });
    else if (action === "remove") Object.assign(params, { p_account_type: "client", p_membership_status: "removed", p_profile_status: "removed", p_reason: "Archived by JP Innovation admin" });
    else return null;
    try { await rpc("admin_manage_account", { p_user_id: userId, p_action: action, p_reason: params.p_reason || "" }); }
    catch (error) {
      if (!/admin_manage_account|function.*does not exist|schema cache|42883/i.test(error.message || "") && error.code !== "42883") throw error;
      await rpc("admin_set_account_access", params);
    }
    const latest = await fetchProfile(userId);
    const role = clean(latest?.account_type);
    const membership = clean(latest?.membership_status);
    if (action === "upgrade" && (role !== "member" || membership !== "active")) throw new Error(`Upgrade failed. Database still shows ${role || "unknown"}/${membership || "unknown"}.`);
    if (action === "downgrade" && (role !== "client" || membership !== "free")) throw new Error(`Move to Client failed. Database still shows ${role || "unknown"}/${membership || "unknown"}.`);
    return latest;
  }
  async function refreshAdminData(row) {
    try { await portalBackend?.auth?.refreshSession?.(); } catch {}
    try { if (typeof loadSecureAdminProfiles === "function") await loadSecureAdminProfiles(true); } catch {}
    try { if (typeof loadReliableAdminData === "function") await loadReliableAdminData(); } catch {}
    try {
      const user = normaliseLocalUser(null, row);
      if (user && state?.users) {
        const index = state.users.findIndex((item) => item.id === user.id || clean(item.email) === clean(user.email));
        if (index >= 0) state.users[index] = { ...state.users[index], ...user }; else state.users.push(user);
        if (typeof syncMember === "function") syncMember(state.users[index >= 0 ? index : state.users.length - 1]);
        if (typeof saveState === "function") saveState();
      }
    } catch {}
  }
  function installAdminCapture() {
    if (window.jpAccessTierAdminCaptureInstalled) return;
    window.jpAccessTierAdminCaptureInstalled = true;
    window.addEventListener("click", (event) => {
      const button = event.target?.closest?.(".admin-action");
      const action = button?.dataset?.adminAction || "";
      if (!button || !["upgrade", "downgrade", "suspend", "restore", "reactivate", "remove"].includes(action)) return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      const admin = getUser();
      if (strictRole(admin) !== "admin") { toast("Admin only.", "This action is not available for this account.", true); return; }
      const member = findAccount(button);
      if (!member) { toast("Account update failed.", "This member could not be found in the refreshed account list.", true); return; }
      button.disabled = true;
      const oldText = button.textContent;
      button.textContent = "Working...";
      manageAccess(member, action).then(async (row) => {
        await refreshAdminData(row);
        applyAccessUi();
        toast("Account updated.", "The change was saved and checked in the database.");
        if (typeof renderView === "function") renderView("admin");
      }).catch((error) => {
        console.error(`[${VERSION}] account update failed`, error);
        toast("Account update failed.", error.message || "Please try again.", true);
      }).finally(() => { button.disabled = false; button.textContent = oldText; });
    }, true);
  }
  function delayedAuthPrompt() {
    const params = new URLSearchParams(window.location.search);
    if (!["hub", "client"].includes(params.get("entry")) || getUser()) return;
    window.setTimeout(() => {
      if (getUser()) return;
      const anyOpen = document.querySelector("#authDialog.open,#upgradeDialog.open,#clientFeatureDialog.open");
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
  async function install() {
    addStyles();
    installAdminCapture();
    try { await loadSignedInProfile(); } catch (error) { console.warn(`[${VERSION}] signed-in profile check failed`, error); }
    applyAccessUi();
    blockClientHubIfNeeded();
    delayedAuthPrompt();
    const mount = document.getElementById("viewMount");
    if (mount) new MutationObserver(() => window.requestAnimationFrame(applyAccessUi)).observe(mount, { childList: true });
    window.addEventListener("focus", () => { loadSignedInProfile().then(() => { applyAccessUi(); blockClientHubIfNeeded(); }).catch(() => {}); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true }); else install();
})();
