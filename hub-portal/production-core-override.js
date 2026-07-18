/* JP Innovation production core override: upgrade requests, admin access actions, notifications and premium member cards. */
(function () {
  const esc = (value) => typeof escapeHtml === "function" ? escapeHtml(value) : String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);
  const safeArr = (value) => Array.isArray(value) ? value : [];
  const jpIcon = "/assets/jp-app-icon-192.png?v=jp-notification-20260718";
  const jpBadge = "/assets/jp-notification-badge.svg?v=jp-notification-20260718";

  function toast(title, detail, isError) {
    const fn = isError ? window.showErrorToast : window.showSuccessToast;
    if (typeof fn === "function") fn(title, detail);
  }

  function shieldIcon() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 6v5c0 4.7-2.7 8-7 10-4.3-2-7-5.3-7-10V6z"/><path d="m8.7 12.2 2.1 2.1 4.6-5"/></svg>'; }

  function addProductionStyles() {
    if (document.getElementById("productionCoreStyles")) return;
    const style = document.createElement("style");
    style.id = "productionCoreStyles";
    style.textContent = `
      .client-upgrade-request-card { border-left-color:rgba(47,141,255,.9)!important; }
      .client-upgrade-request-card textarea { width:100%; min-height:74px; resize:vertical; margin:8px 0; padding:10px 11px; border-radius:13px; border:1px solid rgba(255,255,255,.11); background:rgba(2,8,14,.48); color:#fff; font:inherit; font-size:13px; }
      .client-upgrade-request-card .button-row { display:grid; grid-template-columns:1fr auto; gap:8px; align-items:center; }
      .production-status-note { margin-top:8px; color:var(--silver,#aeb8c6); font-size:11px; line-height:1.35; }
      .phone-diagnostic-card { margin-top:10px; padding:11px; border-radius:14px; border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.035); }
      .phone-diagnostic-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px; margin-top:8px; }
      .phone-diagnostic-grid span { padding:8px; border-radius:11px; background:rgba(2,8,14,.34); color:var(--silver,#aeb8c6); font-size:10px; }
      .phone-diagnostic-grid strong { display:block; color:#fff; font-size:11px; }
      .directory-grid { align-items:start; gap:16px; }
      .member-card.member-premium-card { position:relative; display:grid; gap:13px; padding:18px; border-radius:22px; border:1px solid rgba(115,206,92,.38); border-left:5px solid #79d955; background:radial-gradient(circle at 16% 10%,rgba(42,216,143,.16),transparent 36%),linear-gradient(145deg,rgba(12,22,24,.96),rgba(4,8,13,.98)); box-shadow:0 22px 60px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.055); overflow:hidden; }
      .member-card.member-premium-card::after { content:""; position:absolute; inset:0; pointer-events:none; background:linear-gradient(135deg,rgba(255,255,255,.045),transparent 28%,rgba(47,141,255,.035)); opacity:.75; }
      .premium-member-top,.premium-member-line,.premium-member-meta,.premium-member-actions,.premium-member-score,.premium-slim-tags { position:relative; z-index:1; }
      .premium-member-top { display:grid; grid-template-columns:auto minmax(0,1fr) auto; gap:14px; align-items:start; }
      .premium-member-main { min-width:0; display:grid; gap:5px; }
      .premium-member-kickers { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
      .premium-member-kickers .badge,.premium-status-pill { margin:0; min-height:28px; padding:7px 11px; border-radius:999px; font-size:10px; letter-spacing:.08em; text-transform:uppercase; }
      .premium-status-pill { display:inline-flex; align-items:center; gap:7px; border:1px solid rgba(48,216,143,.28); color:#73e3a4; background:rgba(48,216,143,.09); font-weight:900; }
      .premium-status-pill .online-dot { width:11px; height:11px; box-shadow:0 0 0 5px rgba(48,216,143,.12); }
      .premium-member-name { margin:0; font-size:23px; line-height:1.04; letter-spacing:-.035em; color:#fff; }
      .premium-member-business { margin:0; color:var(--silver,#aeb8c6); font-size:14px; font-weight:800; }
      .premium-member-bio { margin:3px 0 0; color:#c9d4e4; font-size:14px; line-height:1.5; }
      .premium-avatar-wrap { position:relative; width:72px; height:72px; flex:0 0 auto; }
      .premium-avatar-wrap .profile-avatar { width:72px; height:72px; border-radius:19px; font-size:28px; background:linear-gradient(145deg,#0787ff,#0457c9); box-shadow:0 12px 28px rgba(0,117,255,.22); }
      .premium-avatar-wrap .profile-avatar.has-photo img { border-radius:19px; }
      .premium-avatar-wrap.is-online::after { content:""; position:absolute; right:-4px; bottom:3px; width:18px; height:18px; border-radius:50%; background:#30d88f; border:3px solid #071018; box-shadow:0 0 0 4px rgba(48,216,143,.15); }
      .premium-member-lines { display:grid; gap:0; border-top:1px solid rgba(255,255,255,.12); border-bottom:1px solid rgba(255,255,255,.12); }
      .premium-member-line { display:grid; grid-template-columns:34px 92px minmax(0,1fr); gap:12px; align-items:start; padding:12px 0; color:#d9e5f3; border-top:1px solid rgba(255,255,255,.095); }
      .premium-member-line:first-child { border-top:0; }
      .premium-line-icon { display:grid; place-items:center; width:32px; height:32px; border-radius:11px; background:rgba(48,216,143,.12); color:#41e39a; font-weight:900; }
      .premium-member-line strong { color:#fff; font-size:13px; }
      .premium-member-line span:last-child { color:#c8d2df; font-size:13px; line-height:1.35; }
      .premium-member-meta { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; padding:1px 0 0; }
      .premium-meta-item { display:grid; grid-template-columns:auto minmax(0,1fr); gap:8px; align-items:center; min-height:46px; padding:8px 10px; border-radius:14px; border:1px solid rgba(255,255,255,.09); background:rgba(255,255,255,.035); }
      .premium-meta-item b { color:#fff; font-size:12px; }
      .premium-meta-item small { display:block; margin-top:1px; color:#aeb8c6; font-size:11px; line-height:1.2; }
      .premium-member-score { display:flex; flex-wrap:wrap; gap:10px; align-items:center; color:#cbd6e5; font-size:13px; }
      .premium-member-score span { display:inline-flex; align-items:center; gap:7px; }
      .premium-member-actions { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
      .premium-member-actions button { min-height:44px; border-radius:14px; }
      .premium-member-actions .view-profile-button { color:#061015; background:linear-gradient(135deg,#45e584,#27ca70); border-color:rgba(69,229,132,.75); }
      .premium-slim-card { gap:11px; padding:17px; }
      .premium-slim-tags { display:flex; flex-wrap:wrap; gap:8px; }
      .reputation-badge.admin,.reputation-badge.admin-elite,.premium-admin-badge { border-color:rgba(102,232,165,.56)!important; color:#8ff5bf!important; background:linear-gradient(135deg,rgba(48,216,143,.18),rgba(47,141,255,.16))!important; box-shadow:0 0 0 1px rgba(48,216,143,.2),0 0 24px rgba(48,216,143,.16); }
      .premium-admin-badge { display:inline-flex; align-items:center; gap:7px; min-height:30px; padding:7px 12px; border-radius:999px; border:1px solid; font-size:10.5px; font-weight:950; letter-spacing:.08em; text-transform:uppercase; }
      .premium-admin-badge svg,.reputation-badge.admin svg { width:15px; height:15px; stroke:currentColor; fill:none; stroke-width:2.5; }
      @media(min-width:980px){.directory-grid{grid-template-columns:repeat(2,minmax(0,1fr));}.member-card.member-premium-card.is-featured-admin{grid-column:1 / -1;}}
      @media(max-width:760px){.member-card.member-premium-card{padding:15px;border-radius:20px}.premium-member-top{grid-template-columns:auto minmax(0,1fr);gap:12px}.premium-member-top>.reputation-badge,.premium-member-top>.premium-admin-badge{grid-column:1 / -1;width:fit-content}.premium-member-name{font-size:20px}.premium-avatar-wrap,.premium-avatar-wrap .profile-avatar{width:62px;height:62px}.premium-avatar-wrap .profile-avatar{font-size:24px;border-radius:17px}.premium-member-line{grid-template-columns:30px 1fr;gap:9px}.premium-member-line strong{grid-column:2}.premium-member-line span:last-child{grid-column:2}.premium-member-meta{grid-template-columns:1fr}.premium-member-actions{grid-template-columns:1fr 1fr}.premium-member-bio{font-size:13px}.client-upgrade-request-card .button-row{grid-template-columns:1fr}.phone-diagnostic-grid{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(style);
  }

  const originalReputationBadge = typeof reputationBadge === "function" ? reputationBadge : null;
  if (originalReputationBadge) {
    reputationBadge = function reputationBadge(member, options = {}) {
      const tier = typeof memberReputationTier === "function" ? memberReputationTier(member) : "none";
      if (tier !== "admin") return originalReputationBadge(member, options);
      const compact = options.compact === true;
      return '<span class="reputation-badge admin admin-elite" title="JP Innovation administrator" aria-label="JP Admin">' + shieldIcon() + (compact ? '' : '<b>JP Admin</b>') + '</span>';
    };
  }

  function statusLabel(member) {
    const tier = typeof memberReputationTier === "function" ? memberReputationTier(member) : "none";
    if (tier === "admin") return '<span class="premium-admin-badge">' + shieldIcon() + 'JP Admin</span>';
    if (tier === "gold" || tier === "blue") return typeof reputationBadge === "function" ? reputationBadge(member) : '<span class="pill good">Verified</span>';
    return '<span class="badge">' + esc(member?.role === "client" ? "Client Portal" : "Member") + '</span>';
  }

  function premiumMemberCard(member) {
    addProductionStyles();
    const viewer = typeof currentUser === "function" ? currentUser() : null;
    const online = typeof isMemberOnline === "function" ? isMemberOnline(member, viewer) : false;
    const reviews = typeof approvedReviewsFor === "function" ? approvedReviewsFor(member) : [];
    const tier = typeof memberReputationTier === "function" ? memberReputationTier(member) : "none";
    const points = Number(member.reputationPoints ?? member.points ?? 0);
    const canReview = viewer?.id && member.id && viewer.id !== member.id && ["member", "admin"].includes(viewer.role);
    const average = reviews.length ? Number(member.averageRating || (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length)).toFixed(1) : "";
    const reviewSummary = reviews.length ? `${average} / 5 from ${reviews.length} review${reviews.length === 1 ? "" : "s"}` : "No approved reviews yet";
    const avatar = typeof profileAvatarMarkup === "function" ? profileAvatarMarkup(member, "profile-avatar") : '<span class="profile-avatar">' + esc(String(member.name || "M").slice(0, 2).toUpperCase()) + '</span>';
    const line = (icon, label, value) => '<div class="premium-member-line"><span class="premium-line-icon" aria-hidden="true">' + icon + '</span><strong>' + esc(label) + '</strong><span>' + esc(value || "TBC") + '</span></div>';
    const reviewHtml = reviews.length ? '<details class="member-review-history"><summary>Approved reviews (' + reviews.length + ')</summary><div class="member-review-list">' + reviews.map((review) => '<article><span class="review-stars" aria-label="' + esc(review.rating) + ' out of 5 stars">' + '&#9733;'.repeat(review.rating) + '&#9734;'.repeat(5 - review.rating) + '</span><p>' + esc(review.comment) + '</p><small>' + esc(review.reviewerName) + ' &middot; ' + esc(review.created) + '</small></article>').join('') + '</div></details>' : '';
    const reviewForm = canReview ? '<details class="member-review-panel"><summary>Leave or update a review</summary><form class="member-review-form" data-reviewed-id="' + esc(member.id) + '"><label>Rating <select name="rating" required><option value="">Choose</option><option value="5">5 - Excellent</option><option value="4">4 - Positive</option><option value="3">3 - Satisfactory</option><option value="2">2 - Needs improvement</option><option value="1">1 - Poor</option></select></label><label>Review comment <textarea name="comment" minlength="20" maxlength="2000" rows="3" required placeholder="Describe the work, communication and outcome..."></textarea></label><button class="secondary-button" type="submit">Submit for approval</button><p class="form-status review-form-status" aria-live="polite"></p></form></details>' : '';
    const detailed = Boolean(member.bio || member.location || member.skill || member.equipment || tier === "admin");
    const profileButton = '<button class="primary-button view-profile-button" type="button" data-profile-member-id="' + esc(member.id || '') + '">View profile</button>';

    if (!detailed) {
      return '<article class="member-card member-premium-card premium-slim-card"><div class="premium-member-top"><span class="premium-avatar-wrap ' + (online ? 'is-online' : '') + '">' + avatar + '</span><div class="premium-member-main"><div class="premium-member-kickers">' + statusLabel(member) + (online ? '<span class="premium-status-pill"><span class="online-dot"></span>Online</span>' : '') + '</div><h3 class="premium-member-name">' + esc(member.name || 'Member') + '</h3><p class="premium-member-business">' + esc(member.business || 'Independent member') + '</p></div></div><p class="premium-member-bio">' + esc(member.bio || 'Innovation Hub member.') + '</p><div class="premium-slim-tags"><span class="pill">Skills: ' + esc(member.skill || 'General Engineering') + '</span><span class="pill">Work: ' + esc(member.preferredWork || 'Open to help') + '</span><span class="pill">Equipment: ' + esc(member.equipment || 'Not listed') + '</span><span class="pill">Capacity: ' + esc(member.capacity || 'Capacity TBC') + '</span></div><div class="premium-member-score"><span>' + points + ' pts</span><span>' + esc(reviewSummary) + '</span></div><div class="premium-member-actions"><button class="secondary-button message-member-button" data-member-email="' + esc(member.email || '') + '" type="button">Message</button>' + profileButton + '</div>' + reviewHtml + reviewForm + '</article>';
    }

    return '<article class="member-card member-premium-card ' + (tier === 'admin' ? 'is-featured-admin' : '') + '"><div class="premium-member-top"><span class="premium-avatar-wrap ' + (online ? 'is-online' : '') + '">' + avatar + '</span><div class="premium-member-main"><div class="premium-member-kickers">' + statusLabel(member) + (online ? '<span class="premium-status-pill"><span class="online-dot"></span>Online</span>' : '') + '</div><h3 class="premium-member-name">' + esc(member.name || 'Member') + '</h3><p class="premium-member-business">' + esc(member.business || 'Independent member') + '</p><p class="premium-member-bio">' + esc(member.bio || 'Engineering professional open to useful Hub connections and collaboration.') + '</p></div>' + (tier === 'admin' ? '<span class="reputation-badge admin admin-elite">' + shieldIcon() + '<b>Founder Admin</b></span>' : (typeof reputationBadge === 'function' ? reputationBadge(member) : '')) + '</div><div class="premium-member-lines">' + line('L', 'Location', member.location || 'Location TBC') + line('S', 'Skills', member.skill || 'General engineering') + line('E', 'Equipment', member.equipment || 'Equipment TBC') + '</div><div class="premium-member-meta"><span class="premium-meta-item"><span class="premium-line-icon">W</span><span><b>Services</b><small>' + esc(member.preferredWork || 'Design review') + '</small></span></span><span class="premium-meta-item"><span class="premium-line-icon">A</span><span><b>Availability</b><small>' + esc(member.capacity || 'Available for projects') + '</small></span></span><span class="premium-meta-item"><span class="premium-line-icon">V</span><span><b>Verification</b><small>' + esc(tier === 'admin' ? 'JP Founder Admin' : tier === 'gold' ? 'Gold Trusted' : tier === 'blue' ? 'Blue Verified' : 'Member') + '</small></span></span></div><div class="premium-member-score"><span>' + points + ' pts</span><span>' + esc(reviewSummary) + '</span></div><div class="premium-member-actions"><button class="secondary-button message-member-button" data-member-email="' + esc(member.email || '') + '" type="button">Message</button>' + profileButton + '</div>' + reviewHtml + reviewForm + '</article>';
  }

  if (typeof memberCard === "function") memberCard = premiumMemberCard;

  async function rpcFallback(name, payload, fallback) {
    if (!portalBackend) throw new Error("Secure backend is unavailable.");
    const result = await portalBackend.rpc(name, payload || {});
    if (!result.error) return result.data;
    if (fallback && /function .* not find|Could not find the function|schema cache|PGRST202/i.test(result.error.message || "")) return fallback(result.error);
    throw result.error;
  }

  async function requestHubUpgrade(message) {
    const user = typeof currentUser === "function" ? currentUser() : null;
    if (!user?.id) throw new Error("Please sign in to request Hub access.");
    return rpcFallback("request_hub_access", { p_message: message || "" }, async () => {
      const retry = await portalBackend.rpc("request_hub_access");
      if (retry.error) throw retry.error;
      return retry.data;
    });
  }

  function upgradeCard(user) {
    const pending = String(user?.membershipStatus || user?.membership_status || "").toLowerCase() === "pending";
    return `<article class="card client-upgrade-request-card"><span class="badge">${pending ? "Request pending" : "Optional upgrade"}</span><h3>Innovation Hub access</h3><p>${pending ? "Your paid Hub upgrade request is waiting for JP Innovation approval." : "Request paid Hub access using this same login. Your Client Portal quotes, projects and messages stay with you."}</p>${pending ? '<p class="production-status-note">No duplicate request is needed. You will be notified once it is approved or rejected.</p>' : '<textarea id="clientUpgradeMessage" placeholder="Optional message, e.g. what you want Hub access for"></textarea><div class="button-row"><button id="clientUpgradeRequestButton" class="primary-button" type="button">Request Hub upgrade</button><small class="production-status-note">Creates a real admin approval task.</small></div>'}</article>`;
  }

  const baseRenderClientDashboard = typeof renderClientDashboard === "function" ? renderClientDashboard : null;
  if (baseRenderClientDashboard) {
    renderClientDashboard = function renderClientDashboard(user) {
      addProductionStyles();
      let html = baseRenderClientDashboard(user);
      const oldCard = /<article class="card"><span class="badge">Optional upgrade<\/span>[\s\S]*?<\/article>/;
      if (oldCard.test(html)) return html.replace(oldCard, upgradeCard(user));
      return html.replace("</div>\n    </section>", upgradeCard(user) + "</div>\n    </section>");
    };
  }

  const originalUpdateSecureProfileAccess = typeof updateSecureProfileAccess === "function" ? updateSecureProfileAccess : null;
  if (originalUpdateSecureProfileAccess) {
    updateSecureProfileAccess = async function updateSecureProfileAccess(userId, changes) {
      if (!portalBackend || !userId) return originalUpdateSecureProfileAccess(userId, changes);
      const data = await rpcFallback("admin_set_account_access", { p_user_id: userId, p_account_type: changes.account_type || null, p_membership_status: changes.membership_status || null, p_profile_status: changes.status || null, p_reason: changes.removal_reason || "" }, async () => originalUpdateSecureProfileAccess(userId, changes));
      if (data && typeof secureAdminProfiles !== "undefined") {
        const row = Array.isArray(data) ? data[0] : data;
        const profile = safeArr(secureAdminProfiles).find((item) => item.user_id === userId);
        if (profile && row && typeof row === "object") Object.assign(profile, row);
      }
      return data;
    };
  }

  async function showUniquePhoneNotification(title, body, view) {
    if (typeof pushSupported === "function" && !pushSupported()) throw new Error("This browser does not support website notifications.");
    if (!("Notification" in window)) throw new Error("This browser does not support website notifications.");
    if (Notification.permission !== "granted") throw new Error("Press Enable phone alerts first.");
    const registration = typeof registerNotificationServiceWorker === "function" ? await registerNotificationServiceWorker() : await navigator.serviceWorker.ready;
    await registration.showNotification(title || "JP Innovation", { body: body || "Open JP Innovation to view the update.", icon: jpIcon, badge: jpBadge, tag: "jp-" + (view || "notification") + "-" + Date.now(), renotify: true, timestamp: Date.now(), data: { url: "/hub-portal/index.html?entry=hub&view=" + encodeURIComponent(view || "notifications") + "&t=" + Date.now() } });
  }

  if (typeof maybeShowLocalPhoneNotification === "function") {
    maybeShowLocalPhoneNotification = async function maybeShowLocalPhoneNotification(items = []) {
      const user = typeof currentUser === "function" ? currentUser() : null;
      if (!items.length || !user?.email) return;
      const item = items.find((entry) => entry.isNew) || items[0];
      try { await showUniquePhoneNotification("JP Innovation", `${item.title || "Update"}\n${item.detail || "Open JP Innovation to view it."}`, item.view || "notifications"); } catch (error) { console.debug("Local JP notification skipped", error); }
    };
  }

  const baseRenderSettings = typeof renderSettings === "function" ? renderSettings : null;
  if (baseRenderSettings) {
    renderSettings = function renderSettings(user) {
      addProductionStyles();
      const html = baseRenderSettings(user);
      const standalone = typeof isStandaloneApp === "function" ? isStandaloneApp() : false;
      const supported = "Notification" in window && "serviceWorker" in navigator;
      const permission = "Notification" in window ? Notification.permission : "unsupported";
      return html + `<section class="section-card phone-diagnostic-card"><div class="list-title"><div><h2>Phone alert diagnostics</h2><p>Use this when testing JP mobile notifications on this device.</p></div></div><div class="phone-diagnostic-grid"><span><strong>Browser support</strong>${supported ? "Available" : "Not supported"}</span><span><strong>Permission</strong>${esc(permission)}</span><span><strong>Installed app</strong>${standalone ? "Yes" : "No / browser tab"}</span><span><strong>Push sender</strong>${window.JP_INNOVATION_PUSH_PUBLIC_KEY ? "Configured" : "Server key needed"}</span></div></section>`;
    };
  }

  document.addEventListener("click", async (event) => {
    const profileOpen = event.target.closest?.("[data-profile-member-id]");
    if (profileOpen) {
      event.preventDefault();
      const user = typeof currentUser === "function" ? currentUser() : null;
      if (user?.id && profileOpen.dataset.profileMemberId === user.id && typeof renderView === "function") renderView("profile");
      else toast("Member profile", "The key profile details are shown on this card. Use Message to start a conversation.", false);
    }
    const upgrade = event.target.closest?.("#clientUpgradeRequestButton");
    if (upgrade) {
      event.preventDefault();
      upgrade.disabled = true;
      const original = upgrade.textContent;
      upgrade.textContent = "Sending request...";
      try {
        await requestHubUpgrade(document.getElementById("clientUpgradeMessage")?.value || "");
        toast("Upgrade request sent.", "JP Innovation has been notified and will review your Hub access.", false);
        if (typeof syncSecureSession === "function") await syncSecureSession();
        if (typeof loadSecureUserData === "function") await loadSecureUserData();
        if (typeof renderView === "function") renderView("dashboard");
      } catch (error) {
        const duplicate = /duplicate|already|pending/i.test(error.message || "");
        toast(duplicate ? "Upgrade request pending." : "Upgrade request could not be sent.", duplicate ? "A request already exists for this account." : "Please try again.", !duplicate);
      } finally { upgrade.disabled = false; upgrade.textContent = original; }
    }
    const test = event.target.closest?.("#testPhoneAlert");
    if (test) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const status = document.getElementById("phoneAlertStatus");
      if (status) status.textContent = "Sending JP test alert...";
      try { await showUniquePhoneNotification("JP Innovation", "Test alert sent. Tap to open your Hub notifications.", "notifications"); if (status) status.textContent = "JP test alert sent to this device."; toast("JP test alert sent.", "If notifications are allowed, it should appear in your phone notification tray.", false); }
      catch (error) { if (status) status.textContent = error.message || "The test alert could not be sent."; toast("JP test alert failed.", error.message || "Check notification permissions on this device.", true); }
    }
  }, true);

  window.addEventListener("load", addProductionStyles);
})();