(() => {
  "use strict";

  const VERSION = "profile-sync-header-consistency-20260723a";
  if (window.__jpProfileSyncHeaderConsistency === VERSION) return;
  window.__jpProfileSyncHeaderConsistency = VERSION;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const clean = (value) => String(value || "").trim().toLowerCase();
  const esc = (value) => {
    if (typeof escapeHtml === "function") return escapeHtml(value == null ? "" : String(value));
    return String(value == null ? "" : value).replace(/[&<>'"]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#039;", '"':"&quot;" }[char]));
  };

  const profileColumns = "user_id,email,full_name,business,account_type,membership_status,vetted_at,reputation_points,status,removed_at,removal_reason,profile_photo_url,profile_photo_pending_url,profile_photo_status,profile_photo_submitted_at,profile_photo_reviewed_at";
  let syncing = false;
  let lastSync = 0;

  function current() {
    try { return typeof currentUser === "function" ? currentUser() : null; } catch { return null; }
  }

  function roleOf(user = {}) {
    const email = clean(user.email);
    const role = clean(user.role || user.account_type || user.accountType || "client");
    const membership = clean(user.membershipStatus || user.membership_status || "");
    if (email === "jpinnovation.enquiries@gmail.com" || role === "admin") return "admin";
    if (role === "member" && !["", "free", "pending", "rejected", "suspended", "removed"].includes(membership)) return "member";
    if (role === "member" && membership === "active") return "member";
    return "client";
  }

  function initials(user = {}) {
    if (typeof userInitials === "function") return userInitials(user);
    const source = user.name || user.full_name || user.email || "JP";
    return String(source).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "JP";
  }

  function normaliseProfileRow(row = {}) {
    const role = row.account_type || "client";
    const membershipStatus = row.membership_status || (role === "member" ? "active" : "free");
    return {
      id: row.user_id || row.id || clean(row.email),
      userId: row.user_id || row.userId || row.id || "",
      email: clean(row.email),
      name: row.full_name || row.name || row.email || "Member",
      business: row.business || row.company || "",
      role,
      account_type: role,
      membershipStatus,
      membership_status: membershipStatus,
      level: role === "admin" ? "JP Admin" : role === "member" ? "Innovation Hub member" : "Client Portal",
      approved: true,
      verified: role === "admin" || (role === "member" && membershipStatus === "active" && Boolean(row.vetted_at || row.vetted)),
      vetted: Boolean(row.vetted_at || row.vetted),
      reputationPoints: Number(row.reputation_points ?? row.reputationPoints ?? 0),
      status: row.status || "active",
      suspended: row.status === "removed" || membershipStatus === "suspended",
      removedAt: row.removed_at || row.removedAt || "",
      removalReason: row.removal_reason || row.removalReason || "",
      profilePhotoUrl: row.profile_photo_url || row.profilePhotoUrl || "",
      profile_photo_url: row.profile_photo_url || row.profilePhotoUrl || "",
      profilePhotoPendingUrl: row.profile_photo_pending_url || row.profilePhotoPendingUrl || "",
      profile_photo_pending_url: row.profile_photo_pending_url || row.profilePhotoPendingUrl || "",
      profilePhotoStatus: row.profile_photo_status || row.profilePhotoStatus || (row.profile_photo_url || row.profilePhotoUrl ? "approved" : "none"),
      profile_photo_status: row.profile_photo_status || row.profilePhotoStatus || (row.profile_photo_url || row.profilePhotoUrl ? "approved" : "none"),
      profilePhotoSubmittedAt: row.profile_photo_submitted_at || row.profilePhotoSubmittedAt || "",
      profilePhotoReviewedAt: row.profile_photo_reviewed_at || row.profilePhotoReviewedAt || "",
      directoryVisible: true,
      example: false
    };
  }

  function mergeUser(profile) {
    if (!profile?.email || typeof state === "undefined" || !state) return profile;
    state.users ||= [];
    state.members ||= [];
    const apply = (list) => {
      const existing = list.find((item) => clean(item.email) === profile.email || (profile.userId && (item.id === profile.userId || item.userId === profile.userId)));
      if (existing) {
        Object.assign(existing, profile, {
          // Preserve richer editable/public details that are not stored on the profile row.
          location: existing.location || profile.location || "",
          category: existing.category || profile.category || "General Engineering",
          skill: existing.skill || profile.skill || "General Engineering",
          skills: existing.skills || profile.skills || [],
          bio: existing.bio || profile.bio || "",
          availability: existing.availability || profile.availability || ""
        });
        return existing;
      }
      list.push({ ...profile });
      return list[list.length - 1];
    };
    const user = apply(state.users);
    apply(state.members);
    return user;
  }

  function allSharedProfiles() {
    const map = new Map();
    const add = (item) => {
      if (!item) return;
      const profile = item.user_id || item.account_type ? normaliseProfileRow(item) : normaliseProfileRow({
        user_id: item.userId || item.id,
        email: item.email,
        full_name: item.name || item.full_name,
        business: item.business || item.company,
        account_type: item.role || item.account_type,
        membership_status: item.membershipStatus || item.membership_status,
        vetted_at: item.vettedAt || item.vetted_at || (item.vetted ? new Date().toISOString() : ""),
        reputation_points: item.reputationPoints || item.points || 0,
        status: item.status || (item.suspended ? "removed" : "active"),
        profile_photo_url: item.profilePhotoUrl || item.profile_photo_url,
        profile_photo_pending_url: item.profilePhotoPendingUrl || item.profile_photo_pending_url,
        profile_photo_status: item.profilePhotoStatus || item.profile_photo_status
      });
      if (!profile.email || profile.status === "removed" || profile.membershipStatus === "removed") return;
      const key = profile.email || profile.userId;
      const currentValue = map.get(key);
      if (!currentValue || roleOf(profile) === "admin" || (roleOf(profile) === "member" && roleOf(currentValue) === "client")) map.set(key, profile);
    };
    try { if (Array.isArray(secureAdminProfiles)) secureAdminProfiles.forEach(add); } catch {}
    try { (state?.users || []).forEach(add); } catch {}
    try { (state?.members || []).forEach(add); } catch {}
    return Array.from(map.values()).sort((a, b) => {
      const rank = { admin: 0, member: 1, client: 2 };
      return (rank[roleOf(a)] - rank[roleOf(b)]) || String(a.name).localeCompare(String(b.name));
    });
  }

  function approvedPhoto(user = {}) {
    const status = user.profilePhotoStatus || user.profile_photo_status || "none";
    return status === "approved" ? (user.profilePhotoUrl || user.profile_photo_url || "") : "";
  }

  function avatarMarkup(user, className = "profile-avatar") {
    const role = roleOf(user) === "member" ? "hub" : roleOf(user);
    const photo = approvedPhoto(user);
    if (photo) return `<span class="${esc(className)} jp-sync-avatar jp-sync-${esc(role)} has-photo"><img src="${esc(photo)}" alt="${esc(user.name || "Member")} profile photo"></span>`;
    return `<span class="${esc(className)} jp-sync-avatar jp-sync-${esc(role)}">${esc(initials(user))}</span>`;
  }

  function patchAvatarFunction() {
    try {
      window.profileAvatarMarkup = avatarMarkup;
      if (typeof profileAvatarMarkup !== "undefined") profileAvatarMarkup = avatarMarkup;
    } catch {}
  }

  async function fetchProfiles(force = false) {
    if (syncing || !window.portalBackend || !portalBackend.from) return false;
    if (!force && Date.now() - lastSync < 12000) return false;
    syncing = true;
    try {
      const session = await portalBackend.auth?.getSession?.();
      const authUser = session?.data?.session?.user;
      if (!authUser) return false;
      const currentUserEmail = clean(authUser.email);
      let rows = [];
      try {
        const result = await portalBackend.from("profiles").select(profileColumns).order("email", { ascending: true });
        if (!result.error && Array.isArray(result.data)) rows = result.data;
      } catch (error) { console.warn(`[${VERSION}] full profile sync not available`, error); }
      if (!rows.length) {
        try {
          const mine = await portalBackend.from("profiles").select(profileColumns).eq("email", currentUserEmail).maybeSingle();
          if (!mine.error && mine.data) rows = [mine.data];
        } catch (error) { console.warn(`[${VERSION}] current profile sync not available`, error); }
      }
      if (!rows.length) return false;
      rows.map(normaliseProfileRow).forEach((profile) => {
        mergeUser(profile);
        try {
          if (Array.isArray(secureAdminProfiles)) {
            const index = secureAdminProfiles.findIndex((item) => clean(item.email) === profile.email || item.user_id === profile.userId);
            const row = {
              user_id: profile.userId || profile.id,
              email: profile.email,
              full_name: profile.name,
              business: profile.business,
              account_type: profile.role,
              membership_status: profile.membershipStatus,
              vetted_at: profile.vetted ? new Date().toISOString() : "",
              reputation_points: profile.reputationPoints,
              status: profile.status,
              removed_at: profile.removedAt,
              removal_reason: profile.removalReason,
              profile_photo_url: profile.profilePhotoUrl,
              profile_photo_pending_url: profile.profilePhotoPendingUrl,
              profile_photo_status: profile.profilePhotoStatus,
              profile_photo_submitted_at: profile.profilePhotoSubmittedAt,
              profile_photo_reviewed_at: profile.profilePhotoReviewedAt
            };
            if (index >= 0) secureAdminProfiles[index] = Object.assign(secureAdminProfiles[index], row);
            else secureAdminProfiles.push(row);
          }
        } catch {}
      });
      try { if (typeof saveState === "function") saveState(); } catch {}
      lastSync = Date.now();
      return true;
    } finally {
      syncing = false;
    }
  }

  function roleLabel(user) {
    const role = roleOf(user);
    return role === "admin" ? "JP Admin" : role === "member" ? "Hub Member" : "Client Portal";
  }

  function roleClass(user) { return roleOf(user) === "member" ? "hub" : roleOf(user); }

  function compactMemberCard(user) {
    const email = clean(user.email);
    const photo = avatarMarkup(user, "directory-avatar profile-avatar");
    const category = user.category || user.skill || "General Engineering";
    const location = user.location || "Location TBC";
    const skills = Array.isArray(user.skills) && user.skills.length ? user.skills.slice(0, 3) : [category].filter(Boolean);
    const reviews = Number(user.approvedPositiveReviews || 0);
    return `<article class="member-card jp-sync-member-card role-${esc(roleClass(user))}">
      <div class="member-card-main">
        <span class="member-avatar-wrap">${photo}</span>
        <div class="member-card-copy">
          <div class="member-name-row"><h3>${esc(user.name || "Member")}</h3><span class="jp-sync-role-pill role-${esc(roleClass(user))}">${esc(roleLabel(user))}</span></div>
          <p class="member-business">${esc(user.business || user.level || roleLabel(user))}</p>
          <p class="member-meta-line">${esc(category)} • ${esc(location)}</p>
          <p class="member-bio">${esc(user.bio || `${roleLabel(user)} account.`)}</p>
          <div class="skill-list">${skills.map((skill) => `<span>${esc(skill)}</span>`).join("")}</div>
          <p class="member-reputation-line">${Number(user.reputationPoints || user.points || 0)} pts • ${reviews ? `${reviews} approved review${reviews === 1 ? "" : "s"}` : "No reviews yet"}</p>
        </div>
      </div>
      <div class="member-card-actions">
        <button class="secondary-button message-member-button" data-member-email="${esc(email)}" data-member-name="${esc(user.name || "Member")}" type="button">Message</button>
        <button class="primary-button view-member-profile-button" data-member-email="${esc(email)}" type="button">View profile</button>
      </div>
    </article>`;
  }

  function bindDirectoryOverride() {
    const results = $("#directoryResults");
    if (!results) return;
    const skill = $("#skillFilter");
    const location = $("#locationFilter");
    const verified = $("#verifiedFilter");
    const render = () => {
      const skillTerm = clean(skill?.value || "");
      const locationTerm = clean(location?.value || "");
      const verifiedOnly = Boolean(verified?.checked);
      const members = allSharedProfiles().filter((member) => {
        if (verifiedOnly && !member.verified && roleOf(member) !== "admin") return false;
        const skillText = clean([member.skill, member.category, ...(Array.isArray(member.skills) ? member.skills : [])].join(" "));
        const locationText = clean(member.location || "");
        return (!skillTerm || skillText.includes(skillTerm) || clean(member.name).includes(skillTerm) || clean(member.business).includes(skillTerm)) && (!locationTerm || locationText.includes(locationTerm));
      });
      results.innerHTML = members.length ? members.map(compactMemberCard).join("") : `<p class="muted">No matching members found.</p>`;
      $$(".message-member-button", results).forEach((button) => button.addEventListener("click", () => {
        try {
          messageDraftRecipientEmail = button.dataset.memberEmail || "";
          if (typeof renderView === "function") renderView("messages");
        } catch {}
      }));
      $$(".view-member-profile-button", results).forEach((button) => button.addEventListener("click", () => {
        const member = allSharedProfiles().find((item) => clean(item.email) === clean(button.dataset.memberEmail));
        try { if (typeof renderMemberProfile === "function") renderMemberProfile(member); } catch {}
      }));
    };
    [skill, location, verified].filter(Boolean).forEach((input) => input.addEventListener("input", render));
    verified?.addEventListener("change", render);
    render();
  }

  function patchDirectoryBinding() {
    try {
      window.bindDirectory = bindDirectoryOverride;
      if (typeof bindDirectory !== "undefined") bindDirectory = bindDirectoryOverride;
    } catch {}
    bindDirectoryOverride();
  }

  function updateVisibleAvatars() {
    const user = current();
    if (!user) return;
    const merged = mergeUser(normaliseProfileRow({
      user_id: user.userId || user.id,
      email: user.email,
      full_name: user.name,
      business: user.business,
      account_type: user.role,
      membership_status: user.membershipStatus,
      vetted_at: user.vetted ? new Date().toISOString() : "",
      reputation_points: user.reputationPoints || user.points || 0,
      status: user.status,
      profile_photo_url: user.profilePhotoUrl || user.profile_photo_url,
      profile_photo_pending_url: user.profilePhotoPendingUrl || user.profile_photo_pending_url,
      profile_photo_status: user.profilePhotoStatus || user.profile_photo_status
    }));
    const photo = approvedPhoto(merged);
    const content = photo ? `<img src="${esc(photo)}" alt="${esc(merged.name || "Member")} profile photo">` : esc(initials(merged));
    [$("#memberInitials"), $("#profileMenuAvatar")].forEach((node) => {
      if (!node) return;
      node.innerHTML = content;
      node.classList.toggle("has-photo", Boolean(photo));
      node.classList.add("jp-sync-avatar", `jp-sync-${roleClass(merged)}`);
    });
  }

  function addStyles() {
    if ($("#jpProfileSyncHeaderConsistencyStyles")) return;
    const style = document.createElement("style");
    style.id = "jpProfileSyncHeaderConsistencyStyles";
    style.textContent = `
      :root{--jp-shared-mobile-logo-w:clamp(300px,58vw,420px);--jp-shared-header-pad-y:14px;--jp-shared-control-h:58px;--jp-shared-control-radius:18px;--jp-premium-blue:#075bd4;--jp-premium-blue-dark:#041f50;--jp-ring-blue:#168bff;--jp-premium-gold:#b78a26;--jp-gold-dark:#70500f;--jp-gold-hi:#e7c45e}
      .portal-header,.hub-header,.workspace-header{box-sizing:border-box!important}.portal-header .brand img,.hub-header .brand img,.workspace-mobile-logo img{width:var(--jp-shared-mobile-logo-w)!important;max-width:calc(100vw - 44px)!important;height:auto!important;margin-inline:auto!important}.portal-header,.hub-header{padding:var(--jp-shared-header-pad-y) 22px 14px!important;gap:12px!important}.portal-header .public-nav,.hub-header .public-nav{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;width:100%!important}.home-icon-button,.section-switch-button,#mobileMenuButton,#dashboardHomeButton,.notification-bell,.member-chip{min-height:var(--jp-shared-control-h)!important;height:var(--jp-shared-control-h)!important;border-radius:var(--jp-shared-control-radius)!important;box-sizing:border-box!important}.section-switch-button{padding:0 16px!important}.workspace-header{gap:12px!important}.workspace-mobile-logo{display:flex!important;justify-content:center!important;width:100%!important}.workspace-header-actions{align-items:center!important;gap:12px!important}
      .jp-sync-avatar{--avatar-size:44px;width:var(--avatar-size)!important;height:var(--avatar-size)!important;min-width:var(--avatar-size)!important;aspect-ratio:1/1!important;border-radius:50%!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important;box-sizing:border-box!important;font-weight:950!important;line-height:1!important;letter-spacing:.01em!important;color:#fff!important;text-shadow:0 1px 3px rgba(0,0,0,.45)!important}.jp-sync-avatar img{width:100%!important;height:100%!important;object-fit:cover!important;border-radius:inherit!important}.jp-sync-avatar.jp-sync-admin{background:radial-gradient(circle at 35% 28%,var(--jp-gold-hi) 0%,var(--jp-premium-gold) 42%,var(--jp-gold-dark) 100%)!important;border:3px solid var(--jp-ring-blue)!important;box-shadow:inset 0 1px 4px rgba(255,255,255,.42),inset 0 -5px 9px rgba(45,31,5,.48),0 6px 15px rgba(22,139,255,.2)!important}.jp-sync-avatar.jp-sync-hub,.jp-sync-avatar.jp-sync-member{background:radial-gradient(circle at 36% 25%,#168bff 0%,#0756bd 48%,#05285f 100%)!important;border:3px solid var(--jp-premium-gold)!important}.jp-sync-avatar.jp-sync-client{background:radial-gradient(circle at 36% 25%,#168bff 0%,#0756bd 48%,#05285f 100%)!important;border:3px solid rgba(255,255,255,.9)!important}
      .jp-sync-role-pill{display:inline-flex;align-items:center;max-width:100%;min-height:23px;padding:3px 9px;border-radius:999px;font-size:.68rem;font-weight:950;letter-spacing:.055em;text-transform:uppercase;white-space:nowrap;line-height:1}.jp-sync-role-pill.role-admin{color:#fff;background:linear-gradient(135deg,var(--jp-gold-dark),var(--jp-premium-gold),var(--jp-gold-hi));border:1px solid var(--jp-ring-blue)}.jp-sync-role-pill.role-hub{color:#fff;background:linear-gradient(135deg,#08285a,#0a63d7);border:1px solid var(--jp-premium-gold)}.jp-sync-role-pill.role-client{color:#fff;background:linear-gradient(135deg,#092a60,#0a64d9);border:1px solid rgba(255,255,255,.75)}
      .jp-sync-member-card{display:grid;gap:10px;padding:12px!important;border-radius:20px!important;background:linear-gradient(145deg,rgba(16,25,32,.94),rgba(5,9,14,.92))!important;border:1px solid rgba(255,255,255,.12)!important;min-height:0!important}.jp-sync-member-card.role-admin{border-color:rgba(183,138,38,.5)!important}.member-card-main{display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;align-items:start}.directory-avatar{--avatar-size:50px!important}.member-card-copy{min-width:0;display:grid;gap:4px}.member-name-row{display:flex;align-items:center;gap:7px;min-width:0;flex-wrap:wrap}.member-name-row h3{margin:0!important;font-size:1.05rem!important;line-height:1.08!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.member-business,.member-meta-line,.member-bio,.member-reputation-line{margin:0!important;color:#aeb9c8!important;line-height:1.25!important}.member-business,.member-meta-line{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}.member-bio{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.skill-list{display:flex;flex-wrap:wrap;gap:5px}.skill-list span{padding:5px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.13);font-size:.75rem;font-weight:850}.member-card-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.member-card-actions button{min-height:42px!important;border-radius:13px!important;padding:0 10px!important;font-size:.86rem!important}
      @media(max-width:760px){.portal-header,.hub-header{padding:12px 22px 12px!important}.workspace-header{padding:12px 22px 12px!important}.portal-header .brand,.hub-header .brand,.workspace-mobile-logo{margin-bottom:2px!important}.portal-header .public-nav,.hub-header .public-nav{min-height:var(--jp-shared-control-h)!important}.workspace-heading{margin-top:2px!important}.workspace-heading h1,#viewTitle{font-size:clamp(32px,8vw,46px)!important;line-height:1.05!important}.workspace-header-actions{width:100%!important;display:grid!important;grid-template-columns:auto auto 1fr!important}.account-control-cluster{justify-self:end!important}.member-profile-control{display:flex!important}.member-chip{width:58px!important;min-width:58px!important;padding:0!important}.notification-bell{width:58px!important;min-width:58px!important}.member-chip .jp-sync-avatar,#memberInitials.jp-sync-avatar{--avatar-size:46px!important}}
    `;
    document.head.appendChild(style);
  }

  function install() {
    addStyles();
    patchAvatarFunction();
    updateVisibleAvatars();
    patchDirectoryBinding();
    fetchProfiles(false).then((changed) => {
      patchAvatarFunction();
      updateVisibleAvatars();
      if (changed && (new URLSearchParams(location.search).get("view") === "directory" || /Member Directory/i.test($("#viewTitle")?.textContent || ""))) patchDirectoryBinding();
    }).catch((error) => console.warn(`[${VERSION}] sync failed`, error));
  }

  window.addEventListener("focus", () => fetchProfiles(true).then(() => { updateVisibleAvatars(); patchDirectoryBinding(); }).catch(() => {}));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) fetchProfiles(true).then(() => { updateVisibleAvatars(); patchDirectoryBinding(); }).catch(() => {}); });
  document.addEventListener("DOMContentLoaded", install, { once: true });
  if (document.readyState !== "loading") install();
  new MutationObserver(() => { updateVisibleAvatars(); if ($("#directoryResults")) patchDirectoryBinding(); }).observe(document.body, { childList: true, subtree: true });
  console.info(`[${VERSION}] installed`);
})();
