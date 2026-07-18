/* JP Innovation admin functionality fixes: approvals refresh, account grouping, phone alert CTA and presence fallback. */
(function () {
  function safeArray(value) { return Array.isArray(value) ? value : []; }
  function cleanEmail(email) { return typeof cleanEmailValue === 'function' ? cleanEmailValue(email || '') : String(email || '').trim().toLowerCase(); }
  function htmlEscape(value) { return typeof escapeHtml === 'function' ? escapeHtml(value) : String(value ?? '').replace(/[&<>"']/g, function (char) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char]; }); }
  function roleText(member) { return typeof roleLabel === 'function' ? roleLabel(member) : (member.role || 'Account'); }
  function tierText(member) {
    const tier = typeof memberReputationTier === 'function' ? memberReputationTier(member) : (member.role === 'admin' ? 'admin' : member.verified ? 'blue' : 'none');
    if (tier === 'admin') return 'JP Admin';
    if (tier === 'gold') return 'Gold Trusted';
    if (tier === 'blue') return 'Blue Verified';
    return member.role === 'client' ? 'Client Portal' : 'Pending vetting';
  }
  function profileToMember(profile) {
    return typeof secureProfileUser === 'function' ? secureProfileUser(profile) : {
      id: profile.user_id,
      email: cleanEmail(profile.email),
      name: profile.full_name || cleanEmail(profile.email) || 'Account',
      business: profile.business || '',
      role: profile.account_type || 'client',
      membershipStatus: profile.membership_status || 'free',
      suspended: profile.membership_status === 'suspended' || profile.status === 'removed',
      verified: profile.account_type === 'admin' || Boolean(profile.vetted_at)
    };
  }
  function allAdminAccounts() {
    const secureReady = typeof adminProfilesStatus !== 'undefined' && adminProfilesStatus === 'ready' && typeof secureAdminProfiles !== 'undefined';
    return secureReady ? safeArray(secureAdminProfiles).map(profileToMember) : safeArray(state && state.users);
  }
  function accountBucket(member) {
    const status = String(member.membershipStatus || member.membership_status || '').toLowerCase();
    if (member.suspended || status === 'suspended' || status === 'removed' || member.removedAt || member.removed_at) return 'archived';
    if (status === 'pending' || member.status === 'pending' || member.role === 'pending') return 'pending';
    return 'active';
  }
  function actionButtons(member) {
    const email = htmlEscape(member.email || '');
    const name = htmlEscape(member.name || 'Account');
    const role = member.role || 'client';
    const suspended = accountBucket(member) === 'archived';
    return '<div class="admin-actions admin-account-actions">' +
      (role === 'client' ? '<button class="primary-button admin-action" data-admin-action="upgrade" data-email="' + email + '" type="button">Upgrade to Hub</button>' : '') +
      (role === 'member' ? '<button class="secondary-button admin-action" data-admin-action="downgrade" data-email="' + email + '" type="button">Move to Client</button>' : '') +
      '<button class="secondary-button admin-action" data-admin-action="verify" data-email="' + email + '" data-user-id="' + htmlEscape(member.id || '') + '" type="button">Verify</button>' +
      '<button class="secondary-button admin-action" data-admin-action="warn" data-email="' + email + '" type="button">Warn</button>' +
      '<button class="secondary-button admin-action" data-admin-action="' + (suspended ? 'restore' : 'suspend') + '" data-email="' + email + '" type="button">' + (suspended ? 'Restore' : 'Suspend') + '</button>' +
      (role === 'admin' ? '' : '<button class="secondary-button admin-action danger-action" data-admin-action="remove" data-email="' + email + '" data-member-name="' + name + '" type="button">Remove</button>') +
    '</div>';
  }
  function accountRow(member) {
    const status = accountBucket(member);
    return '<article class="feed-item admin-member-row grouped-account-row ' + status + '">' +
      '<div><span class="badge">' + htmlEscape(roleText(member)) + '</span>' +
      '<div class="member-name-with-badge"><h3>' + htmlEscape(member.name || 'Account') + '</h3>' + (typeof reputationBadge === 'function' ? reputationBadge(member) : '') + '</div>' +
      '<p>' + htmlEscape(member.business || 'Independent member') + ' - ' + htmlEscape(member.email || '') + '</p>' +
      '<div class="meta-row"><span class="pill ' + (member.verified || member.vetted ? 'good' : 'warn') + '">' + htmlEscape(tierText(member)) + '</span>' +
      '<span class="pill ' + (status === 'archived' ? 'danger' : status === 'pending' ? 'warn' : 'good') + '">' + (status === 'archived' ? 'Archived / suspended' : status === 'pending' ? 'Pending approval' : 'Active') + '</span>' +
      '<span class="pill ' + (member.warning ? 'warn' : '') + '">' + (member.warning ? 'Warned' : 'No warning') + '</span></div></div>' + actionButtons(member) + '</article>';
  }
  function groupedAccountHtml() {
    const accounts = allAdminAccounts();
    const pending = accounts.filter(function (member) { return accountBucket(member) === 'pending'; });
    const active = accounts.filter(function (member) { return accountBucket(member) === 'active'; });
    const archived = accounts.filter(function (member) { return accountBucket(member) === 'archived'; });
    function group(title, detail, list, tone) {
      return '<details class="admin-account-group" ' + (list.length || title === 'Active accounts' ? 'open' : '') + '><summary><span><strong>' + title + '</strong><small>' + detail + '</small></span><b class="pill ' + tone + '">' + list.length + '</b></summary><div class="feed-list">' + (list.length ? list.map(accountRow).join('') : '<p class="muted">Nothing in this section.</p>') + '</div></details>';
    }
    return '<details class="section-card admin-fold section-lime admin-account-management-grouped" open>' +
      '<summary class="list-title"><div><h2>Account management</h2><p>Approve, upgrade, verify, suspend or archive accounts from one clear place.</p></div><span class="pill">' + accounts.length + ' total</span></summary>' +
      '<div class="admin-account-tabs">' +
        group('Pending accounts', 'Waiting for approval or Hub activation', pending, pending.length ? 'warn' : 'good') +
        group('Active accounts', 'Live Client Portal, Hub member and admin accounts', active, 'good') +
        group('Archived / suspended', 'Removed, suspended or inactive records', archived, archived.length ? 'danger' : '') +
      '</div>' +
    '</details>';
  }
  function replaceAccountManagement(html) {
    const marker = '<summary class="list-title"><div><h2>Account management</h2>';
    const start = html.indexOf('<details class="section-card admin-fold section-lime">' + marker);
    if (start === -1) return html;
    const end = html.indexOf('\n    </details>', start);
    if (end === -1) return html;
    return html.slice(0, start) + groupedAccountHtml() + html.slice(end + '\n    </details>'.length);
  }

  const previousRenderAdmin = typeof renderAdmin === 'function' ? renderAdmin : null;
  if (previousRenderAdmin) {
    renderAdmin = function renderAdmin(user) {
      let html = previousRenderAdmin(user);
      if (!user || user.role !== 'admin') return html;
      html = replaceAccountManagement(html);
      html = html.replace('</section>', '<div class="admin-alert-inline"><button id="adminEnablePhoneAlerts" class="secondary-button" type="button">Enable phone alerts</button><small>Needed before your phone can show JP admin notifications.</small></div></section>');
      return html;
    };
  }

  const previousBindApplicationActions = typeof bindApplicationActions === 'function' ? bindApplicationActions : null;
  bindApplicationActions = function bindApplicationActions() {
    document.querySelectorAll('.application-action').forEach(function (button) {
      button.addEventListener('click', async function () {
        const visibleApplications = (typeof adminProfilesStatus !== 'undefined' && adminProfilesStatus === 'ready')
          ? safeArray(secureAdminProfiles).filter(function (profile) { return profile.membership_status === 'pending'; }).map(secureProfileApplication)
          : safeArray(state && state.applications);
        const application = visibleApplications.find(function (item) { return item.id === button.dataset.id; });
        if (!application) return;
        const action = button.dataset.applicationAction;
        if (application.secure) {
          try {
            if (action === 'approve') await updateSecureProfileAccess(application.userId, { account_type: 'member', membership_status: 'active', vetted_at: new Date().toISOString(), status: 'active' });
            if (action === 'reject') await updateSecureProfileAccess(application.userId, { account_type: 'client', membership_status: 'free', vetted_at: null, status: 'active' });
            await loadSecureAdminProfiles(true);
            if (typeof loadReliableAdminData === 'function') await loadReliableAdminData();
            adminProfilesMessage = action === 'approve'
              ? application.fullName + ' now has paid Innovation Hub access.'
              : application.fullName + ' has been moved back to free Client Portal access.';
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
        if (previousBindApplicationActions) {
          button.dataset.jpFallbackApplicationAction = '1';
        }
      });
    });
    if (previousBindApplicationActions) previousBindApplicationActions();
  };

  const previousLoadReliableAdminData = typeof loadReliableAdminData === 'function' ? loadReliableAdminData : null;
  if (previousLoadReliableAdminData) {
    loadReliableAdminData = async function loadReliableAdminData() {
      const ok = await previousLoadReliableAdminData();
      if (!ok) {
        const fallback = allAdminAccounts().filter(function (member) { return member.role === 'admin' || member.role === 'member'; }).map(function (member) {
          return {
            id: member.id,
            email: cleanEmail(member.email),
            name: member.name || member.email || 'Hub member',
            role: member.role || 'member',
            membershipStatus: member.membershipStatus || 'active',
            currentSection: member.currentSection || 'dashboard',
            lastActiveAt: member.lastActiveAt || new Date().toISOString(),
            online: Boolean(member.online) || cleanEmail(member.email) === cleanEmail(currentUser && currentUser()?.email)
          };
        });
        if (fallback.length) adminPresenceRows = fallback;
      }
      return ok;
    };
  }

  document.addEventListener('click', async function (event) {
    const button = event.target.closest && event.target.closest('#adminEnablePhoneAlerts');
    if (!button) return;
    event.preventDefault();
    button.disabled = true;
    const original = button.textContent;
    button.textContent = 'Opening prompt...';
    try {
      if (typeof enablePhoneNotifications !== 'function') throw new Error('Phone alerts are not available on this browser.');
      const message = await enablePhoneNotifications();
      if (typeof showSuccessToast === 'function') showSuccessToast('Phone alerts enabled.', message || 'This device can now show JP notifications.');
      button.textContent = 'Phone alerts enabled';
    } catch (error) {
      if (window.showErrorToast) window.showErrorToast('Phone alerts not enabled.', error.message || 'Please check browser settings.');
      button.textContent = original;
    } finally {
      button.disabled = false;
    }
  });

  function addStyles() {
    if (document.getElementById('adminFunctionalityOverrideStyles')) return;
    const style = document.createElement('style');
    style.id = 'adminFunctionalityOverrideStyles';
    style.textContent = `
      .admin-alert-inline { display:flex; align-items:center; gap:10px; margin-top:10px; padding:9px; border:1px solid rgba(47,141,255,.16); border-radius:13px; background:rgba(47,141,255,.06); }
      .admin-alert-inline .secondary-button { min-height:34px; padding:7px 10px; border-radius:11px; font-size:11px; }
      .admin-alert-inline small { color:var(--silver,#aeb8c6); font-size:10px; line-height:1.2; }
      .admin-account-tabs { display:grid; gap:10px; }
      .admin-account-group { border:1px solid rgba(255,255,255,.08); border-radius:14px; background:rgba(2,8,14,.28); overflow:hidden; }
      .admin-account-group > summary { display:flex; align-items:center; justify-content:space-between; gap:10px; min-height:44px; padding:10px 12px; cursor:pointer; }
      .admin-account-group > summary strong { display:block; font-size:13px; }
      .admin-account-group > summary small { display:block; margin-top:2px; color:var(--silver,#aeb8c6); font-size:10px; }
      .grouped-account-row { border-radius:12px; }
      .admin-account-actions { flex-wrap:wrap; gap:6px; }
      .admin-account-actions button { min-height:32px; padding:7px 9px; font-size:10.5px; border-radius:10px; }
      @media (max-width: 760px) {
        .admin-alert-inline { align-items:flex-start; flex-direction:column; gap:6px; }
        .admin-alert-inline .secondary-button { width:100%; }
        .admin-account-group > summary { min-height:42px; padding:9px 10px; }
        .admin-account-actions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); width:100%; }
        .admin-account-actions button { width:100%; }
      }
    `;
    document.head.appendChild(style);
  }
  addStyles();
  window.addEventListener('load', addStyles);
})();
