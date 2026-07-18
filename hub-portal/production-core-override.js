/* JP Innovation production core override: upgrade requests, admin access actions, notifications and compact member cards. */
(function () {
  const esc = (value) => typeof escapeHtml === 'function' ? escapeHtml(value) : String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]);
  const safeArr = (value) => Array.isArray(value) ? value : [];
  const jpIcon = '/assets/jp-app-icon-192.png?v=jp-notification-20260718';
  const jpBadge = '/assets/jp-notification-badge.svg?v=jp-notification-20260718';

  function toast(title, detail, isError) {
    const fn = isError ? window.showErrorToast : window.showSuccessToast;
    if (typeof fn === 'function') fn(title, detail);
  }

  function shieldIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 6v5c0 4.7-2.7 8-7 10-4.3-2-7-5.3-7-10V6z"/><path d="m8.7 12.2 2.1 2.1 4.6-5"/></svg>';
  }

  function addProductionStyles() {
    if (document.getElementById('productionCoreStyles')) return;
    const style = document.createElement('style');
    style.id = 'productionCoreStyles';
    style.textContent = `
      .client-upgrade-request-card { border-left-color:rgba(47,141,255,.9)!important; }
      .client-upgrade-request-card textarea { width:100%; min-height:74px; resize:vertical; margin:8px 0; padding:10px 11px; border-radius:13px; border:1px solid rgba(255,255,255,.11); background:rgba(2,8,14,.48); color:#fff; font:inherit; font-size:13px; }
      .client-upgrade-request-card .button-row { display:grid; grid-template-columns:1fr auto; gap:8px; align-items:center; }
      .production-status-note { margin-top:8px; color:var(--silver,#aeb8c6); font-size:11px; line-height:1.35; }
      .phone-diagnostic-card { margin-top:10px; padding:11px; border-radius:14px; border:1px solid rgba(255,255,255,.08); background:rgba(255,255,255,.035); }
      .phone-diagnostic-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px; margin-top:8px; }
      .phone-diagnostic-grid span { padding:8px; border-radius:11px; background:rgba(2,8,14,.34); color:var(--silver,#aeb8c6); font-size:10px; }
      .phone-diagnostic-grid strong { display:block; color:#fff; font-size:11px; }
      .directory-grid { align-items:start; gap:14px!important; }
      .member-card.member-compact-card { position:relative; display:grid; gap:10px; padding:13px; min-height:0; border-radius:18px; border:1px solid rgba(115,206,92,.34); border-left:3px solid #79d955; background:radial-gradient(circle at 12% 8%,rgba(42,216,143,.14),transparent 34%),linear-gradient(145deg,rgba(12,22,24,.97),rgba(4,8,13,.99)); box-shadow:0 14px 34px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.05); overflow:hidden; }
      .member-card.member-compact-card::after { content:""; position:absolute; inset:0; pointer-events:none; background:linear-gradient(135deg,rgba(255,255,255,.035),transparent 34%,rgba(47,141,255,.03)); }
      .compact-member-top,.compact-member-copy,.compact-chip-row,.compact-member-stats,.compact-member-actions { position:relative; z-index:1; }
      .compact-member-top { display:grid; grid-template-columns:54px minmax(0,1fr); gap:10px; align-items:center; }
      .compact-avatar-wrap { position:relative; width:54px; height:54px; }
      .compact-avatar-wrap .profile-avatar { width:54px; height:54px; border-radius:16px; font-size:21px; background:linear-gradient(145deg,#0787ff,#0457c9); box-shadow:0 8px 20px rgba(0,117,255,.2); }
      .compact-avatar-wrap .profile-avatar.has-photo img { border-radius:16px; width:100%; height:100%; object-fit:cover; }
      .compact-avatar-wrap.is-online::after { content:""; position:absolute; right:-3px; bottom:1px; width:15px; height:15px; border-radius:50%; background:#30d88f; border:3px solid #071018; box-shadow:0 0 0 3px rgba(48,216,143,.14); }
      .compact-member-copy { min-width:0; display:grid; gap:3px; }
      .compact-member-kickers { display:flex; flex-wrap:wrap; align-items:center; gap:6px; min-width:0; }
      .compact-member-name { margin:0; color:#fff; font-size:18px; line-height:1.05; letter-spacing:-.025em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .compact-member-business { margin:0; color:#aeb8c6; font-size:12px; font-weight:800; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .compact-status-pill,.compact-verified-pill,.compact-admin-pill { display:inline-flex; align-items:center; gap:5px; min-height:22px; max-width:100%; padding:5px 8px; border-radius:999px; border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.04); color:#b9c5d4; font-size:9px; font-weight:900; letter-spacing:.06em; text-transform:uppercase; }
      .compact-status-pill.is-online { color:#73e3a4; border-color:rgba(48,216,143,.25); background:rgba(48,216,143,.08); }
      .compact-status-pill .online-dot { width:8px; height:8px; }
      .compact-verified-pill { color:#66b8ff; border-color:rgba(47,141,255,.35); background:rgba(47,141,255,.1); }
      .compact-admin-pill { color:#8ff5bf; border-color:rgba(102,232,165,.56); background:linear-gradient(135deg,rgba(48,216,143,.18),rgba(47,141,255,.14)); box-shadow:0 0 18px rgba(48,216,143,.12); }
      .compact-admin-pill svg,.compact-verified-pill svg { width:12px; height:12px; stroke:currentColor; fill:none; stroke-width:2.5; }
      .compact-member-category { margin:0; color:#fff; font-size:13px; font-weight:900; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .compact-member-location { margin:0; color:#aeb8c6; font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .compact-member-bio { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; margin:0; color:#c2ccd9; font-size:12.5px; line-height:1.35; min-height:0; }
      .compact-chip-row { display:flex; flex-wrap:wrap; gap:6px; max-height:58px; overflow:hidden; }
      .compact-chip-row .pill { margin:0; padding:6px 8px; border-radius:999px; font-size:10.5px; line-height:1; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .compact-member-stats { display:flex; flex-wrap:wrap; gap:8px; color:#aeb8c6; font-size:11.5px; }
      .compact-member-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
      .compact-member-actions button { min-height:38px; padding:9px 10px; border-radius:13px; font-size:12px; }
      .compact-member-actions .view-profile-button { color:#061015; background:linear-gradient(135deg,#45e584,#27ca70); border-color:rgba(69,229,132,.75); }
      .member-card.member-compact-card .member-review-history,.member-card.member-compact-card .member-review-panel { display:none; }
      .reputation-badge.admin,.compact-admin-pill { border-color:rgba(102,232,165,.56)!important; color:#8ff5bf!important; background:linear-gradient(135deg,rgba(48,216,143,.18),rgba(47,141,255,.16))!important; box-shadow:0 0 0 1px rgba(48,216,143,.2),0 0 24px rgba(48,216,143,.16); }
      @media(max-width:430px){.member-card.member-compact-card{padding:12px;gap:9px}.compact-member-top{grid-template-columns:50px minmax(0,1fr);gap:9px}.compact-avatar-wrap,.compact-avatar-wrap .profile-avatar{width:50px;height:50px}.compact-member-name{font-size:17px}.compact-member-actions button{min-height:37px}}
      @media(max-width:340px){.compact-member-actions{grid-template-columns:1fr}.compact-member-kickers{gap:5px}.compact-status-pill,.compact-verified-pill,.compact-admin-pill{font-size:8.5px;padding:5px 7px}.compact-chip-row{max-height:52px}.compact-chip-row .pill{font-size:10px}.client-upgrade-request-card .button-row{grid-template-columns:1fr}.phone-diagnostic-grid{grid-template-columns:1fr 1fr}}
      @media(min-width:980px){.directory-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
    `;
    document.head.appendChild(style);
  }

  const originalReputationBadge = typeof reputationBadge === 'function' ? reputationBadge : null;
  if (originalReputationBadge) {
    reputationBadge = function reputationBadge(member, options = {}) {
      const tier = typeof memberReputationTier === 'function' ? memberReputationTier(member) : 'none';
      if (tier !== 'admin') return originalReputationBadge(member, options);
      const compact = options.compact === true;
      return '<span class="reputation-badge admin admin-elite" title="JP Innovation administrator" aria-label="JP Admin">' + shieldIcon() + (compact ? '' : '<b>JP Admin</b>') + '</span>';
    };
  }

  function compactMemberCard(member) {
    addProductionStyles();
    const viewer = typeof currentUser === 'function' ? currentUser() : null;
    const online = typeof isMemberOnline === 'function' ? isMemberOnline(member, viewer) : false;
    const reviews = typeof approvedReviewsFor === 'function' ? approvedReviewsFor(member) : [];
    const tier = typeof memberReputationTier === 'function' ? memberReputationTier(member) : 'none';
    const points = Number(member.reputationPoints ?? member.points ?? 0);
    const reviewSummary = reviews.length ? `${Number(member.averageRating || (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length)).toFixed(1)} rating • ${reviews.length} review${reviews.length === 1 ? '' : 's'}` : 'No approved reviews yet';
    const avatar = typeof profileAvatarMarkup === 'function' ? profileAvatarMarkup(member, 'profile-avatar') : '<span class="profile-avatar">' + esc(String(member.name || 'M').slice(0, 2).toUpperCase()) + '</span>';
    const profileButton = '<button class="primary-button view-profile-button" type="button" data-profile-member-id="' + esc(member.id || '') + '">View profile</button>';
    const mainCategory = String(member.skill || member.preferredWork || 'General Engineering').split(',')[0].trim() || 'General Engineering';
    const skills = String(member.skill || 'General Engineering').split(',').map((item) => item.trim()).filter(Boolean).slice(0, 3);
    while (skills.length < 1) skills.push('General Engineering');
    const verified = tier === 'admin' ? '<span class="compact-admin-pill">' + shieldIcon() + 'JP Admin</span>' : tier === 'gold' ? '<span class="compact-verified-pill">' + shieldIcon() + 'Gold Trusted</span>' : tier === 'blue' ? '<span class="compact-verified-pill">' + shieldIcon() + 'Blue Verified</span>' : '<span class="compact-verified-pill">Member</span>';
    const status = online ? '<span class="compact-status-pill is-online"><span class="online-dot"></span>Online</span>' : '<span class="compact-status-pill">Offline</span>';
    return '<article class="member-card member-compact-card ' + (tier === 'admin' ? 'is-admin' : '') + '"><div class="compact-member-top"><span class="compact-avatar-wrap ' + (online ? 'is-online' : '') + '">' + avatar + '</span><div class="compact-member-copy"><div class="compact-member-kickers">' + status + verified + '</div><h3 class="compact-member-name">' + esc(member.name || 'Member') + '</h3><p class="compact-member-business">' + esc(member.business || member.level || 'Independent member') + '</p></div></div><div class="compact-member-copy"><p class="compact-member-category">' + esc(mainCategory) + '</p><p class="compact-member-location">' + esc(member.location || 'Location TBC') + '</p><p class="compact-member-bio">' + esc(member.bio || 'Innovation Hub member.') + '</p></div><div class="compact-chip-row">' + skills.map((skill) => '<span class="pill">' + esc(skill) + '</span>').join('') + '</div><div class="compact-member-stats"><span>' + points + ' pts</span><span>' + esc(reviewSummary) + '</span></div><div class="compact-member-actions"><button class="secondary-button message-member-button" data-member-email="' + esc(member.email || '') + '" type="button">Message</button>' + profileButton + '</div></article>';
  }

  if (typeof memberCard === 'function') memberCard = compactMemberCard;

  async function rpcFallback(name, payload, fallback) {
    if (!portalBackend) throw new Error('Secure backend is unavailable.');
    const result = await portalBackend.rpc(name, payload || {});
    if (!result.error) return result.data;
    if (fallback && /function .* not find|Could not find the function|schema cache|PGRST202/i.test(result.error.message || '')) return fallback(result.error);
    throw result.error;
  }

  async function requestHubUpgrade(message) {
    const user = typeof currentUser === 'function' ? currentUser() : null;
    if (!user?.id) throw new Error('Please sign in to request Hub access.');
    return rpcFallback('request_hub_access', { p_message: message || '' }, async () => {
      const retry = await portalBackend.rpc('request_hub_access');
      if (retry.error) throw retry.error;
      return retry.data;
    });
  }

  function upgradeCard(user) {
    const pending = String(user?.membershipStatus || user?.membership_status || '').toLowerCase() === 'pending';
    return '<article class="card client-upgrade-request-card"><span class="badge">' + (pending ? 'Request pending' : 'Optional upgrade') + '</span><h3>Innovation Hub access</h3><p>' + (pending ? 'Your paid Hub upgrade request is waiting for JP Innovation approval.' : 'Request paid Hub access using this same login. Your Client Portal quotes, projects and messages stay with you.') + '</p>' + (pending ? '<p class="production-status-note">No duplicate request is needed. You will be notified once it is approved or rejected.</p>' : '<textarea id="clientUpgradeMessage" placeholder="Optional message, e.g. what you want Hub access for"></textarea><div class="button-row"><button id="clientUpgradeRequestButton" class="primary-button" type="button">Request Hub upgrade</button><small class="production-status-note">Creates a real admin approval task.</small></div>') + '</article>';
  }

  const baseRenderClientDashboard = typeof renderClientDashboard === 'function' ? renderClientDashboard : null;
  if (baseRenderClientDashboard) {
    renderClientDashboard = function renderClientDashboard(user) {
      addProductionStyles();
      let html = baseRenderClientDashboard(user);
      const oldCard = /<article class="card"><span class="badge">Optional upgrade<\/span>[\s\S]*?<\/article>/;
      if (oldCard.test(html)) return html.replace(oldCard, upgradeCard(user));
      return html.replace('</div>\n    </section>', upgradeCard(user) + '</div>\n    </section>');
    };
  }

  const originalUpdateSecureProfileAccess = typeof updateSecureProfileAccess === 'function' ? updateSecureProfileAccess : null;
  if (originalUpdateSecureProfileAccess) {
    updateSecureProfileAccess = async function updateSecureProfileAccess(userId, changes) {
      if (!portalBackend || !userId) return originalUpdateSecureProfileAccess(userId, changes);
      const data = await rpcFallback('admin_set_account_access', { p_user_id: userId, p_account_type: changes.account_type || null, p_membership_status: changes.membership_status || null, p_profile_status: changes.status || null, p_reason: changes.removal_reason || '' }, async () => originalUpdateSecureProfileAccess(userId, changes));
      if (data && typeof secureAdminProfiles !== 'undefined') {
        const row = Array.isArray(data) ? data[0] : data;
        const profile = safeArr(secureAdminProfiles).find((item) => item.user_id === userId);
        if (profile && row && typeof row === 'object') Object.assign(profile, row);
      }
      return data;
    };
  }

  async function showUniquePhoneNotification(title, body, view) {
    if (typeof pushSupported === 'function' && !pushSupported()) throw new Error('This browser does not support website notifications.');
    if (!('Notification' in window)) throw new Error('This browser does not support website notifications.');
    if (Notification.permission !== 'granted') throw new Error('Press Enable phone alerts first.');
    const registration = typeof registerNotificationServiceWorker === 'function' ? await registerNotificationServiceWorker() : await navigator.serviceWorker.ready;
    await registration.showNotification(title || 'JP Innovation', { body: body || 'Open JP Innovation to view the update.', icon: jpIcon, badge: jpBadge, tag: 'jp-' + (view || 'notification') + '-' + Date.now(), renotify: true, timestamp: Date.now(), data: { url: '/hub-portal/index.html?entry=hub&view=' + encodeURIComponent(view || 'notifications') + '&t=' + Date.now() } });
  }

  if (typeof maybeShowLocalPhoneNotification === 'function') {
    maybeShowLocalPhoneNotification = async function maybeShowLocalPhoneNotification(items = []) {
      const user = typeof currentUser === 'function' ? currentUser() : null;
      if (!items.length || !user?.email) return;
      const item = items.find((entry) => entry.isNew) || items[0];
      try { await showUniquePhoneNotification('JP Innovation', `${item.title || 'Update'}\n${item.detail || 'Open JP Innovation to view it.'}`, item.view || 'notifications'); } catch (error) { console.debug('Local JP notification skipped', error); }
    };
  }

  const baseRenderSettings = typeof renderSettings === 'function' ? renderSettings : null;
  if (baseRenderSettings) {
    renderSettings = function renderSettings(user) {
      addProductionStyles();
      const html = baseRenderSettings(user);
      const standalone = typeof isStandaloneApp === 'function' ? isStandaloneApp() : false;
      const supported = 'Notification' in window && 'serviceWorker' in navigator;
      const permission = 'Notification' in window ? Notification.permission : 'unsupported';
      return html + '<section class="section-card phone-diagnostic-card"><div class="list-title"><div><h2>Phone alert diagnostics</h2><p>Use this when testing JP mobile notifications on this device.</p></div></div><div class="phone-diagnostic-grid"><span><strong>Browser support</strong>' + (supported ? 'Available' : 'Not supported') + '</span><span><strong>Permission</strong>' + esc(permission) + '</span><span><strong>Installed app</strong>' + (standalone ? 'Yes' : 'No / browser tab') + '</span><span><strong>Push sender</strong>' + (window.JP_INNOVATION_PUSH_PUBLIC_KEY ? 'Configured' : 'Server key needed') + '</span></div></section>';
    };
  }

  document.addEventListener('click', async (event) => {
    const profileOpen = event.target.closest?.('[data-profile-member-id]');
    if (profileOpen) {
      event.preventDefault();
      const user = typeof currentUser === 'function' ? currentUser() : null;
      if (user?.id && profileOpen.dataset.profileMemberId === user.id && typeof renderView === 'function') renderView('profile');
      else toast('Member profile', 'The key profile details are shown on this card. Use Message to start a conversation.', false);
    }

    const upgrade = event.target.closest?.('#clientUpgradeRequestButton');
    if (upgrade) {
      event.preventDefault();
      upgrade.disabled = true;
      const original = upgrade.textContent;
      upgrade.textContent = 'Sending request...';
      try {
        await requestHubUpgrade(document.getElementById('clientUpgradeMessage')?.value || '');
        toast('Upgrade request sent.', 'JP Innovation has been notified and will review your Hub access.', false);
        if (typeof syncSecureSession === 'function') await syncSecureSession();
        if (typeof loadSecureUserData === 'function') await loadSecureUserData();
        if (typeof renderView === 'function') renderView('dashboard');
      } catch (error) {
        const duplicate = /duplicate|already|pending/i.test(error.message || '');
        toast(duplicate ? 'Upgrade request pending.' : 'Upgrade request could not be sent.', duplicate ? 'A request already exists for this account.' : 'Please try again.', !duplicate);
      } finally { upgrade.disabled = false; upgrade.textContent = original; }
    }

    const test = event.target.closest?.('#testPhoneAlert');
    if (test) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const status = document.getElementById('phoneAlertStatus');
      if (status) status.textContent = 'Sending JP test alert...';
      try { await showUniquePhoneNotification('JP Innovation', 'Test alert sent. Tap to open your Hub notifications.', 'notifications'); if (status) status.textContent = 'JP test alert sent to this device.'; toast('JP test alert sent.', 'If notifications are allowed, it should appear in your phone notification tray.', false); }
      catch (error) { if (status) status.textContent = error.message || 'The test alert could not be sent.'; toast('JP test alert failed.', error.message || 'Check notification permissions on this device.', true); }
    }
  }, true);

  window.addEventListener('load', addProductionStyles);
})();