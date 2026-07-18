/* JP Innovation directory/profile/analytics fix: grouped accounts, real profile view, safer analytics reset. */
(function () {
  const esc = (value) => typeof escapeHtml === "function" ? escapeHtml(value) : String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
  const arr = (value) => Array.isArray(value) ? value : [];
  const clean = (value) => typeof cleanEmailValue === "function" ? cleanEmailValue(value || "") : String(value || "").trim().toLowerCase();
  let activeDirectoryType = "all";
  let openingProfile = false;

  function addFixStyles() {
    if (document.getElementById("directoryProfileMetricsFixStyles")) return;
    const style = document.createElement("style");
    style.id = "directoryProfileMetricsFixStyles";
    style.textContent = `
      .directory-account-filters { display:flex; flex-wrap:wrap; gap:7px; margin-top:12px; }
      .directory-account-filter { min-height:34px; padding:7px 10px; border-radius:999px; border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.035); color:#d7e4f4; font-size:11px; font-weight:900; letter-spacing:.01em; }
      .directory-account-filter.active { border-color:rgba(47,141,255,.7); background:rgba(47,141,255,.17); color:#fff; box-shadow:0 0 0 1px rgba(47,141,255,.18); }
      #directoryResults.directory-results-grouped { display:grid; grid-template-columns:1fr; gap:14px!important; }
      .directory-account-section { display:grid; gap:10px; }
      .directory-account-heading { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:4px 2px; }
      .directory-account-heading h3 { margin:0; color:#fff; font-size:13px; line-height:1.1; letter-spacing:.1em; text-transform:uppercase; }
      .directory-account-heading span { padding:5px 9px; border-radius:999px; border:1px solid rgba(255,255,255,.1); color:#aeb8c6; font-size:10px; font-weight:900; }
      .directory-account-cards { display:grid; gap:12px; grid-template-columns:repeat(auto-fit,minmax(min(100%,290px),1fr)); }
      .member-card.member-compact-card.role-admin { border-color:rgba(250,204,21,.38)!important; border-left-color:#facc15!important; background:radial-gradient(circle at 15% 8%,rgba(250,204,21,.13),transparent 34%),linear-gradient(145deg,rgba(20,18,12,.98),rgba(4,8,13,.99))!important; }
      .member-card.member-compact-card.role-hub { border-color:rgba(250,204,21,.28)!important; border-left-color:#eab308!important; }
      .member-card.member-compact-card.role-client { border-color:rgba(47,141,255,.35)!important; border-left-color:#2f8dff!important; }
      .compact-role-star { display:inline-grid; place-items:center; width:21px; height:21px; border-radius:999px; font-size:13px; line-height:1; font-weight:900; flex:0 0 auto; }
      .compact-role-star.admin { color:#facc15; border:1px solid rgba(250,204,21,.82); background:rgba(250,204,21,.08); text-shadow:0 0 12px rgba(250,204,21,.5); }
      .compact-role-star.hub { color:#140f00; border:1px solid rgba(250,204,21,.85); background:linear-gradient(135deg,#ffe074,#eab308); }
      .compact-role-star.client { color:#fff; border:1px solid rgba(80,170,255,.8); background:linear-gradient(135deg,#2f8dff,#0758d7); }
      .compact-role-pill { display:inline-flex; align-items:center; min-height:22px; padding:5px 8px; border-radius:999px; border:1px solid rgba(255,255,255,.1); font-size:9px; font-weight:950; letter-spacing:.07em; text-transform:uppercase; }
      .compact-role-pill.admin { color:#ffe38a; border-color:rgba(250,204,21,.42); background:rgba(250,204,21,.09); }
      .compact-role-pill.hub { color:#f7d46a; border-color:rgba(250,204,21,.3); background:rgba(250,204,21,.08); }
      .compact-role-pill.client { color:#78bdff; border-color:rgba(47,141,255,.34); background:rgba(47,141,255,.1); }
      .compact-member-title-line { display:flex; align-items:center; gap:6px; min-width:0; }
      .compact-member-title-line .compact-member-name { min-width:0; }
      .public-profile-card { display:grid; gap:14px; border-left-width:3px; }
      .public-profile-card.role-admin { border-left-color:#facc15; }
      .public-profile-card.role-hub { border-left-color:#eab308; }
      .public-profile-card.role-client { border-left-color:#2f8dff; }
      .public-profile-top { display:grid; grid-template-columns:64px minmax(0,1fr); gap:12px; align-items:center; }
      .public-profile-top .profile-avatar { width:64px; height:64px; border-radius:18px; font-size:24px; }
      .public-profile-name { margin:0; font-size:24px; letter-spacing:-.035em; }
      .public-profile-badges,.public-profile-chip-row,.public-profile-actions { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
      .public-profile-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:10px; }
      .public-profile-info { padding:12px; border-radius:14px; border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.035); }
      .public-profile-info small { display:block; color:#8fa1b6; font-size:10px; font-weight:900; letter-spacing:.08em; text-transform:uppercase; }
      .public-profile-info strong { display:block; margin-top:4px; color:#fff; font-size:13px; line-height:1.35; }
      .analytics-reset-button.is-loading { opacity:.72; pointer-events:none; }
      .analytics-reset-button.is-loading::after { content:""; display:inline-block; width:12px; height:12px; margin-left:8px; border-radius:50%; border:2px solid currentColor; border-top-color:transparent; vertical-align:-2px; animation:jpSpin .8s linear infinite; }
      @keyframes jpSpin { to { transform:rotate(360deg); } }
      @media(max-width:430px){.directory-tools{gap:10px}.directory-account-filters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.directory-account-filter{width:100%;padding:8px 7px}.directory-account-cards{gap:11px}.compact-member-kickers{gap:5px}.compact-role-star{width:19px;height:19px;font-size:12px}.public-profile-name{font-size:21px}.public-profile-top{grid-template-columns:56px minmax(0,1fr)}.public-profile-top .profile-avatar{width:56px;height:56px}}
    `;
    document.head.appendChild(style);
  }

  function accountRole(member) {
    const role = String(member?.role || member?.account_type || "").toLowerCase();
    const status = String(member?.membershipStatus || member?.membership_status || "").toLowerCase();
    const level = String(member?.level || "").toLowerCase();
    if (role === "admin" || level.includes("admin")) return "admin";
    if (role === "member" || status === "active" || status === "approved") return "hub";
    return "client";
  }

  function roleLabelFromType(type) {
    if (type === "admin") return "Admin";
    if (type === "hub") return "Hub Member";
    return "Client Portal";
  }

  function roleStar(type) {
    return '<span class="compact-role-star ' + esc(type) + '" title="' + esc(roleLabelFromType(type)) + '" aria-label="' + esc(roleLabelFromType(type)) + ' account">&#9733;</span>';
  }

  function rolePill(type) {
    return '<span class="compact-role-pill ' + esc(type) + '">' + esc(roleLabelFromType(type)) + '</span>';
  }

  function sourceProfiles() {
    const map = new Map();
    function add(member) {
      if (!member) return;
      const email = clean(member.email);
      const id = member.id || member.user_id || email || Math.random().toString(36).slice(2);
      const key = member.id || member.user_id || email || id;
      const normalised = {
        ...member,
        id,
        user_id: member.user_id || member.id || "",
        email,
        name: member.name || member.full_name || (email ? email.split("@")[0] : "Member"),
        business: member.business || member.company || "",
        role: member.role || member.account_type || "client",
        membershipStatus: member.membershipStatus || member.membership_status || (member.account_type === "client" ? "free" : "active"),
        skill: member.skill || member.skills || member.preferredWork || "General Engineering",
        location: member.location || "Location TBC",
        equipment: member.equipment || "Not listed",
        bio: member.bio || member.about || "Innovation Hub member.",
        directoryVisible: member.directoryVisible !== false
      };
      map.set(key, { ...(map.get(key) || {}), ...normalised });
    }
    if (typeof secureAdminProfiles !== "undefined" && Array.isArray(secureAdminProfiles) && secureAdminProfiles.length) {
      secureAdminProfiles.forEach((profile) => add(typeof secureProfileUser === "function" ? secureProfileUser(profile) : profile));
    }
    arr(state?.users).forEach(add);
    arr(state?.members).forEach(add);
    return Array.from(map.values()).filter((member) => member.directoryVisible !== false && !member.suspended);
  }

  function compactMemberCardFixed(member) {
    addFixStyles();
    const viewer = typeof currentUser === "function" ? currentUser() : null;
    const type = accountRole(member);
    const online = typeof isMemberOnline === "function" ? isMemberOnline(member, viewer) : clean(member.email) === clean(viewer?.email);
    const reviews = typeof approvedReviewsFor === "function" ? approvedReviewsFor(member) : [];
    const points = Number(member.reputationPoints ?? member.points ?? 0);
    const reviewSummary = reviews.length ? `${reviews.length} review${reviews.length === 1 ? "" : "s"}` : "No approved reviews yet";
    const avatar = typeof profileAvatarMarkup === "function" ? profileAvatarMarkup(member, "profile-avatar") : '<span class="profile-avatar">' + esc(String(member.name || "M").slice(0, 2).toUpperCase()) + "</span>";
    const mainCategory = String(member.skill || "General Engineering").split(",")[0].trim() || "General Engineering";
    const skills = String(member.skill || "General Engineering").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 3);
    const profileId = member.id || member.user_id || "";
    return '<article class="member-card member-compact-card role-' + esc(type) + '">' +
      '<div class="compact-member-top"><span class="compact-avatar-wrap ' + (online ? "is-online" : "") + '">' + avatar + '</span><div class="compact-member-copy">' +
      '<div class="compact-member-kickers">' + rolePill(type) + '</div>' +
      '<div class="compact-member-title-line"><h3 class="compact-member-name">' + esc(member.name || "Member") + "</h3>" + roleStar(type) + '</div>' +
      '<p class="compact-member-business">' + esc(member.business || member.level || "Independent member") + "</p></div></div>" +
      '<div class="compact-member-copy"><p class="compact-member-category">' + esc(mainCategory) + '</p><p class="compact-member-location">' + esc(member.location || "Location TBC") + '</p><p class="compact-member-bio">' + esc(member.bio || "Innovation Hub member.") + "</p></div>" +
      '<div class="compact-chip-row">' + skills.map((skill) => '<span class="pill">' + esc(skill) + "</span>").join("") + "</div>" +
      '<div class="compact-member-stats"><span>' + points + " pts</span><span>" + esc(reviewSummary) + "</span></div>" +
      '<div class="compact-member-actions"><button class="secondary-button message-member-button" data-member-email="' + esc(member.email || "") + '" type="button">Message</button><button class="primary-button view-profile-button" type="button" data-profile-member-id="' + esc(profileId) + '" data-profile-member-email="' + esc(member.email || "") + '">View profile</button></div></article>';
  }

  if (typeof memberCard === "function") memberCard = compactMemberCardFixed;

  function matchesDirectoryFilters(member, skillTerm, locationTerm, verifiedOnly) {
    const skillText = String(member.skill || member.skills || "").toLowerCase();
    const locationText = String(member.location || "").toLowerCase();
    const tier = typeof memberReputationTier === "function" ? memberReputationTier(member) : (member.verified ? "blue" : "none");
    const verifiedMatch = !verifiedOnly || tier !== "none" || member.verified || member.vetted;
    const type = accountRole(member);
    const typeMatch = activeDirectoryType === "all" ||
      (activeDirectoryType === "admin" && type === "admin") ||
      (activeDirectoryType === "hub" && type === "hub") ||
      (activeDirectoryType === "client" && type === "client") ||
      (activeDirectoryType === "verified" && verifiedMatch && (tier !== "none" || member.verified || member.vetted)) ||
      (activeDirectoryType === "online" && (typeof isMemberOnline === "function" ? isMemberOnline(member, currentUser()) : clean(member.email) === clean(currentUser()?.email)));
    return typeMatch && (!skillTerm || skillText.includes(skillTerm)) && (!locationTerm || locationText.includes(locationTerm)) && verifiedMatch;
  }

  function directoryFiltersHtml() {
    const filters = [
      ["all", "All"],
      ["admin", "Admins"],
      ["hub", "Hub Members"],
      ["client", "Client Portal"],
      ["verified", "Blue Verified"],
      ["online", "Online"]
    ];
    return '<div class="directory-account-filters" aria-label="Account type filters">' + filters.map(([value, label]) => '<button class="directory-account-filter ' + (activeDirectoryType === value ? "active" : "") + '" data-directory-type="' + value + '" type="button">' + label + "</button>").join("") + "</div>";
  }

  function groupedDirectoryHtml(members) {
    const groups = [
      ["admin", "Admin accounts", members.filter((member) => accountRole(member) === "admin")],
      ["hub", "Paid Innovation Hub members", members.filter((member) => accountRole(member) === "hub")],
      ["client", "Free Client Portal members", members.filter((member) => accountRole(member) === "client")]
    ];
    const visible = groups.filter(([, , list]) => list.length);
    if (!visible.length) return '<p class="muted">No matching members found.</p>';
    return visible.map(([type, title, list]) => '<section class="directory-account-section directory-account-section-' + type + '"><div class="directory-account-heading"><h3>' + esc(title) + '</h3><span>' + list.length + '</span></div><div class="directory-account-cards">' + list.map(compactMemberCardFixed).join("") + "</div></section>").join("");
  }

  bindDirectory = function bindDirectoryFixed() {
    addFixStyles();
    const skill = document.querySelector("#skillFilter");
    const location = document.querySelector("#locationFilter");
    const verified = document.querySelector("#verifiedFilter");
    const results = document.querySelector("#directoryResults");
    const tools = document.querySelector(".directory-tools");
    if (!skill || !location || !verified || !results || !tools) return;
    if (!document.querySelector(".directory-account-filters")) tools.insertAdjacentHTML("afterend", directoryFiltersHtml());
    const render = () => {
      document.querySelectorAll(".directory-account-filter").forEach((button) => button.classList.toggle("active", button.dataset.directoryType === activeDirectoryType));
      const skillTerm = skill.value.trim().toLowerCase();
      const locationTerm = location.value.trim().toLowerCase();
      const verifiedOnly = verified.checked;
      const members = sourceProfiles().filter((member) => matchesDirectoryFilters(member, skillTerm, locationTerm, verifiedOnly));
      results.classList.add("directory-results-grouped");
      results.innerHTML = groupedDirectoryHtml(members);
      results.querySelectorAll(".message-member-button").forEach((button) => button.addEventListener("click", () => {
        messageDraftRecipientEmail = button.dataset.memberEmail || "";
        activeMessageConversationKey = "";
        renderView("messages");
      }));
      if (typeof bindMemberReviewForms === "function") bindMemberReviewForms(results);
    };
    [skill, location, verified].forEach((input) => input.addEventListener("input", render));
    verified.addEventListener("change", render);
    document.querySelectorAll(".directory-account-filter").forEach((button) => button.addEventListener("click", () => {
      activeDirectoryType = button.dataset.directoryType || "all";
      render();
    }));
    render();
  };

  function findMember(id, email) {
    const idClean = String(id || "");
    const emailClean = clean(email);
    return sourceProfiles().find((member) => String(member.id || member.user_id || "") === idClean || (emailClean && clean(member.email) === emailClean));
  }

  async function loadMemberProfile(id, email) {
    let member = findMember(id, email);
    if (member) return member;
    if (portalBackend && id) {
      const { data, error } = await portalBackend
        .from("profiles")
        .select("user_id,email,full_name,business,account_type,membership_status,vetted_at,reputation_points,status,profile_photo_url")
        .eq("user_id", id)
        .maybeSingle();
      if (error) throw error;
      if (data) return typeof secureProfileUser === "function" ? secureProfileUser(data) : data;
    }
    throw new Error("Member profile could not be loaded.");
  }

  function publicProfileHtml(member) {
    const type = accountRole(member);
    const avatar = typeof profileAvatarMarkup === "function" ? profileAvatarMarkup(member, "profile-avatar") : '<span class="profile-avatar">' + esc(String(member.name || "M").slice(0, 2).toUpperCase()) + "</span>";
    const skills = String(member.skill || "General Engineering").split(",").map((item) => item.trim()).filter(Boolean);
    const reviews = typeof approvedReviewsFor === "function" ? approvedReviewsFor(member) : [];
    const points = Number(member.reputationPoints ?? member.points ?? 0);
    return '<section class="section-card public-profile-card role-' + esc(type) + '">' +
      '<button id="backToDirectory" class="secondary-button" type="button">Back to directory</button>' +
      '<div class="public-profile-top">' + avatar + '<div><div class="public-profile-badges">' + rolePill(type) + roleStar(type) + '</div><h2 class="public-profile-name">' + esc(member.name || "Member") + '</h2><p class="muted">' + esc(member.business || member.level || "Independent member") + "</p></div></div>" +
      '<div class="public-profile-grid">' +
      '<div class="public-profile-info"><small>Engineering role</small><strong>' + esc(String(member.skill || "General Engineering").split(",")[0].trim() || "General Engineering") + "</strong></div>" +
      '<div class="public-profile-info"><small>Location</small><strong>' + esc(member.location || "Location TBC") + "</strong></div>" +
      '<div class="public-profile-info"><small>Reputation</small><strong>' + points + " pts - " + (reviews.length ? reviews.length + " approved review" + (reviews.length === 1 ? "" : "s") : "No approved reviews yet") + "</strong></div>" +
      '<div class="public-profile-info"><small>Availability</small><strong>' + esc(member.capacity || member.preferredWork || "Availability TBC") + "</strong></div>" +
      "</div>" +
      '<div><h3>About</h3><p class="muted">' + esc(member.bio || "No profile biography has been added yet.") + "</p></div>" +
      '<div><h3>Skills</h3><div class="public-profile-chip-row">' + (skills.length ? skills.map((skill) => '<span class="pill">' + esc(skill) + "</span>").join("") : '<span class="pill">General Engineering</span>') + "</div></div>" +
      '<div class="public-profile-actions"><button class="secondary-button message-member-button" data-member-email="' + esc(member.email || "") + '" type="button">Message</button></div>' +
      "</section>";
  }

  async function openPublicMemberProfile(button) {
    if (openingProfile) return;
    openingProfile = true;
    const original = button?.textContent || "";
    if (button) {
      button.disabled = true;
      button.textContent = "Opening...";
    }
    try {
      const member = await loadMemberProfile(button?.dataset.profileMemberId || "", button?.dataset.profileMemberEmail || "");
      const mount = document.querySelector("#viewMount");
      const title = document.querySelector("#viewTitle");
      if (!mount) throw new Error("Profile area is not available.");
      currentView = "memberprofile";
      if (title) title.textContent = "Member Profile";
      mount.dataset.view = "memberprofile";
      mount.innerHTML = publicProfileHtml(member);
      window.history.replaceState({}, document.title, `${location.pathname}?entry=${encodeURIComponent(entryMode || "hub")}&view=memberprofile&member=${encodeURIComponent(member.id || member.user_id || member.email || "")}`);
      mount.querySelector("#backToDirectory")?.addEventListener("click", () => renderView("directory"));
      mount.querySelectorAll(".message-member-button").forEach((messageButton) => messageButton.addEventListener("click", () => {
        messageDraftRecipientEmail = messageButton.dataset.memberEmail || "";
        activeMessageConversationKey = "";
        renderView("messages");
      }));
    } catch (error) {
      console.error("Member profile open failed", error);
      (window.showErrorToast || window.showSuccessToast)?.("Profile could not be opened.", "Please try again.");
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = original;
      }
      openingProfile = false;
    }
  }

  window.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-profile-member-id], [data-profile-member-email]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openPublicMemberProfile(button);
  }, true);

  bindAnalyticsResetButtons = function bindAnalyticsResetButtonsFixed() {
    document.querySelectorAll(".analytics-reset-button").forEach((button) => {
      if (button.dataset.safeResetBound === "1") return;
      button.dataset.safeResetBound = "1";
      button.addEventListener("click", async () => {
        const scope = button.dataset.resetScope || "all";
        const firstMessage = scope === "today"
          ? "Reset today's visitor analytics? Member and Hub data will not be affected."
          : "Permanently clear all recorded visitor analytics? This cannot be undone. Member accounts, posts, quotes and projects will remain.";
        const confirmed = await openConfirmDialog({
          title: scope === "today" ? "Reset today's analytics?" : "Reset all visitor analytics?",
          message: firstMessage,
          confirmLabel: scope === "today" ? "Reset today" : "Continue",
          cancelLabel: "Cancel",
          danger: true
        });
        if (!confirmed) return;
        if (scope === "all") {
          const second = await openConfirmDialog({
            title: "Final confirmation",
            message: "This only clears visitor/page-view analytics, but it cannot be undone. Continue with reset all?",
            confirmLabel: "Yes, reset all",
            cancelLabel: "Cancel",
            danger: true
          });
          if (!second) return;
        }
        button.disabled = true;
        button.classList.add("is-loading");
        try {
          if (!portalBackend) throw new Error("Secure backend is unavailable.");
          const { data, error } = await portalBackend.rpc("admin_reset_site_analytics", { p_scope: scope });
          if (error) throw error;
          const deleted = Number(data?.deleted || 0);
          showSuccessToast("Analytics reset.", scope === "today" ? `Today's visitor analytics were cleared (${deleted} row${deleted === 1 ? "" : "s"}).` : `Visitor analytics history was cleared (${deleted} row${deleted === 1 ? "" : "s"}).`);
          await loadSiteAnalytics();
        } catch (error) {
          console.error("Analytics reset failed", { scope, message: error?.message, details: error?.details, hint: error?.hint, code: error?.code, error });
          const missing = /admin_reset_site_analytics|schema cache|Could not find the function|PGRST202/i.test(error?.message || "");
          (window.showErrorToast || showSuccessToast)(missing ? "Analytics reset setup is missing." : "Analytics could not be reset.", missing ? "Run the analytics reset SQL once in Supabase, then try again." : "Please try again.");
        } finally {
          button.disabled = false;
          button.classList.remove("is-loading");
        }
      });
    });
  };

  window.addEventListener("load", () => {
    addFixStyles();
    if (typeof currentView !== "undefined" && currentView === "directory" && typeof bindDirectory === "function") bindDirectory();
    if (typeof currentView !== "undefined" && currentView === "metrics" && typeof bindAnalyticsResetButtons === "function") bindAnalyticsResetButtons();
  });
})();
