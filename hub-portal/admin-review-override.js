/* JP Innovation Admin Review override: priority admin navigation, approval refresh, grouped accounts and phone alert CTA. */
(function () {
  const esc = (value) => typeof escapeHtml === 'function' ? escapeHtml(value) : String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]);
  const arr = (value) => Array.isArray(value) ? value : [];
  const clean = (value) => typeof cleanEmailValue === 'function' ? cleanEmailValue(value || '') : String(value || '').trim().toLowerCase();
  const num = (value) => Number.isFinite(Number(value || 0)) ? Number(value || 0) : 0;

  function addStyles() {
    if (document.getElementById('adminReviewOverrideStyles')) return;
    const style = document.createElement('style');
    style.id = 'adminReviewOverrideStyles';
    style.textContent = `
      .view-mount[data-view="admin"] { gap: 12px; }
      .view-mount[data-view="admin"] .admin-control-hero { display:none!important; }
      .admin-priority-command { display:grid; gap:10px; padding:13px; border:1px solid rgba(47,141,255,.22); border-left:2px solid rgba(47,141,255,.85); border-radius:18px; background:linear-gradient(145deg,rgba(47,141,255,.12),rgba(255,255,255,.035)); box-shadow:0 16px 34px rgba(0,0,0,.22); }
      .admin-priority-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
      .admin-priority-head h2 { margin:0; font-size:19px; line-height:1.08; letter-spacing:-.03em; }
      .admin-priority-head p { margin:4px 0 0; color:var(--silver,#aeb8c6); font-size:11px; line-height:1.3; }
      .admin-priority-total { display:grid; place-items:center; min-width:42px; height:42px; padding:0 9px; border-radius:15px; border:1px solid rgba(245,158,11,.32); background:rgba(245,158,11,.12); color:#ffd37a; font-size:19px; font-weight:900; }
      .admin-priority-grid,.admin-secondary-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; }
      .admin-priority-button { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:8px; min-height:49px; padding:8px; border:1px solid rgba(255,255,255,.085); border-radius:14px; background:rgba(2,8,14,.32); color:#fff; text-align:left; }
      .admin-priority-button.needs-action { border-color:rgba(245,158,11,.26); }
      .admin-priority-icon { display:grid; place-items:center; width:28px; height:28px; border-radius:10px; background:rgba(47,141,255,.13); color:#66b8ff; font-size:14px; font-weight:900; }
      .admin-priority-copy strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11.5px; line-height:1.1; }
      .admin-priority-copy small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-top:2px; color:var(--silver,#aeb8c6); font-size:9px; }
      .admin-priority-count { display:grid; place-items:center; min-width:28px; height:24px; padding:0 7px; border-radius:999px; background:rgba(255,255,255,.055); color:#eaf2ff; font-size:11px; font-weight:900; }
      .admin-priority-button.needs-action .admin-priority-count { background:rgba(245,158,11,.16); color:#ffd37a; }
      .admin-secondary-button { min-height:36px; padding:8px 10px; border:1px solid rgba(255,255,255,.08); border-radius:12px; background:rgba(255,255,255,.035); color:#dbe7f7; font-size:10.5px; font-weight:900; text-align:center; }
      .admin-phone-alert-cta { display:flex; align-items:center; gap:8px; padding:8px; border:1px solid rgba(47,141,255,.16); border-radius:12px; background:rgba(47,141,255,.06); }
      .admin-phone-alert-cta button { min-height:32px; padding:7px 10px; border-radius:10px; font-size:10.5px; }
      .admin-phone-alert-cta small { color:var(--silver,#aeb8c6); font-size:9.5px; }
      .view-mount[data-view="admin"] .admin-fold { border-radius:16px; }
      .view-mount[data-view="admin"] .admin-fold>summary { min-height:46px; padding:11px; }
      .view-mount[data-view="admin"] .admin-fold>summary h2 { font-size:15px; }
      .view-mount[data-view="admin"] .admin-fold>summary p { font-size:10.5px; }
      .admin-account-tabs { display:grid; gap:10px; }
      .admin-account-group { border:1px solid rgba(255,255,255,.08); border-radius:14px; background:rgba(2,8,14,.28); overflow:hidden; }
      .admin-account-group>summary { display:flex; align-items:center; justify-content:space-between; gap:10px; min-height:42px; padding:9px 11px; cursor:pointer; }
      .admin-account-group>summary strong { display:block; font-size:12.5px; }
      .admin-account-group>summary small { display:block; margin-top:2px; color:var(--silver,#aeb8c6); font-size:9.5px; }
      .admin-account-actions { flex-wrap:wrap; gap:6px; }
      .admin-account-actions button { min-height:31px; padding:7px 9px; font-size:10.5px; border-radius:10px; }
      @media(max-width:760px){.admin-priority-command{padding:12px;border-radius:16px}.admin-priority-head h2{font-size:18px}.admin-priority-head p{display:none}.admin-priority-total{min-width:40px;height:40px;font-size:18px}.admin-priority-grid,.admin-secondary-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.admin-phone-alert-cta{align-items:flex-start;flex-direction:column}.admin-phone-alert-cta button{width:100%}.admin-account-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%}.admin-account-actions button{width:100%}}
      @media(max-width:370px){.admin-priority-grid,.admin-secondary-grid,.admin-account-actions{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function accountFromProfile(profile) {
    return typeof secureProfileUser === 'function' ? secureProfileUser(profile) : {
      id: profile.user_id,
      email: clean(profile.email),
      name: profile.full_name || profile.email || 'Account',
      business: profile.business || '',
      role: profile.account_type || 'client',
      membershipStatus: profile.membership_status || 'free',
      suspended: profile.membership_status === 'suspended' || profile.status === 'removed',
      verified: profile.account_type === 'admin' || Boolean(profile.vetted_at)
    };
  }
  function accounts() {
    return (typeof adminProfilesStatus !== 'undefined' && adminProfilesStatus === 'ready' && typeof secureAdminProfiles !== 'undefined') ? arr(secureAdminProfiles).map(accountFromProfile) : arr(state && state.users);
  }
  function bucket(member) {
    const status = String(member.membershipStatus || member.membership_status || member.status || '').toLowerCase();
    if (member.suspended || status === 'suspended' || status === 'removed' || member.removedAt || member.removed_at) return 'archived';
    if (status === 'pending' || member.role === 'pending') return 'pending';
    return 'active';
  }
  function repText(member) {
    const tier = typeof memberReputationTier === 'function' ? memberReputationTier(member) : (member.role === 'admin' ? 'admin' : member.verified ? 'blue' : 'none');
    if (tier === 'admin') return 'JP Admin';
    if (tier === 'gold') return 'Gold Trusted';
    if (tier === 'blue') return 'Blue Verified';
    return member.role === 'client' ? 'Client Portal' : 'Pending vetting';
  }
  function accountActions(member) {
    const e = esc(member.email || '');
    const archived = bucket(member) === 'archived';
    return '<div class="admin-actions admin-account-actions">' +
      (member.role === 'client' ? '<button class="primary-button admin-action" data-admin-action="upgrade" data-email="' + e + '" type="button">Upgrade to Hub</button>' : '') +
      (member.role === 'member' ? '<button class="secondary-button admin-action" data-admin-action="downgrade" data-email="' + e + '" type="button">Move to Client</button>' : '') +
      '<button class="secondary-button admin-action" data-admin-action="verify" data-email="' + e + '" data-user-id="' + esc(member.id || '') + '" type="button">Verify</button>' +
      '<button class="secondary-button admin-action" data-admin-action="warn" data-email="' + e + '" type="button">Warn</button>' +
      '<button class="secondary-button admin-action" data-admin-action="' + (archived ? 'restore' : 'suspend') + '" data-email="' + e + '" type="button">' + (archived ? 'Restore' : 'Suspend') + '</button>' +
      (member.role === 'admin' ? '' : '<button class="secondary-button admin-action danger-action" data-admin-action="remove" data-email="' + e + '" data-member-name="' + esc(member.name || 'Account') + '" type="button">Remove</button>') + '</div>';
  }
  function accountRow(member) {
    const status = bucket(member);
    const label = typeof roleLabel === 'function' ? roleLabel(member) : (member.role || 'Account');
    return '<article class="feed-item admin-member-row grouped-account-row ' + status + '"><div><span class="badge">' + esc(label) + '</span><div class="member-name-with-badge"><h3>' + esc(member.name || 'Account') + '</h3>' + (typeof reputationBadge === 'function' ? reputationBadge(member) : '') + '</div><p>' + esc(member.business || 'Independent member') + ' - ' + esc(member.email || '') + '</p><div class="meta-row"><span class="pill ' + (member.verified || member.vetted ? 'good' : 'warn') + '">' + esc(repText(member)) + '</span><span class="pill ' + (status === 'archived' ? 'danger' : status === 'pending' ? 'warn' : 'good') + '">' + (status === 'archived' ? 'Archived / suspended' : status === 'pending' ? 'Pending approval' : 'Active') + '</span><span class="pill ' + (member.warning ? 'warn' : '') + '">' + (member.warning ? 'Warned' : 'No warning') + '</span></div></div>' + accountActions(member) + '</article>';
  }
  function accountManagementHtml() {
    const all = accounts();
    const pending = all.filter((m) => bucket(m) === 'pending');
    const active = all.filter((m) => bucket(m) === 'active');
    const archived = all.filter((m) => bucket(m) === 'archived');
    const group = (title, detail, list, tone) => '<details class="admin-account-group" ' + (list.length || title === 'Active accounts' ? 'open' : '') + '><summary><span><strong>' + title + '</strong><small>' + detail + '</small></span><b class="pill ' + tone + '">' + list.length + '</b></summary><div class="feed-list">' + (list.length ? list.map(accountRow).join('') : '<p class="muted">Nothing in this section.</p>') + '</div></details>';
    return '<details class="section-card admin-fold section-lime admin-account-management-grouped" open><summary class="list-title"><div><h2>Account management</h2><p>Approve, upgrade, verify, suspend or archive accounts from one clear place.</p></div><span class="pill">' + all.length + ' total</span></summary><div class="admin-account-tabs">' + group('Pending accounts','Waiting for approval or Hub activation',pending,pending.length?'warn':'good') + group('Active accounts','Live Client Portal, Hub member and admin accounts',active,'good') + group('Archived / suspended','Removed, suspended or inactive records',archived,archived.length?'danger':'') + '</div></details>';
  }

  function adminCounts(user) {
    const posts = arr(state && state.posts);
    const data = {
      access: (typeof adminProfilesStatus !== 'undefined' && adminProfilesStatus === 'ready' && typeof secureAdminProfiles !== 'undefined') ? arr(secureAdminProfiles).filter((p) => p.membership_status === 'pending').length : arr(state && state.applications).filter((a) => !a.example && a.created !== 'Example' && a.status === 'pending').length,
      posts: posts.filter((p) => p.moderationStatus === 'pending' || p.flagged || num(p.reports) > 0).length,
      replies: posts.flatMap((p) => arr(p.responses)).filter((r) => r.moderationStatus === 'pending').length,
      projects: arr(state && state.projects).filter((p) => p.moderationStatus === 'pending').length,
      reviews: arr(state && state.memberReviews).filter((r) => r.moderationStatus === 'pending').length,
      photos: typeof pendingProfilePhotos === 'function' ? pendingProfilePhotos().length : 0,
      quotes: arr(state && state.quotes).filter((q) => q.status === 'jp-review').length,
      messages: typeof unreadMessageCount === 'function' ? unreadMessageCount(user) : 0
    };
    data.total = Object.values(data).reduce((sum, value) => sum + num(value), 0);
    return data;
  }
  function pButton(icon, title, detail, value, target, view) {
    return '<button class="admin-priority-button ' + (num(value) ? 'needs-action' : '') + '" type="button" data-admin-jump="' + esc(target || '') + '" data-view-link="' + esc(view || '') + '"><span class="admin-priority-icon" aria-hidden="true">' + icon + '</span><span class="admin-priority-copy"><strong>' + esc(title) + '</strong><small>' + esc(detail) + '</small></span><span class="admin-priority-count">' + esc(value) + '</span></button>';
  }
  function priorityPanel(user) {
    const c = adminCounts(user);
    return '<section class="admin-priority-command"><div class="admin-priority-head"><div><p class="eyebrow">Admin Review</p><h2>Moderation command centre</h2><p>Everything needing JP Innovation action is at the top.</p></div><span class="admin-priority-total">' + c.total + '</span></div><div class="admin-priority-grid">' + pButton('✓','Access requests','Approve Hub access',c.access,'adminAccessRequests') + pButton('✎','Posts','Publish or reject threads',c.posts,'adminPostModeration') + pButton('↩','Replies','Approve member replies',c.replies,'adminReplyModeration') + pButton('▣','Projects','Review project posts',c.projects,'adminProjectModeration') + pButton('★','Reviews','Approve reputation reviews',c.reviews,'adminMemberReviews') + pButton('◎','Profile photos','Verify uploaded photos',c.photos,'adminProfilePhotos') + pButton('£','Quotes','Review quote requests',c.quotes,'adminQuoteQueue') + pButton('✉','Messages','Unread inbox items',c.messages,'','messages') + '</div><div class="admin-secondary-grid"><button class="admin-secondary-button" type="button" data-admin-jump="adminModerationQueue">Central queue</button><button class="admin-secondary-button" type="button" data-admin-jump="adminNotificationLog">Notification log</button><button class="admin-secondary-button" type="button" data-admin-jump="adminPresenceView">Online members</button><button class="admin-secondary-button" type="button" data-view-link="metrics">Website metrics</button><button class="admin-secondary-button" type="button" data-section-title="Account management">Manage accounts</button><button class="admin-secondary-button" type="button" data-section-title="Approved Posts">Approved posts</button></div><div class="admin-phone-alert-cta"><button id="adminEnablePhoneAlerts" class="secondary-button" type="button">Enable phone alerts</button><small>Tap once on this device to allow JP admin notifications.</small></div></section>';
  }
  function presenceHtml() {
    const rows = (typeof adminPresenceRows !== 'undefined' && arr(adminPresenceRows).length ? arr(adminPresenceRows) : accounts().filter((m) => m.role === 'admin' || m.role === 'member').map((m) => ({ name: m.name || m.email || 'Hub member', email: m.email || '', currentSection: m.currentSection || 'Dashboard', lastActiveAt: m.lastActiveAt || new Date().toISOString(), online: Boolean(m.online) || clean(m.email) === clean(typeof currentUser === 'function' ? currentUser()?.email : '') })));
    return '<details id="adminPresenceView" class="section-card admin-fold section-lime"><summary class="list-title"><div><h2>Member presence</h2><p>Online status uses live presence where available, with a safe account fallback.</p></div><span class="pill good">' + rows.filter((r) => r.online).length + ' online</span></summary><div class="feed-list">' + (rows.length ? rows.map((row) => '<article class="feed-item admin-presence-row"><div><h3><span class="online-dot ' + (row.online ? '' : 'offline') + '" aria-hidden="true"></span>' + esc(row.name) + '</h3><p>' + esc(row.email) + ' · ' + esc(row.currentSection || 'Unknown section') + '</p><small>' + (row.online ? 'Online now' : 'Offline') + ' - last active ' + esc(typeof relativeDateLabel === 'function' ? relativeDateLabel(row.lastActiveAt) : 'recently') + '</small></div></article>').join('') : '<p class="muted">No member presence data yet.</p>') + '</div></details>';
  }
  function findDetailsEnd(html, start) {
    const close = '</details>';
    let depth = 0;
    let pos = start;
    while (pos < html.length) {
      const nextOpen = html.indexOf('<details', pos);
      const nextClose = html.indexOf(close, pos);
      if (nextClose === -1) return -1;
      if (nextOpen !== -1 && nextOpen < nextClose) { depth += 1; pos = nextOpen + 8; continue; }
      depth -= 1; pos = nextClose + close.length;
      if (depth === 0) return pos;
    }
    return -1;
  }
  function replaceSection(html, matcher, replacement) {
    const start = matcher(html);
    if (start < 0) return html;
    const end = findDetailsEnd(html, start);
    if (end < 0) return html;
    return html.slice(0, start) + replacement + html.slice(end);
  }

  const baseRenderAdmin = typeof renderAdmin === 'function' ? renderAdmin : null;
  if (baseRenderAdmin) {
    renderAdmin = function renderAdmin(user) {
      addStyles();
      let html = baseRenderAdmin(user);
      if (!user || user.role !== 'admin') return html;
      html = replaceSection(html, (s) => s.indexOf('<details id="adminPresenceView"'), presenceHtml());
      html = replaceSection(html, (s) => {
        const title = s.indexOf('<h2>Account management</h2>');
        return title < 0 ? -1 : s.lastIndexOf('<details', title);
      }, accountManagementHtml());
      return priorityPanel(user) + html;
    };
  }

  bindApplicationActions = function bindApplicationActions() {
    document.querySelectorAll('.application-action').forEach((button) => button.addEventListener('click', async () => {
      const visible = (typeof adminProfilesStatus !== 'undefined' && adminProfilesStatus === 'ready') ? arr(secureAdminProfiles).filter((p) => p.membership_status === 'pending').map(secureProfileApplication) : arr(state && state.applications);
      const application = visible.find((item) => item.id === button.dataset.id);
      if (!application) return;
      const action = button.dataset.applicationAction;
      if (application.secure) {
        try {
          if (action === 'approve') await updateSecureProfileAccess(application.userId, { account_type: 'member', membership_status: 'active', vetted_at: new Date().toISOString(), status: 'active' });
          if (action === 'reject') await updateSecureProfileAccess(application.userId, { account_type: 'client', membership_status: 'free', vetted_at: null, status: 'active' });
          await loadSecureAdminProfiles(true);
          if (typeof loadReliableAdminData === 'function') await loadReliableAdminData();
          adminProfilesMessage = action === 'approve' ? application.fullName + ' now has paid Innovation Hub access.' : application.fullName + ' has been moved back to free Client Portal access.';
          if (typeof showSuccessToast === 'function') showSuccessToast(action === 'approve' ? 'Hub access approved.' : 'Hub access rejected.', adminProfilesMessage);
          if (typeof renderNotifications === 'function') renderNotifications();
          renderView('admin');
        } catch (error) {
          adminProfilesMessage = 'Access update failed: ' + (error.message || 'Please try again.');
          if (window.showErrorToast) window.showErrorToast('Access update failed.', 'Please try again.');
          renderView('admin');
        }
        return;
      }
      if (action === 'delete') state.applications = arr(state.applications).filter((item) => item.id !== application.id);
      if (action === 'reject') { application.status = 'rejected'; application.notes = 'Rejected by admin.'; }
      if (action === 'contacted') { application.status = 'contacted'; application.notes = 'Contacted by admin.'; }
      if (action === 'approve') {
        const password = temporaryPasswordFor(application);
        const existingUser = state.users.find((u) => u.email === application.email);
        const member = existingUser || createMemberAccount({ name: application.fullName || application.email, business: application.business || '', email: application.email, password, location: application.location || '', skill: application.skill || '', equipment: application.equipment || '', portfolio: application.portfolio || '', bio: application.offer || application.message || '', verified: true, vetted: true, badgeTier: 'blue' });
        application.status = 'approved';
        application.generatedPassword = existingUser ? 'Existing login already created' : password;
        application.notes = member.name + ' login ' + (existingUser ? 'already exists' : 'created') + '.';
      }
      saveState();
      renderView('admin');
    }));
  };

  const baseLoadReliableAdminData = typeof loadReliableAdminData === 'function' ? loadReliableAdminData : null;
  if (baseLoadReliableAdminData) {
    loadReliableAdminData = async function loadReliableAdminData() {
      const ok = await baseLoadReliableAdminData();
      if (!ok && typeof adminPresenceRows !== 'undefined') {
        adminPresenceRows = accounts().filter((m) => m.role === 'admin' || m.role === 'member').map((m) => ({ id: m.id, email: clean(m.email), name: m.name || m.email || 'Hub member', role: m.role || 'member', membershipStatus: m.membershipStatus || 'active', currentSection: m.currentSection || 'dashboard', lastActiveAt: m.lastActiveAt || new Date().toISOString(), online: Boolean(m.online) || clean(m.email) === clean(typeof currentUser === 'function' ? currentUser()?.email : '') }));
      }
      return ok;
    };
  }

  document.addEventListener('click', async (event) => {
    const shortcut = event.target.closest?.('[data-admin-jump], .admin-secondary-button[data-view-link]');
    if (shortcut) {
      event.preventDefault();
      if (shortcut.dataset.viewLink) { renderView(shortcut.dataset.viewLink); return; }
      let target = document.getElementById(shortcut.dataset.adminJump || '');
      if (!target && shortcut.dataset.sectionTitle) target = Array.from(document.querySelectorAll('#viewMount details.admin-fold')).find((section) => section.querySelector('summary h2')?.textContent.trim().toLowerCase() === shortcut.dataset.sectionTitle.toLowerCase());
      if (target) { if (target.matches('details')) target.open = true; target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }
    const alertButton = event.target.closest?.('#adminEnablePhoneAlerts');
    if (alertButton) {
      event.preventDefault();
      alertButton.disabled = true;
      const original = alertButton.textContent;
      alertButton.textContent = 'Opening prompt...';
      try {
        if (typeof enablePhoneNotifications !== 'function') throw new Error('Phone alerts are not available on this browser.');
        const message = await enablePhoneNotifications();
        if (typeof showSuccessToast === 'function') showSuccessToast('Phone alerts enabled.', message || 'This device can now show JP notifications.');
        alertButton.textContent = 'Phone alerts enabled';
      } catch (error) {
        if (window.showErrorToast) window.showErrorToast('Phone alerts not enabled.', error.message || 'Please check browser settings.');
        alertButton.textContent = original;
      } finally {
        alertButton.disabled = false;
      }
    }
  });

  window.addEventListener('load', () => {
    addStyles();
    if (typeof currentView !== 'undefined' && currentView === 'admin' && typeof currentUser === 'function' && currentUser()?.role === 'admin' && typeof renderView === 'function') renderView('admin');
  });
})();
