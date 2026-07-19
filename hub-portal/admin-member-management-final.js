(() => {
  "use strict";

  const VERSION = "admin-member-management-final-20260719";
  const SELECT_COLUMNS = "user_id,email,full_name,business,account_type,membership_status,vetted_at,reputation_points,status,removed_at,removal_reason,profile_photo_url,profile_photo_pending_url,profile_photo_status,profile_photo_submitted_at,profile_photo_reviewed_at,warning_at,warning_reason";

  function safe(fn, fallback = null) {
    try { return fn(); } catch (error) { return fallback; }
  }

  function esc(value) {
    if (typeof escapeHtml === "function") return escapeHtml(value == null ? "" : String(value));
    return String(value == null ? "" : value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));
  }

  function cleanEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function toast(title, detail = "", isError = false) {
    if (typeof showSuccessToast === "function") {
      showSuccessToast(title, detail);
      return;
    }
    const existing = document.querySelector(".jp-final-toast");
    if (existing) existing.remove();
    const node = document.createElement("div");
    node.className = "jp-final-toast" + (isError ? " is-error" : "");
    node.innerHTML = `<strong>${esc(title)}</strong>${detail ? `<span>${esc(detail)}</span>` : ""}`;
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 4200);
  }

  async function confirmAction({ title, message, confirmLabel = "OK", danger = false }) {
    if (typeof openConfirmDialog === "function") {
      return openConfirmDialog({ title, message, confirmLabel, cancelLabel: "Cancel", danger });
    }
    return window.confirm(`${title}\n\n${message}`);
  }

  function userRole(member) {
    const role = String(member?.role || member?.account_type || "client").toLowerCase();
    if (role === "admin") return "admin";
    if (role === "member" || String(member?.membershipStatus || member?.membership_status || "").toLowerCase() === "active") return "member";
    return "client";
  }

  function isVerified(member) {
    const role = userRole(member);
    if (role === "admin") return true;
    return Boolean(member?.verified || member?.vetted || member?.vetted_at);
  }

  function isSuspended(member) {
    const membership = String(member?.membershipStatus || member?.membership_status || "").toLowerCase();
    const status = String(member?.status || "").toLowerCase();
    return Boolean(member?.suspended || membership === "suspended" || membership === "removed" || status === "removed" || member?.removed_at);
  }

  function hasWarning(member) {
    return Boolean(member?.warning || member?.warning_at || member?.warningReason || member?.warning_reason);
  }

  function roleText(member) {
    const role = userRole(member);
    if (role === "admin") return "JP Admin";
    if (role === "member") return "Hub Member";
    return "Client Portal";
  }

  function profileToUser(row) {
    const role = row.account_type || "client";
    const membershipStatus = row.membership_status || (role === "client" ? "free" : "active");
    return {
      id: row.user_id,
      email: cleanEmail(row.email),
      name: row.full_name || row.email || "Member",
      business: row.business || (role === "admin" ? "JP Innovation Ltd" : "Independent member"),
      role,
      account_type: role,
      membershipStatus,
      membership_status: membershipStatus,
      status: row.status || "active",
      vetted_at: row.vetted_at || "",
      verified: role === "admin" || Boolean(row.vetted_at),
      vetted: role === "admin" || Boolean(row.vetted_at),
      suspended: membershipStatus === "suspended" || row.status === "removed" || Boolean(row.removed_at),
      warning: Boolean(row.warning_at || row.warning_reason),
      warning_at: row.warning_at || "",
      warning_reason: row.warning_reason || "",
      points: row.reputation_points || 0,
      profilePhotoUrl: row.profile_photo_url || "",
      profilePhotoPendingUrl: row.profile_photo_pending_url || "",
      profilePhotoStatus: row.profile_photo_status || ""
    };
  }

  function findMemberByEmail(email) {
    const target = cleanEmail(email);
    const local = safe(() => (state.users || []).find((item) => cleanEmail(item.email) === target));
    if (local) return local;
    const secure = safe(() => (secureAdminProfiles || []).find((item) => cleanEmail(item.email) === target));
    return secure ? profileToUser(secure) : null;
  }

  async function fetchProfile(userId) {
    if (!portalBackend || !userId) return null;
    let query = portalBackend.from("profiles").select(SELECT_COLUMNS).eq("user_id", userId).maybeSingle();
    let { data, error } = await query;
    if (error && /warning_/i.test(error.message || "")) {
      const fallbackColumns = SELECT_COLUMNS.split(",").filter((column) => !column.startsWith("warning_")).join(",");
      ({ data, error } = await portalBackend.from("profiles").select(fallbackColumns).eq("user_id", userId).maybeSingle());
    }
    if (error) throw error;
    return data || null;
  }

  async function rpc(name, params) {
    const { data, error } = await portalBackend.rpc(name, params);
    if (error) throw error;
    return data;
  }

  function expectedFor(action, prior) {
    if (action === "upgrade") return { role: "member", membership: "active" };
    if (action === "downgrade") return { role: "client", membership: "free" };
    if (action === "suspend") return { membership: "suspended" };
    if (action === "reactivate" || action === "restore") return { membership: userRole(prior) === "client" ? "free" : "active" };
    if (action === "remove") return { removed: true };
    if (action === "verify") return { verified: true };
    if (action === "unverify") return { verified: false };
    if (action === "warn") return { warning: true };
    if (action === "unwarn") return { warning: false };
    return {};
  }

  function verifyPersisted(action, row, prior) {
    if (!row) return;
    const expected = expectedFor(action, prior);
    const accountType = String(row.account_type || "").toLowerCase();
    const membership = String(row.membership_status || "").toLowerCase();
    if (expected.role && accountType !== expected.role) throw new Error(`Database still shows ${accountType || "unknown"}, not ${expected.role}.`);
    if (expected.membership && membership !== expected.membership) throw new Error(`Database still shows membership ${membership || "unknown"}, not ${expected.membership}.`);
    if (expected.removed && row.status !== "removed" && row.membership_status !== "removed" && !row.removed_at) throw new Error("Database did not archive/remove the account.");
    if (expected.verified === true && !row.vetted_at && row.account_type !== "admin") throw new Error("Database did not save verification.");
    if (expected.verified === false && row.vetted_at) throw new Error("Database still shows the account as verified.");
    if (expected.warning === true && !(row.warning_at || row.warning_reason)) throw new Error("Database did not save the warning. Run the account-management SQL migration once in Supabase.");
    if (expected.warning === false && (row.warning_at || row.warning_reason)) throw new Error("Database still shows the warning.");
  }

  async function callManageAccount(member, action, reason) {
    if (!portalBackend) throw new Error("Secure backend is not available on this device.");
    const userId = member.id || member.user_id;
    if (!userId) throw new Error("This account is missing a user id, so it cannot be updated safely.");

    try {
      const result = await rpc("admin_manage_account", { p_user_id: userId, p_action: action, p_reason: reason || "" });
      return Array.isArray(result) ? result[0] : result;
    } catch (error) {
      const missingFunction = /admin_manage_account|function.*does not exist|schema cache|42883/i.test(error.message || "") || error.code === "42883";
      if (!missingFunction) throw error;
    }

    if (["upgrade", "downgrade", "verify", "suspend", "reactivate", "restore", "remove"].includes(action)) {
      const params = { p_user_id: userId, p_account_type: null, p_membership_status: null, p_profile_status: null, p_reason: reason || "" };
      if (action === "upgrade") Object.assign(params, { p_account_type: "member", p_membership_status: "active", p_profile_status: "active" });
      if (action === "downgrade") Object.assign(params, { p_account_type: "client", p_membership_status: "free", p_profile_status: "active" });
      if (action === "verify") Object.assign(params, { p_membership_status: "active", p_profile_status: "active" });
      if (action === "suspend") Object.assign(params, { p_membership_status: "suspended", p_profile_status: "active" });
      if (action === "reactivate" || action === "restore") Object.assign(params, { p_membership_status: userRole(member) === "client" ? "free" : "active", p_profile_status: "active" });
      if (action === "remove") Object.assign(params, { p_account_type: "client", p_membership_status: "removed", p_profile_status: "removed" });
      return rpc("admin_set_account_access", params);
    }

    if (action === "unverify") {
      const { data, error } = await portalBackend.from("profiles").update({ vetted_at: null, updated_at: new Date().toISOString() }).eq("user_id", userId).select("*").maybeSingle();
      if (error) throw error;
      return data;
    }

    if (action === "warn" || action === "unwarn") {
      const changes = action === "warn"
        ? { warning_at: new Date().toISOString(), warning_reason: reason || "Warned by JP Innovation admin", updated_at: new Date().toISOString() }
        : { warning_at: null, warning_reason: null, updated_at: new Date().toISOString() };
      const { data, error } = await portalBackend.from("profiles").update(changes).eq("user_id", userId).select("*").maybeSingle();
      if (error) throw error;
      return data;
    }

    throw new Error(`Unsupported account action: ${action}`);
  }

  async function refreshAdminState(targetEmail = "") {
    await safe(async () => portalBackend?.auth?.refreshSession?.());
    if (typeof loadSecureAdminProfiles === "function") await loadSecureAdminProfiles(true);
    if (typeof loadReliableAdminData === "function") await loadReliableAdminData();
    if (targetEmail && typeof secureProfileUser === "function") {
      const target = cleanEmail(targetEmail);
      const row = safe(() => (secureAdminProfiles || []).find((profile) => cleanEmail(profile.email) === target));
      const user = row ? secureProfileUser(row) : null;
      if (user && state?.users) {
        const index = state.users.findIndex((item) => cleanEmail(item.email) === target);
        if (index >= 0) state.users[index] = user; else state.users.push(user);
        if (typeof syncMember === "function") syncMember(user);
      }
    }
    if (typeof saveState === "function") saveState();
  }

  function actionCopy(action, member) {
    const name = member?.name || member?.email || "Account";
    return {
      upgrade: [`${name} upgraded.`, "Hub access is now active and persisted in Supabase."],
      downgrade: [`${name} moved to Client Portal.`, "Paid Hub access has been removed."],
      verify: [`${name} verified.`, "Verification has been saved."],
      unverify: [`Verification removed.`, `${name} no longer shows as verified.`],
      warn: [`Warning saved.`, `${name} now shows a warning status.`],
      unwarn: [`Warning removed.`, `${name} no longer shows a warning status.`],
      suspend: [`${name} suspended.`, "Login access is blocked until reactivated."],
      reactivate: [`${name} reactivated.`, "The account can sign in again."],
      restore: [`${name} reactivated.`, "The account can sign in again."],
      remove: [`${name} archived.`, "The account has been moved out of active management."],
      view: [`Opening profile.`, ""]
    }[action] || ["Account updated.", "The database has been refreshed."];
  }

  async function handleAdminAction(button) {
    const action = button.dataset.adminAction;
    const email = cleanEmail(button.dataset.email);
    const member = findMemberByEmail(email);
    const admin = typeof currentUser === "function" ? currentUser() : null;
    if (!member) throw new Error("This member could not be found in the refreshed account list.");

    const isSelf = cleanEmail(admin?.email) === cleanEmail(member.email) || (admin?.id && (admin.id === member.id || admin.id === member.user_id));
    if (isSelf && ["downgrade", "suspend", "reactivate", "restore", "remove"].includes(action)) {
      throw new Error("For safety, admins cannot downgrade, suspend or remove their own account.");
    }

    if (action === "view") {
      if (typeof renderView === "function") renderView("directory");
      toast("Open the directory.", "Use View profile from the member card for the full public profile.");
      return;
    }

    let reason = "";
    if (action === "warn") reason = "Warned by JP Innovation admin";
    if (action === "suspend") {
      const ok = await confirmAction({ title: "Suspend this account?", message: `${member.name || member.email} will be blocked from Hub access until reactivated.`, confirmLabel: "Suspend", danger: true });
      if (!ok) return;
      reason = "Suspended by JP Innovation admin";
    }
    if (action === "remove") {
      const ok = await confirmAction({ title: "Archive this account?", message: `${member.name || member.email} will be moved to archived/suspended and removed from active account management.`, confirmLabel: "Archive account", danger: true });
      if (!ok) return;
      reason = "Archived by JP Innovation admin";
    }

    button.disabled = true;
    button.classList.add("is-processing");
    button.dataset.originalText = button.textContent || "";
    button.textContent = "Working...";

    try {
      await callManageAccount(member, action, reason);
      const latest = await fetchProfile(member.id || member.user_id);
      verifyPersisted(action, latest, member);
      await refreshAdminState(member.email);
      const [title, detail] = actionCopy(action, member);
      toast(title, detail);
      if (typeof renderView === "function") renderView("admin");
    } catch (error) {
      console.error(`[${VERSION}] account action failed`, { action, email, error });
      toast("Account update failed.", error.message || "Please try again.", true);
      safe(() => { adminProfilesMessage = `Account update failed: ${error.message || error}`; });
      if (typeof renderView === "function") renderView("admin");
    }
  }

  function memberActions(member) {
    const role = userRole(member);
    const suspended = isSuspended(member);
    const warning = hasWarning(member);
    const verified = isVerified(member);
    const admin = typeof currentUser === "function" ? currentUser() : null;
    const self = cleanEmail(admin?.email) === cleanEmail(member.email) || (admin?.id && (admin.id === member.id || admin.id === member.user_id));
    const actions = [];
    if (!suspended && role === "client") actions.push(["upgrade", "Upgrade to Hub", "primary-button"]);
    if (!suspended && role === "member" && !self) actions.push(["downgrade", "Move to Client", "secondary-button"]);
    if (!suspended && role !== "admin") actions.push(verified ? ["unverify", "Remove verification", "secondary-button"] : ["verify", "Verify", "secondary-button"]);
    if (!suspended && role !== "admin") actions.push(warning ? ["unwarn", "Remove warning", "secondary-button"] : ["warn", "Warn", "secondary-button"]);
    if (!self && role !== "admin") actions.push(suspended ? ["reactivate", "Reactivate", "secondary-button"] : ["suspend", "Suspend", "secondary-button danger-action"]);
    if (!self && role !== "admin") actions.push(["remove", "Archive", "secondary-button danger-action"]);
    actions.push(["view", "View profile", "secondary-button"]);
    return actions.map(([action, label, cls]) => `<button class="${cls} admin-action" data-admin-action="${esc(action)}" data-email="${esc(member.email)}" data-user-id="${esc(member.id || member.user_id || "")}" type="button">${esc(label)}</button>`).join("");
  }

  function compactAccountCard(row) {
    const email = cleanEmail(row.querySelector(".admin-action[data-email]")?.dataset.email || "");
    const member = findMemberByEmail(email);
    if (!member) return;
    const role = userRole(member);
    const suspended = isSuspended(member);
    const warning = hasWarning(member);
    const statusText = suspended ? "Suspended" : "Active";
    row.classList.add("account-management-card-final");
    row.innerHTML = `
      <div class="amf-copy">
        <div class="amf-title-line">
          <h3>${esc(member.name || "Member")}</h3>
          <span class="amf-role-badge ${esc(role)}">${esc(roleText(member))}</span>
        </div>
        <p>${esc(member.business || (role === "client" ? "Client Portal member" : "Independent member"))}</p>
        <p class="amf-email">${esc(member.email || "No email")}</p>
        <div class="amf-status-row">
          <span class="amf-status ${suspended ? "danger" : "good"}">${esc(statusText)}</span>
          <span class="amf-status ${warning ? "warn" : "neutral"}">${warning ? "Warning" : "No warning"}</span>
          ${isVerified(member) ? `<span class="amf-status verified">Verified</span>` : `<span class="amf-status neutral">Not verified</span>`}
        </div>
      </div>
      <div class="admin-actions amf-actions">${memberActions(member)}</div>`;
  }

  function polishAccountCards() {
    document.querySelectorAll(".admin-member-row").forEach(compactAccountCard);
  }

  function updateProfileButtonRole() {
    const user = typeof currentUser === "function" ? currentUser() : null;
    const chip = document.getElementById("memberProfileButton");
    const initials = document.getElementById("memberInitials");
    if (!chip || !initials) return;
    const role = userRole(user || {});
    chip.classList.remove("role-client", "role-member", "role-admin");
    chip.classList.add(`role-${role}`);
    const hiddenStar = document.getElementById("reputationStatusButton");
    if (hiddenStar) hiddenStar.classList.add("hidden");
    const oldBadge = chip.querySelector("#memberAvatarRoleBadge");
    if (oldBadge) oldBadge.remove();
  }

  function addStyles() {
    if (document.getElementById("adminMemberManagementFinalStyles")) return;
    const style = document.createElement("style");
    style.id = "adminMemberManagementFinalStyles";
    style.textContent = `
      .jp-final-toast{position:fixed;left:50%;bottom:18px;z-index:99999;transform:translateX(-50%);width:min(520px,calc(100vw - 28px));display:grid;gap:3px;padding:14px 16px;border-radius:18px;border:1px solid rgba(52,211,153,.45);background:rgba(4,34,25,.94);box-shadow:0 18px 50px rgba(0,0,0,.36);color:#fff}.jp-final-toast span{color:#aeb8c6}.jp-final-toast.is-error{border-color:rgba(248,113,113,.55);background:rgba(45,9,15,.96)}
      #memberProfileButton.member-chip{width:58px!important;height:58px!important;min-width:58px!important;max-width:58px!important;border-radius:999px!important;padding:0!important;display:grid!important;place-items:center!important;position:relative;overflow:visible!important}#memberProfileButton #memberInitials{display:grid!important;place-items:center!important;width:100%!important;height:100%!important;border-radius:999px!important;font-weight:900!important;line-height:1!important;text-align:center!important;color:#fff!important}#memberProfileButton.role-client{background:#0575e6!important;border:2px solid #fff!important;box-shadow:0 0 0 1px rgba(37,99,235,.45),0 10px 28px rgba(0,0,0,.28)!important}#memberProfileButton.role-member{background:linear-gradient(135deg,#f6c84c,#b77810)!important;border:2px solid #fff!important;box-shadow:0 0 0 1px rgba(251,191,36,.35),0 10px 28px rgba(0,0,0,.28)!important}#memberProfileButton.role-admin{background:linear-gradient(135deg,#ffd95e,#bb7c0d)!important;border:2px solid #fff!important;box-shadow:inset 0 0 0 4px #0575e6,0 0 0 1px rgba(255,255,255,.55),0 10px 28px rgba(0,0,0,.3)!important}#reputationStatusButton,#memberAvatarRoleBadge{display:none!important}
      .account-management-card-final.feed-item{display:grid!important;grid-template-columns:1fr!important;gap:12px!important;padding:14px!important;border-radius:20px!important;border:1px solid rgba(255,255,255,.1)!important;background:linear-gradient(145deg,rgba(12,18,22,.95),rgba(6,10,13,.95))!important}.account-management-card-final .amf-copy{display:grid;gap:7px}.amf-title-line{display:flex;align-items:center;justify-content:space-between;gap:10px}.amf-title-line h3{margin:0!important;font-size:clamp(20px,5.2vw,28px)!important;line-height:1.08!important}.account-management-card-final p{margin:0!important;color:#aeb8c6!important;font-size:14px!important;line-height:1.35!important}.account-management-card-final .amf-email{color:#dbe7f5!important;font-size:13px!important;word-break:break-word}.amf-role-badge,.amf-status{display:inline-flex;align-items:center;justify-content:center;min-height:30px;padding:6px 11px;border-radius:999px;font-size:12px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}.amf-role-badge.admin{background:linear-gradient(135deg,#d29b16,#835700);color:#fff;border:2px solid #1f8cff;box-shadow:0 0 0 1px rgba(255,255,255,.34)}.amf-role-badge.member{background:linear-gradient(135deg,#f6c84c,#ac7111);color:#fff;border:1px solid #fff}.amf-role-badge.client{background:#0575e6;color:#fff;border:1px solid #fff}.amf-status-row{display:flex;flex-wrap:wrap;gap:7px}.amf-status{min-height:28px;padding:5px 9px;font-size:11px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.045);color:#cbd5e1}.amf-status.good{color:#34d399;border-color:rgba(52,211,153,.35);background:rgba(52,211,153,.1)}.amf-status.warn{color:#fbbf24;border-color:rgba(251,191,36,.35);background:rgba(251,191,36,.1)}.amf-status.danger{color:#fb7185;border-color:rgba(251,113,133,.42);background:rgba(251,113,133,.1)}.amf-status.verified{color:#60a5fa;border-color:rgba(96,165,250,.38);background:rgba(30,105,220,.12)}.amf-actions.admin-actions{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important}.amf-actions .primary-button,.amf-actions .secondary-button{min-height:44px!important;padding:9px 10px!important;border-radius:14px!important;font-size:13px!important;line-height:1.15!important}.amf-actions .is-processing{opacity:.7;pointer-events:none}
      @media (min-width:780px){.account-management-card-final.feed-item{grid-template-columns:1fr auto!important;align-items:center!important}.amf-actions.admin-actions{grid-template-columns:repeat(3,minmax(120px,1fr))!important;min-width:420px}.amf-title-line{justify-content:flex-start}.amf-title-line h3{font-size:22px!important}}
      @media (max-width:430px){#memberProfileButton.member-chip{width:54px!important;height:54px!important;min-width:54px!important;max-width:54px!important}.account-management-card-final.feed-item{padding:12px!important}.amf-actions .primary-button,.amf-actions .secondary-button{min-height:42px!important;font-size:12px!important}.amf-title-line{align-items:flex-start;flex-direction:column;gap:6px}.amf-title-line h3{font-size:20px!important}}
    `;
    document.head.appendChild(style);
  }

  function install() {
    addStyles();
    updateProfileButtonRole();
    polishAccountCards();
    document.addEventListener("click", (event) => {
      const button = event.target.closest?.(".admin-action");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      handleAdminAction(button).catch((error) => {
        console.error(`[${VERSION}] unhandled account action error`, error);
        toast("Account update failed.", error.message || "Please try again.", true);
      });
    }, true);
    const observer = new MutationObserver(() => {
      updateProfileButtonRole();
      polishAccountCards();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("storage", updateProfileButtonRole);
    window.addEventListener("focus", updateProfileButtonRole);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
