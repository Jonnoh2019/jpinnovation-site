/* JP Innovation Admin Review override: compact admin navigation plus approval/account fixes. */
(function () {
  const esc = (value) => typeof escapeHtml === 'function' ? escapeHtml(value) : String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]);
  const arr = (value) => Array.isArray(value) ? value : [];
  const email = (value) => typeof cleanEmailValue === 'function' ? cleanEmailValue(value || '') : String(value || '').trim().toLowerCase();
  const count = (value) => Number.isFinite(Number(value || 0)) ? Number(value || 0) : 0;

  function injectAdminStyles() {
    if (document.getElementById('adminReviewOverrideStyles')) return;
    const style = document.createElement('style');
    style.id = 'adminReviewOverrideStyles';
    style.textContent = `
      .view-mount[data-view="admin"] { gap: 12px; }
      .view-mount[data-view="admin"] .admin-control-hero { display: none !important; }
      .admin-priority-command { display: grid; gap: 11px; padding: 13px; border: 1px solid rgba(47,141,255,.22); border-left: 2px solid rgba(47,141,255,.85); border-radius: 18px; background: linear-gradient(145deg, rgba(47,141,255,.12), rgba(255,255,255,.035)); box-shadow: 0 16px 34px rgba(0,0,0,.22); }
      .admin-priority-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
      .admin-priority-head h2 { margin: 0; font-size: 19px; line-height: 1.08; letter-spacing: -.03em; }
      .admin-priority-head p { margin: 4px 0 0; color: var(--silver,#aeb8c6); font-size: 11px; line-height: 1.35; }
      .admin-priority-total { display: grid; place-items: center; min-width: 44px; height: 44px; padding: 0 9px; border-radius: 15px; border: 1px solid rgba(245,158,11,.32); background: rgba(245,158,11,.12); color: #ffd37a; font-size: 20px; font-weight: 900; }
      .admin-priority-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 8px; }
      .admin-priority-button { display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: 8px; min-height: 50px; padding: 8px; border: 1px solid rgba(255,255,255,.085); border-radius: 14px; background: rgba(2,8,14,.32); color: #fff; text-align: left; }
      .admin-priority-button.needs-action { border-color: rgba(245,158,11,.24); }
      .admin-priority-icon { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 10px; background: rgba(47,141,255,.13); color: #66b8ff; font-size: 14px; font-weight: 900; }
      .admin-priority-copy strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11.5px; line-height: 1.1; }
      .admin-priority-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; color: var(--silver,#aeb8c6); font-size: 9px; line-height: 1.15; }
      .admin-priority-count { display: grid; place-items: center; min-width: 28px; height: 24px; padding: 0 7px; border-radius: 999px; background: rgba(255,255,255,.055); color: #eaf2ff; font-size: 11px; font-weight: 900; }
      .admin-priority-button.needs-action .admin-priority-count { background: rgba(245,158,11,.16); color: #ffd37a; }
      .admin-secondary-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 8px; }
      .admin-secondary-button { min-height: 36px; padding: 8px 10px; border: 1px solid rgba(255,255,255,.08); border-radius: 12px; background: rgba(255,255,255,.035); color: #dbe7f7; font-size: 10.5px; font-weight: 900; text-align: center; }
      .admin-phone-alert-cta { display:flex; align-items:center; gap:8px; padding:8px; border:1px solid rgba(47,141,255,.16); border-radius:12px; background:rgba(47,141,255,.06); }
      .admin-phone-alert-cta button { min-height: 32px; padding: 7px 10px; border-radius: 10px; font-size: 10.5px; }
      .admin-phone-alert-cta small { color: var(--silver,#aeb8c6); font-size: 9.5px; line-height: 1.2; }
      .view-mount[data-view="admin"] .admin-fold { border-radius: 16px; }
      .view-mount[data-view="admin"] .admin-fold > summary { min-height: 46px; padding: 11px; }
      .view-mount[data-view="admin"] .admin-fold > summary h2 { font-size: 15px; }
      .view-mount[data-view="admin"] .admin-fold > summary p { font-size: 10.5px; }
      .admin-account-tabs { display: grid; gap: 10px; }
      .admin-account-group { border: 1px solid rgba(255,255,255,.08); border-radius: 14px; background: rgba(2,8,14,.28); overflow: hidden; }
      .admin-account-group > summary { display:flex; align-items:center; justify-content:space-between; gap:10px; min-height:42px; padding:9px 11px; cursor:pointer; }
      .admin-account-group > summary strong { display:block; font-size:12.5px; }
      .admin-account-group > summary small { display:block; margin-top:2px; color:var(--silver,#aeb8c6); font-size:9.5px; }
      .grouped-account-row { border-radius: 12px; }
      .admin-account-actions { flex-wrap: wrap; gap: 6px; }
      .admin-account-actions button { min-height: 31px; padding: 7px 9px; font-size: 10.5px; border-radius: 10px; }
      @media (max-width:760px) { .admin-priority-command { padding:12px; border-radius:16px; gap:9px; } .admin-priority-head h2 { font-size:18px; } .admin-priority-head p { display:none; } .admin-priority-total { min-width:40px; height:40px; font-size:18px; } .admin-priority-grid,.admin-secondary-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:7px; } .admin-priority-button { min-height:47px; padding:8px; gap:7px; } .admin-phone-alert-cta { align-items:flex-start; flex-direction:column; gap:6px; } .admin-phone-alert-cta button { width:100%; } .admin-account-actions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); width:100%; } .admin-account-actions button { width:100%; } }
      @media (max-width:370px) { .admin-priority-grid,.admin-secondary-grid,.admin-account-actions { grid-template-columns:1fr; } }
    `;
    document.head.appendChild(style);
  }

  function accountFromProfile(profile) {
    return typeof secureProfileUser === 'function' ? secureProfileUser(profile) : {
      id: profile.user_id,
      email: email(profile.email),
      name: profile.full_name || profile.email || 'Account',
      business: profile.business || '',
      role: profile.account_type || 'client',
      membershipStatus: profile.membership_status || 'free',
      suspended: profile.membership_status === 'suspended' || profile.status === 'removed',
      verified: profile.account_type === 'admin' || Boolean(profile.vetted_at)
    };
  }
  function allAccounts() {
    return (typeof adminProfilesStatus !== 'undefined' && adminProfilesStatus === 'ready' && typeof secureAdminProfiles !== 'undefined')
      ? arr(secureAdminProfiles).map(accountFromProfile)
      : arr(state && state.users);
  }
  function accountStatus(member) {
    const status = String(member.membershipStatus || member.membership_status || member.status || '').toLowerCase();
    if (member.suspended || status === 'suspended' || status === 'removed' || member.removedAt || member.removed_at) return 'archived';
    if (status === 'pending' || member.role === 'pending') return 'pending';
    return 'active';
  }
  function reputationText(member) {
    const tier = typeof memberReputationTier === 'function' ? memberReputationTier(member) : (member.role === 'admin' ? 'admin' : member.verified ? 'blue' : 'none');
    if (tier === 'admin') return 'JP Admin';
    if (tier === 'gold') return 'Gold Trusted';
    if (tier === 'blue') return 'Blue Verified';
    return member.role === 'client' ? 'Client Portal' : 'Pending vetting';
  }
  function accountActions(member) {
    const memberEmail = esc(member.email || '');
    const name = esc(member.name || 'Account');
    const archived = accountStatus(member) === 'archived';
    return '<div class="admin-actions admin-account-actions">' +
      (member.role === 'client' ? '<button class="primary-button admin-action" data-admin-action="upgrade" data-email="' + memberEmail + '" type="button">Upgrade to Hub</button>' : '') +
      (member.role === 'member' ? '<button class="secondary-button admin-action" data-admin-action="downgrade" data-email="' + memberEmail + '" type="button">Move to Client</button>' : '') +
      '<button class="secondary-button admin-action" data-admin-action="verify" data-email="' + memberEmail + '" data-user-id="' + esc(member.id || '') + '" type="button">Verify</button>' +
      '<button class="secondary-button admin-action" data-admin-action="warn" data-email="' + memberEmail + '" type="button">Warn</button>' +
      '<button class="secondary-button admin-action" data-admin-action="' + (archived ? 'restore' : 'suspend') + '" data-email="' + memberEmail + '" type="button">' + (archived ? 'Restore' : 'Suspend') + '</button>' +
      (member.role === 'admin' ? '' : '<button class="secondary-button admin-action danger-action" data-admin-action="remove" data-email="' + memberEmail + '" data-member-name="' + name + '" type="button">Remove</button>') +
      '</div>';
  }
  function accountRow(member) {
    const status = accountStatus(member);
    const roleLabelText = typeof roleLabel === 'function' ? roleLabel(member) : (member.role || 'Account');
    return '<article class="feed-item admin-member-row grouped-account-row ' + status + '"><div><span class="badge">' + esc(roleLabelText) + '</span><div class="member-name-with-badge"><h3>' + esc(member.name || 'Account') + '</h3>' + (typeof reputationBadge === 'function' ? reputationBadge(member) : '') + '</div><p>' + esc(member.business || 'Independent member') + ' - ' + esc(member.email || '') + '</p><div class="meta-row"><span class="pill ' + (member.verified || member.vetted ? 'good' : 'warn') + '">' + esc(reputationText(member)) + '</span><span class="pill ' + (status === 'archived' ? 'danger' : status === 'pending' ? 'warn' : 'good') + '">' + (status === 'archived' ? 'Archived / suspended' : status === 'pending' ? 'Pending approval' : 'Active') + '</span><span class="pill ' + (member.warning ? 'warn' : '') + '">' + (member.warning ? 'Warned' : 'No warning') + '</span></div></div>' + accountActions(member) + '</article>';
  }
  function groupedAccountHtml() {
    const accounts = allAccounts();
    const pending = accounts.filter((member) => accountStatus(member) === 'pending');
    const active = accounts.filter((member) => accountStatus(member) === 'active');
    const archived = accounts.filter((member) => accountStatus(member) === 'archived');
    function group(title, detail, list, tone) {
      return '<details class="admin-account-group" ' + (list.length || title === 'Active accounts' ? 'open' : '') + '><summary><span><strong>' + title + '</strong><small>' + detail + '</small></span><b class="pill ' + tone + '">' + list.length + '</b></summary><div class="feed-list">' + (list.length ? list.map(accountRow).join('') : '<p class="muted">Nothing in this section.</p>') + '</div></details>';
    }
    return '<details class="section-card admin-fold section-lime admin-account-management-grouped" open><summary class="list-title"><div><h2>Account management</h2><p>Approve, upgrade, verify, suspend or archive accounts from one clear place.</p></div><span class="pill">' + accounts.length + ' total</span></summary><div class="admin-account-tabs">' +
      group('Pending accounts', 'Waiting for approval or Hub activation', pending, pending.length ? 'warn' : 'good') +
      group('Active accounts', 'Live Client Portal, Hub member and admin accounts', active, 'good') +
      group('Archived / suspended', 'Removed, suspended or inactive records', archived, archived.length ? 'danger' : '') +
      '</div></details>';
  }

  function counts(user) {
    const posts = arr(state && state.posts);
    const apps = (typeof adminProfilesStatus !== 'undefined' && adminProfilesStatus === 'ready' && typeof secureAdminProfiles !== 'undefined')
      ? arr(secureAdminProfiles).filter((p) => p.membership_status === 'pending').length
      : arr(state && state.applications).filter((a) => !a.example && a.created !== 'Example' && a.status === 'pending').length;
    const data = {
      access: apps,
      posts: posts.filter((p) => p.moderationStatus === 'pending' || p.flagged || count(p.reports) > 0).length,
      replies: posts.flatMap((p) => arr(p.responses)).filter((r) => r.moderationStatus === 'pending').length,
      projects: arr(state && state.projects).filter((p) => p.moderationStatus === 'pending').length,
      reviews: arr(state && state.memberReviews).filter((r) => r.moderationStatus === 'pending').length,
      photos: typeof pendingProfilePhotos === 'function' ? pendingProfilePhotos().length : 0,
      quotes: arr(state && state.quotes).filter((q) => q.status === 'jp-review').length,
      queue: typeof adminModerationQueue !== 'undefined' ? arr(adminModerationQueue).filter((i) => i.status === 'Pending Review').length : 0,
      messages: typeof unreadMessageCount === 'function' ? unreadMessageCount(user) : 0
    };
    data.total = Object.values(data).reduce((sum, value) => sum + count(value), 0);
    return data;
  }
  function priorityButton(icon, title, detail, value, target, view) {
    return '<button class="admin-priority-button ' + (count(value) ? 'needs-action' : '') + '" type="button" data-admin-jump="' + esc(target || '') + '" data-view-link="' + esc(view || '') + '"><span class="admin-priority-icon" aria-hidden="true">' + icon + '</span><span class="admin-priority-copy"><strong>' + esc(title) + '</strong><small>' + esc(detail) + '</small></span><span class="admin-priority-count">' + esc(value) + '</span></button>';
  }
  function priorityPanel(user) {
    const c = counts(user);
    return '<section class="admin-priority-command"><div class="admin-priority-head"><div><p class="eyebrow">Admin Review</p><h2>Moderation command centre</h2><p>Everything needing JP Innovation action is at the top.</p></div><span class="admin-priority-total">' + c.total + '</span></div><div class="admin-priority-grid">' +
      priorityButton('✓','Access requests','Approve Hub access',c.access,'adminAccessRequests') +
      priorityButton('✎','Posts','Publish or reject threads',c.posts,'adminPostModeration') +
      priorityButton('↩','Replies','Approve member replies',c.replies,'adminReplyModeration') +
      priorityButton('▣','Projects','Review project posts',c.projects,'adminProjectModeration') +
      priorityButton('★','Reviews','Approve reputation reviews',c.reviews,'adminMemberReviews') +
      priorityButton('◎','Profile photos','Verify uploaded photos',c.photos,'adminProfilePhotos') +
      priorityButton('£','Quotes','Review quote requests',c.quotes,'adminQuoteQueue') +
      priorityButton('✉','Messages','Unread inbox items',c.messages,'','messages') +
      '</div><div class="admin-secondary-grid"><button class="admin-secondary-button" type="button" data-admin-jump="adminModerationQueue">Central queue</button><button class="admin-secondary-button" type="button" data-admin-jump="adminNotificationLog">Notification log</button><button class="admin-secondary-button" type="button" data-admin-jump="adminPresenceView">Online members</button><button class="admin-secondary-button" type="button" data-view-link="metrics">Website metrics</button><button class="admin-secondary-button" type="button" data-section-title="Account management">Manage accounts</button><button class="admin-secondary-button" type="button" data-section-title="Approved Posts">Approved posts</button></div><div class="admin-phone-alert-cta"><button id="adminEnablePhoneAlerts" class="secondary-button" type="button">Enable phone alerts</button><small>Tap once on this device to allow JP admin notifications.</small></div></section>';
  }

  function presenceFallbackHtml() {
    const rows = (typeof adminPresenceRows !== 'undefined' && arr(adminPresenceRows).length ? arr(adminPresenceRows) : allAccounts().filter((m) => m.role === 'admin' || m.role === 'member').map((m) => ({ name: m.name || m.email || 'Hub member', email: m.email || '', currentSection: m.currentSection || 'Dashboard', lastActiveAt: m.lastActiveAt || new Date().toISOString(), online: Boolean(m.online) || email(m.email) === email(typeof currentUser === 'function' ? currentUser()?.email : '') })));
    return '<details id="adminPresenceView" class="section-card admin-fold section-lime"><summary class="list-title"><div><h2>Member presence</h2><p>Online status uses live presence where available, with a safe account fallback.</p></div><span class="pill good">' + rows.filter((r) => r.online).length + ' online</span></summary><div class="feed-list">' + (rows.length ? rows.map((row) => '<article class="feed-item admin-presence-row"><div><h3><span class="online-dot ' + (row.online ? '' : 'offline') + '" aria-hidden="true"></span>' + esc(row.name) + '</h3><p>' + esc(row.email) + ' · ' + esc(row.currentSection || 'Unknown section') + '</p><small>' + (row.online ? 'Online now' : 'Offline') + ' - last active ' + esc(typeof relativeDateLabel === 'function' ? relativeDateLabel(row.lastActiveAt) : 'recently') + '</small></div></article>').join('') : '<p class="muted">No member presence data yet.</p>') + '</div></details>';
  }
  function replaceDetails(html, idOrTitle, replacement) {
    let start = html.indexOf('<details id="' + idOrTitle + '"');
    if (start === -1) start = html.indexOf('<details class="section-card admin-fold section-lime">\n      <summary class="list-title"><div><h2>' + idOrTitle + '</h2>');
    if (start === -1) return html;
    const end = html.indexOf('\n    </details>', start);
    if (end === -1) return html;
    return html.slice(0, start) + replacement + html.slice(end + '\n    </details>'.length);
  }

  const previousRenderAdmin = typeof renderAdmin === 'function' ? renderAdmin : null;
  if (previousRenderAdmin) {
    renderAdmin = function renderAdmin(user) {
      injectAdminStyles();
      let html = previousRenderAdmin(user);
      if (!user || user.role !== 'admin') return html;
      html = replaceDetails(html, 'adminPresenceView', presenceFallbackHtml());
      html = replaceDetails(html, 'Account management', groupedAccountHtml());
      return priorityPanel(user) + html;
    };
  }

  bindApplicationActions = function bindApplicationActions() {
    document.querySelectorAll('.application-action').forEach((button) => button.addEventListener('click', async () => {
      const visibleApplications = (typeof adminProfilesStatus !== 'undefined' && adminProfilesStatus === 'ready') ? arr(secureAdminProfiles).filter((p) => p.membership_status === 'pending').map(secureProfileApplication) : arr(state && state.applications);
      const application = visibleApplications.find((item) => item.id === button.dataset.id);
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

  const previousLoadReliableAdminData = typeof loadReliableAdminData === 'function' ? loadReliableAdminData : null;
  if (previousLoadReliableAdminData) {
    loadReliableAdminData = async function loadReliableAdminData() {
      const ok = await previousLoadReliableAdminData();
      if (!ok && typeof adminPresenceRows !== 'undefined') {
        adminPresenceRows = allAccounts().filter((m) => m.role === 'admin' || m.role === 'member').map((m) => ({ id: m.id, email: email(m.email), name: m.name || m.email || 'Hub member', role: m.role || 'member', membershipStatus: m.membershipStatus || 'active', currentSection: m.currentSection || 'dashboard', lastActiveAt: m.lastActiveAt || new Date().toISOString(), online: Boolean(m.online) || email(m.email) === email(typeof currentUser === 'function' ? currentUser()?.email : '') }));
      }
      return ok;
    };
  }

  document.addEventListener('click', async (event) => {
    const jump = event.target.closest?.('[data-admin-jump], .admin-secondary-button[data-view-link]');
    if (jump) {
      event.preventDefault();
      if (jump.dataset.viewLink) { renderView(jump.dataset.viewLink); return; }
      let target = document.getElementById(jump.dataset.adminJump || '');
      if (!target && jump.dataset.sectionTitle) target = Array.from(document.querySelectorAll('#viewMount details.admin-fold')).find((section) => section.querySelector('summary h2')?.textContent.trim().toLowerCase() === jump.dataset.sectionTitle.toLowerCase());
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
    injectAdminStyles();
    if (typeof currentView !== 'undefined' && currentView === 'admin' && typeof currentUser === 'function' && currentUser()?.role === 'admin' && typeof renderView === 'function') renderView('admin');
  });
})();
