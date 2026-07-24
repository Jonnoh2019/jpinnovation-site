(() => {
  const VERSION = "profile-sync-live-refresh-20260723c";
  const ROLE_ORDER = { admin: 0, hub: 1, client: 2 };
  let syncing = false;
  let lastSync = 0;
  let directoryTimer = null;

  function getPortalBackend() {
    try { if (typeof portalBackend !== "undefined" && portalBackend) return portalBackend; } catch (error) {}
    return window.portalBackend || null;
  }

  function getAppState() {
    try { if (typeof state !== "undefined" && state) return state; } catch (error) {}
    return window.state || null;
  }

  function normaliseAccess(value) {
    const raw = String(value || "client").toLowerCase();
    if (raw.includes("admin")) return "admin";
    if (raw.includes("hub") || raw.includes("member") || raw.includes("paid")) return "hub";
    return "client";
  }

  function fullName(row) {
    return row?.full_name || row?.fullName || row?.name || [row?.first_name, row?.last_name].filter(Boolean).join(" ") || "Member";
  }

  function initialsFor(name, email) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return String(email || "JP").slice(0, 2).toUpperCase();
  }

  function approvedPhoto(row) {
    const url = row?.profile_photo_url || row?.profilePhotoUrl || row?.avatar_url || row?.photo_url || "";
    const status = String(row?.profile_photo_status || row?.profilePhotoStatus || "").toLowerCase();
    if (!url) return "";
    return status === "approved" || status === "verified" || status === "" ? url : "";
  }

  function normaliseProfile(row) {
    if (!row) return null;
    const email = String(row.email || row.user_email || "").trim().toLowerCase();
    const id = row.id || row.user_id || row.auth_user_id || email;
    if (!id && !email) return null;
    const access = normaliseAccess(row.access_level || row.account_type || row.role || row.membership_level);
    const name = fullName(row);
    return {
      id,
      user_id: row.user_id || row.auth_user_id || row.id || id,
      email,
      fullName: name,
      name,
      company: row.company || row.company_name || row.member_type || row.account_label || "",
      accessLevel: access,
      role: access === "admin" ? "JP Admin" : access === "hub" ? "Hub Member" : "Client Portal",
      isAdmin: access === "admin" || row.is_admin === true,
      isHubMember: access === "admin" || access === "hub",
      verified: Boolean(row.verified || row.is_verified || access === "admin" || access === "hub"),
      suspended: Boolean(row.suspended || row.is_suspended || row.status === "suspended"),
      online: Boolean(row.online || row.is_online),
      profilePhotoUrl: approvedPhoto(row),
      profilePhotoStatus: row.profile_photo_status || row.profilePhotoStatus || "",
      engineeringRole: row.engineering_role || row.skill || row.category || "General Engineering",
      location: row.location || row.region || "",
      bio: row.bio || row.about || "",
      skills: Array.isArray(row.skills) ? row.skills : String(row.skills || row.skill || "").split(",").map((item) => item.trim()).filter(Boolean),
      source: row
    };
  }

  function mergeProfile(profile) {
    const appState = getAppState();
    if (!appState || !profile) return;
    appState.users = Array.isArray(appState.users) ? appState.users : [];
    appState.members = Array.isArray(appState.members) ? appState.members : [];
    const key = String(profile.email || profile.id || "").toLowerCase();
    const matches = (item) => String(item?.email || item?.id || "").toLowerCase() === key || (profile.id && item?.id === profile.id);
    const merged = (old = {}) => ({ ...old, ...profile, profilePhotoUrl: profile.profilePhotoUrl || old.profilePhotoUrl || "" });
    const userIndex = appState.users.findIndex(matches);
    if (userIndex >= 0) appState.users[userIndex] = merged(appState.users[userIndex]); else appState.users.push(profile);
    const memberIndex = appState.members.findIndex(matches);
    if (memberIndex >= 0) appState.members[memberIndex] = merged(appState.members[memberIndex]); else appState.members.push(profile);
    if (appState.currentUser && matches(appState.currentUser)) appState.currentUser = merged(appState.currentUser);
  }

  function profileKey(profile) {
    return String(profile?.email || profile?.id || profile?.user_id || "").toLowerCase();
  }

  function sharedProfiles() {
    const appState = getAppState();
    const map = new Map();
    const add = (item) => {
      const profile = normaliseProfile(item) || item;
      if (!profile) return;
      const key = profileKey(profile);
      if (!key) return;
      const existing = map.get(key) || {};
      map.set(key, { ...existing, ...profile, profilePhotoUrl: profile.profilePhotoUrl || existing.profilePhotoUrl || "" });
    };
    if (Array.isArray(window.secureAdminProfiles)) window.secureAdminProfiles.forEach(add);
    if (Array.isArray(appState?.users)) appState.users.forEach(add);
    if (Array.isArray(appState?.members)) appState.members.forEach(add);
    if (appState?.currentUser) add(appState.currentUser);
    return Array.from(map.values()).sort((a, b) => {
      const roleDiff = (ROLE_ORDER[normaliseAccess(a.accessLevel || a.role)] ?? 9) - (ROLE_ORDER[normaliseAccess(b.accessLevel || b.role)] ?? 9);
      if (roleDiff) return roleDiff;
      return String(a.fullName || a.name || "").localeCompare(String(b.fullName || b.name || ""));
    });
  }

  function roleClass(profile) {
    const role = normaliseAccess(profile?.accessLevel || profile?.role);
    return role === "admin" ? "admin" : role === "hub" ? "hub-member" : "client";
  }

  function avatarMarkup(profile, extraClass = "") {
    const name = profile?.fullName || profile?.name || "Member";
    const initials = initialsFor(name, profile?.email);
    const photo = profile?.profilePhotoUrl || "";
    const cls = ["role-avatar", `role-avatar--${roleClass(profile)}`, extraClass].filter(Boolean).join(" ");
    if (photo) return `<span class="${cls}" aria-hidden="true"><img src="${photo}" alt=""></span>`;
    return `<span class="${cls}" aria-hidden="true">${initials}</span>`;
  }

  function updateAvatarTarget(target, profile, extraClass) {
    if (!target || !profile) return;
    const key = [profile.email || profile.id || "", profile.profilePhotoUrl || "", roleClass(profile), extraClass].join("|");
    if (target.dataset.syncAvatarKey === key) return;
    const replacement = document.createElement("span");
    replacement.innerHTML = avatarMarkup(profile, extraClass);
    const avatar = replacement.firstElementChild;
    if (!avatar) return;
    target.dataset.syncAvatarKey = key;
    target.className = avatar.className;
    target.innerHTML = avatar.innerHTML;
    if (avatar.querySelector("img")) target.setAttribute("aria-label", profile.fullName || profile.name || "Profile");
  }

  function updateCurrentIdentity() {
    const appState = getAppState();
    const current = appState?.currentUser;
    if (!current) return;
    updateAvatarTarget(document.querySelector("#memberInitials"), current, "role-avatar--header");
    updateAvatarTarget(document.querySelector("#profileMenuAvatar"), current, "role-avatar--menu");
  }

  async function refreshSharedProfiles(force = false) {
    const now = Date.now();
    if (syncing || (!force && now - lastSync < 45000)) return false;
    const pb = getPortalBackend();
    if (!pb?.from) return false;
    syncing = true;
    try {
      const { data, error } = await pb.from("profiles").select("*").order("full_name", { ascending: true });
      if (error) throw error;
      if (Array.isArray(data)) data.map(normaliseProfile).filter(Boolean).forEach(mergeProfile);
      lastSync = Date.now();
      updateCurrentIdentity();
      renderDirectorySoon();
      return true;
    } catch (error) {
      console.warn("JP profile sync skipped", error);
      return false;
    } finally {
      syncing = false;
    }
  }

  function directoryCard(profile) {
    const role = roleClass(profile);
    const name = profile.fullName || profile.name || "Member";
    const email = profile.email || "";
    const company = profile.company || (role === "admin" ? "JP Innovation Ltd" : role === "hub-member" ? "Innovation Hub member" : "Client Portal member");
    const roleLabel = role === "admin" ? "JP Admin" : role === "hub-member" ? "Hub Member" : "Client Portal";
    return `<article class="directory-row directory-row--${role}" data-member-email="${email}">
      ${avatarMarkup(profile, "directory-row__avatar")}
      <div class="directory-row__body">
        <div class="directory-row__top"><strong>${name}</strong><span class="role-badge role-badge--${role}">${roleLabel}</span></div>
        <small>${company}</small>
        <span class="directory-row__email">${email || "No email saved"}</span>
      </div>
      <div class="directory-row__side"><span class="online-pill ${profile.online ? "is-online" : ""}">${profile.online ? "Online" : "Offline"}</span><button class="secondary-button directory-row__button" data-view-member="${email || profile.id}" type="button">View</button></div>
    </article>`;
  }

  function renderDirectory() {
    const target = document.querySelector("#directoryResults");
    if (!target) return;
    const search = String(document.querySelector("#directorySearch")?.value || "").trim().toLowerCase();
    const filter = String(document.querySelector("#directoryFilter")?.value || "all").toLowerCase();
    const profiles = sharedProfiles().filter((profile) => {
      const role = roleClass(profile);
      if (filter !== "all" && !role.includes(filter) && normaliseAccess(profile.accessLevel) !== filter) return false;
      if (!search) return true;
      return [profile.fullName, profile.name, profile.email, profile.company, profile.engineeringRole, profile.location].join(" ").toLowerCase().includes(search);
    });
    const html = profiles.length ? profiles.map(directoryCard).join("") : `<div class="empty-state"><strong>No members found</strong><p>Try clearing the search or changing the filter.</p></div>`;
    if (target.dataset.syncDirectoryHtml === html) return;
    target.dataset.syncDirectoryHtml = html;
    target.innerHTML = html;
  }

  function renderDirectorySoon() {
    clearTimeout(directoryTimer);
    directoryTimer = setTimeout(renderDirectory, 120);
  }

  function installDirectoryPatch() {
    try {
      window.bindDirectory = function bindDirectoryShared() {
        renderDirectory();
        refreshSharedProfiles(false);
      };
      if (typeof bindDirectory !== "undefined") bindDirectory = window.bindDirectory;
    } catch (error) {
      console.warn("JP directory sync patch skipped", error);
    }
    document.addEventListener("input", (event) => {
      if (event.target?.matches?.("#directorySearch, #directoryFilter")) renderDirectorySoon();
    }, true);
    document.addEventListener("change", (event) => {
      if (event.target?.matches?.("#directorySearch, #directoryFilter")) renderDirectorySoon();
    }, true);
  }

  function installAvatarPatch() {
    try {
      window.profileAvatarMarkup = avatarMarkup;
      if (typeof profileAvatarMarkup !== "undefined") profileAvatarMarkup = avatarMarkup;
    } catch (error) {}
  }

  function installStyles() {
    if (document.querySelector("#profile-sync-live-refresh-style")) return;
    const style = document.createElement("style");
    style.id = "profile-sync-live-refresh-style";
    style.textContent = `
      .role-avatar{display:inline-flex;align-items:center;justify-content:center;aspect-ratio:1/1;border-radius:999px;width:52px;height:52px;min-width:52px;line-height:1;font-weight:900;overflow:hidden;color:#fff;background:linear-gradient(145deg,#035fc5,#00316d);border:2px solid rgba(255,255,255,.85);box-shadow:0 10px 25px rgba(0,0,0,.28)}
      .role-avatar img{width:100%;height:100%;object-fit:cover;display:block}.role-avatar--admin{background:radial-gradient(circle at 35% 25%,#f3d36a 0,#c89b2c 38%,#8b6514 100%);border-color:#168bff;color:#fff}.role-avatar--hub-member{background:linear-gradient(145deg,#086ad8,#012b63);border-color:#c89b2c}.role-avatar--client{background:linear-gradient(145deg,#086ad8,#012b63);border-color:#fff}.role-avatar--header{width:58px;height:58px;min-width:58px}.role-avatar--menu{width:58px;height:58px;min-width:58px}.directory-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;padding:14px;border:1px solid rgba(255,255,255,.13);border-radius:20px;background:linear-gradient(145deg,rgba(16,22,28,.94),rgba(6,10,14,.96));margin:10px 0;min-width:0}.directory-row--admin{border-color:rgba(22,139,255,.55);box-shadow:inset 3px 0 0 rgba(200,155,44,.9)}.directory-row__body{min-width:0}.directory-row__top{display:flex;align-items:center;gap:8px;min-width:0}.directory-row__top strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.directory-row__body small,.directory-row__email{display:block;color:#aeb8c8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.directory-row__side{display:flex;flex-direction:column;align-items:flex-end;gap:8px}.directory-row__button{min-height:36px;padding:8px 12px}.role-badge{display:inline-flex;align-items:center;white-space:nowrap;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.04em}.role-badge--admin{background:linear-gradient(145deg,#c89b2c,#8b6514);border:1px solid #168bff;color:#fff}.role-badge--hub-member{background:#082a56;border:1px solid #c89b2c;color:#fff}.role-badge--client{background:#082a56;border:1px solid #fff;color:#fff}.online-pill{border-radius:999px;padding:5px 8px;font-size:11px;font-weight:900;background:rgba(255,255,255,.08);color:#b8c1d0}.online-pill.is-online{background:rgba(43,216,126,.14);color:#52e89b}@media(max-width:520px){.directory-row{grid-template-columns:auto minmax(0,1fr);}.directory-row__side{grid-column:1/-1;flex-direction:row;justify-content:flex-end}.role-avatar{width:46px;height:46px;min-width:46px}.role-avatar--header{width:54px;height:54px;min-width:54px}}
    `;
    document.head.appendChild(style);
  }

  function startSafeRefreshLoop() {
    let ticks = 0;
    const timer = setInterval(() => {
      ticks += 1;
      updateCurrentIdentity();
      if (document.querySelector("#directoryResults")) renderDirectorySoon();
      if (ticks === 2 || ticks === 8 || ticks === 20) refreshSharedProfiles(false);
      if (ticks >= 30) clearInterval(timer);
    }, 1000);
  }

  function start() {
    installStyles();
    installAvatarPatch();
    installDirectoryPatch();
    updateCurrentIdentity();
    refreshSharedProfiles(true);
    startSafeRefreshLoop();
    document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshSharedProfiles(true); });
    window.addEventListener("focus", () => refreshSharedProfiles(true));
    window.jpProfileSyncLiveRefresh = { version: VERSION, refresh: refreshSharedProfiles, profiles: sharedProfiles };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
