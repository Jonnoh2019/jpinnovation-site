(() => {
  "use strict";
  const VERSION = "profile-sync-live-refresh-20260724a";
  if (window.__jpProfileSyncLiveRefreshVersion === VERSION) return;
  window.__jpProfileSyncLiveRefreshVersion = VERSION;

  const ROLE_ORDER = { admin: 0, hub: 1, client: 2, pending: 3 };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v = "") => String(v ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[c]);
  const clean = (v = "") => String(v || "").trim().toLowerCase();

  function appState(){ try { if (typeof state !== "undefined" && state) return state; } catch(_){} return window.state || {}; }
  function backend(){ try { if (typeof portalBackend !== "undefined" && portalBackend) return portalBackend; } catch(_){} return window.portalBackend || null; }
  function current(){ try { if (typeof currentUser === "function") return currentUser(); } catch(_){} return appState().currentUser || null; }
  function toast(title, detail = "", error = false){
    const fn = error ? (window.showErrorToast || window.showSuccessToast) : window.showSuccessToast;
    if (typeof fn === "function") return fn(title, detail);
    console[error ? "warn" : "log"](title, detail);
  }

  function roleOf(p){
    const role = String(p?.role || p?.account_type || p?.accessLevel || p?.membership_level || "").toLowerCase();
    const status = String(p?.membershipStatus || p?.membership_status || p?.status || "").toLowerCase();
    const level = String(p?.level || "").toLowerCase();
    if (status === "pending" || role === "pending") return "pending";
    if (role.includes("admin") || level.includes("admin") || p?.is_admin === true) return "admin";
    if (role === "member" || role.includes("hub") || role.includes("paid") || status === "active" || status === "approved" || status === "paid") return "hub";
    return "client";
  }
  function roleLabel(role){ return role === "admin" ? "JP Admin" : role === "hub" ? "Hub Member" : role === "pending" ? "Pending" : "Client Portal"; }
  function initials(p){
    const source = String(p?.name || p?.full_name || p?.fullName || p?.email || "JP").trim();
    const parts = source.split(/\s+/).filter(Boolean);
    return (parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0,2)).toUpperCase();
  }
  function approvedPhoto(p){
    const url = p?.profilePhotoUrl || p?.profile_photo_url || p?.avatar_url || "";
    const status = String(p?.profilePhotoStatus || p?.profile_photo_status || "").toLowerCase();
    return url && (!status || status === "approved" || status === "verified") ? url : "";
  }
  function normalise(raw){
    if (!raw) return null;
    const email = clean(raw.email || raw.user_email || "");
    const id = raw.id || raw.user_id || raw.auth_user_id || email;
    if (!id && !email) return null;
    const role = roleOf(raw);
    const name = raw.name || raw.full_name || raw.fullName || [raw.first_name, raw.last_name].filter(Boolean).join(" ") || (email ? email.split("@")[0] : "Member");
    return { ...raw, id, user_id: raw.user_id || raw.auth_user_id || raw.id || id, email, name, fullName: name,
      business: raw.business || raw.company || raw.company_name || (role === "admin" ? "JP Innovation Ltd" : ""),
      role: role === "hub" ? "member" : role, account_type: role === "hub" ? "member" : role,
      membershipStatus: raw.membershipStatus || raw.membership_status || (role === "hub" || role === "admin" ? "active" : role === "pending" ? "pending" : "free"),
      level: roleLabel(role), skill: raw.skill || raw.skills || raw.engineeringRole || raw.engineering_role || "General Engineering",
      location: raw.location || raw.region || "Location TBC", bio: raw.bio || raw.about || "Innovation Hub member.",
      directoryVisible: raw.directoryVisible !== false && raw.directory_visible !== false,
      profilePhotoUrl: raw.profilePhotoUrl || raw.profile_photo_url || "", profilePhotoPendingUrl: raw.profilePhotoPendingUrl || raw.profile_photo_pending_url || "",
      profilePhotoStatus: raw.profilePhotoStatus || raw.profile_photo_status || "", online: raw.online === true || raw.is_online === true,
      lastActiveAt: raw.lastActiveAt || raw.last_active_at || raw.updated_at || "" };
  }
  function keyOf(p){ return clean(p?.email || p?.id || p?.user_id || ""); }
  function mergeProfile(profile){
    const st = appState(); if (!profile || !st) return;
    st.users = Array.isArray(st.users) ? st.users : []; st.members = Array.isArray(st.members) ? st.members : [];
    const k = keyOf(profile); const same = item => keyOf(item) === k || (profile.id && item?.id === profile.id) || (profile.user_id && item?.user_id === profile.user_id);
    [st.users, st.members].forEach(list => { const i = list.findIndex(same); if (i >= 0) list[i] = { ...list[i], ...profile }; else list.push(profile); });
    if (st.currentUser && same(st.currentUser)) st.currentUser = { ...st.currentUser, ...profile };
    try { if (typeof saveState === "function") saveState(); } catch(_){}
  }
  function allProfiles(){
    const map = new Map();
    const add = raw => { const p = normalise(raw); if (!p) return; const k = keyOf(p); if (!k) return; const e = map.get(k) || {}; map.set(k, { ...e, ...p, profilePhotoUrl: p.profilePhotoUrl || e.profilePhotoUrl || "", profilePhotoPendingUrl: p.profilePhotoPendingUrl || e.profilePhotoPendingUrl || "", online: p.online || e.online || false }); };
    try { if (Array.isArray(secureAdminProfiles)) secureAdminProfiles.forEach(row => add(typeof secureProfileUser === "function" ? secureProfileUser(row) : row)); } catch(_){}
    const st = appState(); (st.users || []).forEach(add); (st.members || []).forEach(add); const me = current(); if (me) add({ ...me, online: true });
    return Array.from(map.values()).filter(p => p.directoryVisible !== false && !p.suspended && !["removed","archived"].includes(String(p.status || "").toLowerCase())).sort((a,b) => (ROLE_ORDER[roleOf(a)] - ROLE_ORDER[roleOf(b)]) || String(a.name || "").localeCompare(String(b.name || "")));
  }
  function isOnline(p){
    if (p.online) return true; const me = current(); if (me?.email && clean(me.email) === clean(p.email)) return true;
    try { if (typeof isMemberOnline === "function") return isMemberOnline(p, me); } catch(_){}
    const seen = new Date(p.lastActiveAt || p.last_active_at || ""); return !Number.isNaN(seen.getTime()) && Date.now() - seen.getTime() < 15*60*1000;
  }
  function avatar(p, cls = "profile-avatar"){
    const role = roleOf(p), photo = approvedPhoto(p), klass = `${cls} jp-directory-avatar role-avatar role-avatar--${role === "hub" ? "hub-member" : role}`;
    return photo ? `<span class="${klass} has-photo"><img src="${esc(photo)}" alt="${esc(p.name || "Member")} profile photo"></span>` : `<span class="${klass}">${esc(initials(p))}</span>`;
  }
  function rolePill(p){ const r = roleOf(p); return `<span class="jp-directory-role jp-directory-role--${r}">${esc(roleLabel(r))}</span>`; }
  function card(p){
    const role = roleOf(p), online = isOnline(p), skills = String(p.skill || "General Engineering").split(",").map(x=>x.trim()).filter(Boolean).slice(0,3), main = skills[0] || "General Engineering";
    return `<article class="member-card member-compact-card jp-directory-card role-${esc(role)}"><div class="jp-directory-card__top"><span class="compact-avatar-wrap ${online ? "is-online" : ""}">${avatar(p)}</span><div class="jp-directory-card__identity"><div class="jp-directory-card__name-row"><h3>${esc(p.name || "Member")}</h3>${rolePill(p)}</div><p>${esc(p.business || p.level || "Independent member")}</p><small>${esc(p.email || "No email saved")}</small></div><span class="jp-online-pill ${online ? "is-online" : ""}">${online ? "Online" : "Offline"}</span></div><div class="jp-directory-card__details"><strong>${esc(main)}</strong><span>${esc(p.location || "Location TBC")}</span><p>${esc(p.bio || "Innovation Hub member.")}</p></div><div class="compact-chip-row">${skills.map(s=>`<span class="pill">${esc(s)}</span>`).join("")}</div><div class="compact-member-actions"><button class="secondary-button message-member-button" data-member-email="${esc(p.email || "")}" type="button">Message</button><button class="primary-button view-profile-button" data-profile-member-id="${esc(p.id || p.user_id || "")}" data-profile-member-email="${esc(p.email || "")}" type="button">View profile</button></div></article>`;
  }
  function groupHtml(profiles){
    const groups = [["admin","Admin accounts"],["hub","Paid Innovation Hub members"],["client","Free Client Portal members"],["pending","Pending accounts"]];
    const html = groups.map(([r,t]) => { const list = profiles.filter(p => roleOf(p) === r); return list.length ? `<section class="directory-account-section directory-account-section-${r}"><div class="directory-account-heading"><h3>${esc(t)}</h3><span>${list.length}</span></div><div class="directory-account-cards">${list.map(card).join("")}</div></section>` : ""; }).join("");
    return html || `<p class="muted">No matching members found.</p>`;
  }
  function installDirectory(){
    try {
      if (typeof memberCard === "function") memberCard = card;
      const renderDirectory = () => {
        addStyles(); const skill = $("#skillFilter"), location = $("#locationFilter"), verified = $("#verifiedFilter"), results = $("#directoryResults"), tools = $(".directory-tools"); if (!results) return;
        if (tools && !$(".directory-account-filters")) tools.insertAdjacentHTML("afterend", `<div class="directory-account-filters" aria-label="Account filters">${[["all","All"],["online","Online"],["admin","Admins"],["hub","Hub Members"],["client","Clients"],["pending","Pending"]].map(([v,l])=>`<button class="directory-account-filter" data-directory-type="${v}" type="button">${l}</button>`).join("")}</div>`);
        const active = window.jpDirectoryFilter || "all"; $$(".directory-account-filter").forEach(b => b.classList.toggle("active", (b.dataset.directoryType || "all") === active));
        const skillTerm = String(skill?.value || "").trim().toLowerCase(), locationTerm = String(location?.value || "").trim().toLowerCase(), verifiedOnly = Boolean(verified?.checked);
        const profiles = allProfiles().filter(p => { const r = roleOf(p), online = isOnline(p); return (active === "all" || active === r || (active === "online" && online)) && (!skillTerm || String(p.skill || "").toLowerCase().includes(skillTerm)) && (!locationTerm || String(p.location || "").toLowerCase().includes(locationTerm)) && (!verifiedOnly || r === "admin" || r === "hub" || p.verified || p.vetted); });
        results.classList.add("directory-results-grouped"); results.innerHTML = groupHtml(profiles);
      };
      window.bindDirectory = renderDirectory; try { bindDirectory = renderDirectory; } catch(_){}
      document.addEventListener("input", e => { if (e.target?.matches?.("#skillFilter,#locationFilter")) renderDirectory(); }, true);
      document.addEventListener("change", e => { if (e.target?.matches?.("#verifiedFilter")) renderDirectory(); }, true);
      document.addEventListener("click", e => { const f = e.target.closest?.(".directory-account-filter"); if (!f) return; window.jpDirectoryFilter = f.dataset.directoryType || "all"; renderDirectory(); }, true);
      if (String(window.currentView || currentView || "") === "directory") renderDirectory();
    } catch(err){ console.error(`[${VERSION}] directory install failed`, err); }
  }
  function profileHtml(p){
    const skills = String(p.skill || "General Engineering").split(",").map(x=>x.trim()).filter(Boolean), online = isOnline(p);
    return `<section class="section-card public-profile-card premium-profile-card role-${esc(roleOf(p))}"><button id="backToDirectory" class="secondary-button premium-profile-back" type="button">← Directory</button><div class="premium-profile-hero"><span class="premium-profile-avatar-wrap">${avatar(p)}<i class="premium-online-dot ${online ? "" : "offline"}" aria-hidden="true"></i></span><div class="premium-profile-main"><div class="premium-badge-row">${rolePill(p)}<span class="premium-status-text">${online ? "Online" : "Offline"}</span></div><h2 class="premium-profile-name">${esc(p.name || "Member")}</h2><p class="premium-profile-company">${esc(p.business || p.level || "Independent member")}</p></div></div><div class="premium-info-grid"><div class="premium-info-card"><b>Engineering role</b><span>${esc(skills[0] || "General Engineering")}</span></div><div class="premium-info-card"><b>Location</b><span>${esc(p.location || "Location TBC")}</span></div><div class="premium-info-card"><b>Reputation</b><span>${Number(p.reputationPoints ?? p.points ?? 0)} points</span><small class="premium-stars">★★★★★</small></div><div class="premium-info-card"><b>Availability</b><span>${esc(p.capacity || p.preferredWork || "Availability TBC")}</span></div></div><h3>About</h3><p class="premium-about">${esc(p.bio || "No profile biography has been added yet.")}</p><h3>Skills</h3><div class="premium-skill-tags">${(skills.length ? skills : ["General Engineering"]).slice(0,10).map(s=>`<span class="premium-skill-tag">${esc(s)}</span>`).join("")}</div><div class="premium-profile-actions"><button class="secondary-button message-member-button" data-member-email="${esc(p.email || "")}" type="button">Message</button><button class="secondary-button" type="button">Connect</button><button class="primary-button" type="button">Invite to Project</button></div></section>`;
  }
  function openProfile(id, email){
    const p = allProfiles().find(x => String(x.id || x.user_id || "") === String(id || "") || (email && clean(x.email) === clean(email)));
    if (!p) return toast("Profile could not be opened.", "This member was not found in the current directory list.", true);
    const mount = $("#viewMount"); if (!mount) return; try { currentView = "memberprofile"; } catch(_){} const title = $("#viewTitle"); if (title) title.textContent = "Member Profile"; mount.dataset.view = "memberprofile"; mount.innerHTML = profileHtml(p);
    try { history.pushState({entry:"hub",view:"memberprofile",member:p.id||p.email}, "", `${location.pathname}?entry=hub&view=memberprofile&member=${encodeURIComponent(p.id || p.email || "")}`); } catch(_){}
    $("#backToDirectory", mount)?.addEventListener("click", () => { try { renderView("directory"); } catch(_){} });
  }
  function installProfileButtons(){
    document.addEventListener("click", e => { const b = e.target.closest?.(".view-profile-button,[data-profile-member-id],[data-profile-member-email],[data-view-member]"); if (!b) return; e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); openProfile(b.dataset.profileMemberId || "", b.dataset.profileMemberEmail || b.dataset.viewMember || ""); }, true);
    document.addEventListener("click", e => { const b = e.target.closest?.(".message-member-button"); if (!b) return; try { messageDraftRecipientEmail = b.dataset.memberEmail || ""; activeMessageConversationKey = ""; renderView("messages"); } catch(_){} }, true);
  }
  function pendingPhotos(){ return allProfiles().filter(p => p.profilePhotoPendingUrl && String(p.profilePhotoStatus || "").toLowerCase() === "pending"); }
  function installPendingPhotoFunction(){ try { window.pendingProfilePhotos = pendingPhotos; if (typeof pendingProfilePhotos !== "undefined") pendingProfilePhotos = pendingPhotos; } catch(_){} }
  async function updatePhotoRecord(profile, action){
    const pb = backend(); if (!pb?.from) throw new Error("Secure profile backend is unavailable."); const pending = profile.profilePhotoPendingUrl || profile.profile_photo_pending_url || "";
    const changes = action === "approve" ? { profile_photo_url: pending, profile_photo_pending_url: null, profile_photo_status: "approved", profile_photo_reviewed_at: new Date().toISOString() } : { profile_photo_pending_url: null, profile_photo_status: profile.profilePhotoUrl || profile.profile_photo_url ? "approved" : "rejected", profile_photo_reviewed_at: new Date().toISOString() };
    let q = pb.from("profiles").update(changes); q = profile.user_id || profile.id ? q.eq("user_id", profile.user_id || profile.id) : q.eq("email", profile.email); const { error } = await q; if (error) throw error; mergeProfile(normalise({ ...profile, ...changes })); try { if (typeof loadSecureAdminProfiles === "function") await loadSecureAdminProfiles(true); } catch(_){}
  }
  function installPhotoWorkflow(){
    document.addEventListener("click", async e => { const b = e.target.closest?.(".profile-photo-action"); if (!b) return; e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); const p = pendingPhotos().find(x => clean(x.email) === clean(b.dataset.email || "")); if (!p) return toast("Photo request not found.", "Refresh registrations and try again.", true); b.disabled = true; try { await updatePhotoRecord(p, b.dataset.photoAction === "approve" ? "approve" : "reject"); toast(b.dataset.photoAction === "approve" ? "Profile photo approved." : "Profile photo rejected.", "The member record has been updated."); try { renderNotifications(); renderView("admin"); } catch(_){} } catch(err){ console.error(`[${VERSION}] photo approval failed`, err); toast("Photo approval failed.", err.message || "Please try again.", true); } finally { b.disabled = false; } }, true);
    document.addEventListener("change", async e => { const input = e.target; if (input?.id !== "profilePhotoInput") return; const file = input.files?.[0], user = current(), pb = backend(); if (!file || !user?.id || !pb?.from) return; if (!/^image\/(png|jpeg|webp)$/i.test(file.type) || file.size > 2.5*1024*1024) return; try { const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result || "")); r.onerror = () => rej(new Error("That photo could not be read.")); r.readAsDataURL(file); }); const changes = { profile_photo_pending_url: dataUrl, profile_photo_status: "pending", profile_photo_submitted_at: new Date().toISOString() }; const { error } = await pb.from("profiles").update(changes).eq("user_id", user.id); if (error) throw error; mergeProfile(normalise({ ...user, ...changes })); toast("Profile photo submitted.", "It is waiting for admin approval."); } catch(err){ console.error(`[${VERSION}] photo upload persistence failed`, err); toast("Photo upload was not saved for approval.", "Please try again.", true); } }, true);
  }
  async function refreshProfiles(){
    const pb = backend(); if (!pb?.from) return false;
    try { const since = new Date(Date.now()-15*60*1000).toISOString(); const [pr, pres] = await Promise.all([pb.from("profiles").select("*").order("full_name",{ascending:true}), pb.from("hub_presence").select("*").gte("last_active_at", since).order("last_active_at",{ascending:false})]); if (!pr.error && Array.isArray(pr.data)) pr.data.forEach(r => mergeProfile(normalise(r))); if (!pres.error && Array.isArray(pres.data)) pres.data.forEach(r => mergeProfile(normalise({ user_id:r.user_id, email:r.email, full_name:r.full_name || r.name, online:true, lastActiveAt:r.last_active_at, currentSection:r.current_section }))); try { if (String(window.currentView || currentView || "") === "directory" && typeof bindDirectory === "function") bindDirectory(); } catch(_){} return true; } catch(err){ console.warn(`[${VERSION}] live profile refresh skipped`, err); return false; }
  }
  function addStyles(){
    if ($("#profileSyncLiveRefresh20260724Styles")) return; const style = document.createElement("style"); style.id = "profileSyncLiveRefresh20260724Styles"; style.textContent = `.jp-directory-card{display:grid!important;gap:9px!important;padding:12px!important;border-radius:18px!important;min-height:0!important}.jp-directory-card__top{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center}.jp-directory-card__identity{min-width:0;display:grid;gap:2px}.jp-directory-card__name-row{display:flex;align-items:center;gap:7px;min-width:0}.jp-directory-card__name-row h3{margin:0!important;font-size:16px!important;line-height:1.1!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.jp-directory-card__identity p,.jp-directory-card__identity small{margin:0!important;color:#aeb8c6;font-size:11px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.jp-directory-card__details{display:grid;gap:2px}.jp-directory-card__details strong{font-size:13px}.jp-directory-card__details span{color:#aeb8c6;font-size:12px}.jp-directory-card__details p{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin:2px 0 0!important;color:#b8c3d0;font-size:12px!important;line-height:1.35!important}.jp-directory-role{display:inline-flex;align-items:center;min-height:20px;padding:3px 7px;border-radius:999px;font-size:9px;font-weight:950;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}.jp-directory-role--admin{background:linear-gradient(135deg,#8b6514,#c89b2c,#f3d36a);border:1px solid #168bff;color:#fff}.jp-directory-role--hub{background:#0758d7;border:1px solid #c89b2c;color:#fff}.jp-directory-role--client{background:#0758d7;border:1px solid rgba(255,255,255,.82);color:#fff}.jp-directory-role--pending{background:rgba(245,158,11,.14);border:1px solid rgba(245,158,11,.45);color:#ffd37a}.jp-online-pill{align-self:start;border-radius:999px;padding:4px 7px;background:rgba(255,255,255,.07);color:#aeb8c6;font-size:9px;font-weight:950;text-transform:uppercase}.jp-online-pill.is-online{background:rgba(46,232,135,.12);color:#73e3a4}.jp-directory-avatar{width:50px!important;height:50px!important;min-width:50px!important;border-radius:999px!important;display:grid!important;place-items:center!important;font-weight:950!important;color:#fff!important;overflow:hidden!important}.jp-directory-avatar img{width:100%;height:100%;object-fit:cover}.directory-account-section-pending .directory-account-heading h3{color:#ffd37a}.directory-account-section-admin .directory-account-heading h3{color:#f3d36a}.directory-account-section-hub .directory-account-heading h3{color:#d8bd67}.directory-account-section-client .directory-account-heading h3{color:#78bdff}#memberProfileMenu.open{max-height:calc(100dvh - var(--jp-profile-menu-top,92px) - 12px)!important;overflow-y:auto!important;overflow-x:hidden!important}@media(max-width:430px){.jp-directory-card__top{grid-template-columns:50px minmax(0,1fr)}.jp-online-pill{grid-column:1/-1;justify-self:start}.compact-member-actions{grid-template-columns:1fr 1fr!important}.compact-member-actions button{min-height:42px!important}}`; document.head.appendChild(style);
  }
  function start(){ addStyles(); installPendingPhotoFunction(); installDirectory(); installProfileButtons(); installPhotoWorkflow(); refreshProfiles(); window.jpProfileSyncLiveRefresh = { version: VERSION, refresh: refreshProfiles, profiles: allProfiles, pendingPhotos }; window.addEventListener("focus", refreshProfiles); document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshProfiles(); }); console.info(`[${VERSION}] installed`); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true }); else start();
})();
