/* JP Innovation admin dashboard override: keeps admin management separate from member dashboard. */
(function () {
  function jpIcon(name) {
    const icons = {
      bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
      mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4z"/><path d="m4 7 8 6 8-6"/></svg>',
      check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 13 4 4L19 7"/></svg>',
      users: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20c.6-4 2.7-6 6-6s5.4 2 6 6M15 15c2.8.2 4.6 1.8 5 5"/></svg>',
      project: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V6h6l2 2h8v11z"/><path d="M8 13h8"/></svg>',
      quote: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
      event: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v15H5z"/><path d="M8 3v4M16 3v4M5 10h14"/></svg>',
      chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-8"/></svg>',
      plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
      pulse: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13h4l2-6 4 10 2-4h4"/></svg>'
    };
    return icons[name] || icons.pulse;
  }

  function cleanErrorToast(title, detail) {
    let toast = document.querySelector('#appErrorToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'appErrorToast';
      toast.className = 'app-toast error';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.innerHTML = '<span aria-hidden="true">!</span><div><strong>' + escapeHtml(title) + '</strong>' + (detail ? '<small>' + escapeHtml(detail) + '</small>' : '') + '</div>';
    toast.classList.add('show');
    window.clearTimeout(cleanErrorToast.timer);
    cleanErrorToast.timer = window.setTimeout(function () { toast.classList.remove('show'); }, 5200);
  }
  window.showErrorToast = window.showErrorToast || cleanErrorToast;

  const originalRenderDashboard = typeof renderDashboard === 'function' ? renderDashboard : null;

  function adminCount(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number : 0;
  }

  function adminRow(item, tone) {
    return '<button class="admin-task-row dashboard-link" data-view-link="' + escapeHtml(item.view || 'admin') + '" type="button">' +
      '<span class="admin-task-value ' + escapeHtml(tone || '') + '">' + escapeHtml(item.value) + '</span>' +
      '<span><strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(item.detail) + '</small></span>' +
      '<b aria-hidden="true">›</b>' +
      '</button>';
  }

  function adminMetric(item) {
    return '<button class="admin-metric-card dashboard-link" data-view-link="' + escapeHtml(item.view || 'metrics') + '" type="button">' +
      '<span class="admin-metric-icon" aria-hidden="true">' + item.icon + '</span>' +
      '<span><strong>' + escapeHtml(item.label) + '</strong><small>' + escapeHtml(item.detail) + '</small></span>' +
      '<b>' + escapeHtml(item.value) + '</b>' +
      '</button>';
  }

  window.renderAdminDashboard = function renderAdminDashboard(user) {
    const unread = unreadMessageCount(user);
    const notificationCount = notificationItems(user).filter(function (item) { return item.isNew; }).length;
    const moderationQueue = (adminModerationQueue || []).filter(function (item) { return item.status === 'Pending Review'; }).length;
    const applications = adminProfilesStatus === 'ready'
      ? secureAdminProfiles.filter(function (profile) { return profile.membership_status === 'pending'; }).map(secureProfileApplication)
      : (state.applications || []).filter(function (application) { return !application.example && application.created !== 'Example'; });
    const pendingApplications = applications.filter(function (application) { return application.status === 'pending'; }).length;
    const pendingPosts = (state.posts || []).filter(function (post) { return post.status === 'pending' || post.moderationStatus === 'pending'; }).length;
    const pendingReplies = (state.posts || []).flatMap(function (post) { return post.responses || []; }).filter(function (reply) { return reply.moderationStatus === 'pending'; }).length;
    const pendingProjects = (state.projects || []).filter(function (project) { return project.moderationStatus === 'pending'; }).length;
    const pendingReviews = (state.memberReviews || []).filter(function (review) { return review.moderationStatus === 'pending'; }).length;
    const pendingPhotos = typeof pendingProfilePhotos === 'function' ? pendingProfilePhotos().length : 0;
    const activeProjects = (state.projects || []).filter(function (project) { return !['complete', 'completed', 'closed'].includes(String(project.status || '').toLowerCase()); }).length;
    const openQuotes = (state.quotes || []).filter(function (quote) { return quote.status !== 'closed'; }).length;
    const upcomingEvents = upcomingDashboardEvents().length;
    const totalMembers = (adminProfilesStatus === 'ready' ? secureAdminProfiles.map(secureProfileUser) : state.users).filter(function (item) { return ['member', 'admin'].includes(item.role); }).length;
    const onlineMembers = dashboardOnlineMembers(user).length;
    const urgentTotal = moderationQueue + pendingApplications + pendingPosts + pendingReplies + pendingProjects + pendingReviews + pendingPhotos;
    const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    const activity = dashboardActivityFeed(user).slice(0, 4);
    const overview = [
      { icon: jpIcon('bell'), label: 'Notifications', value: notificationCount, view: 'notifications' },
      { icon: jpIcon('mail'), label: 'Messages', value: unread, view: 'messages' },
      { icon: jpIcon('check'), label: 'Pending approvals', value: urgentTotal, view: 'admin' },
      { icon: '<span class="online-dot"></span>', label: 'Members online', value: onlineMembers, view: 'directory' }
    ];
    const pending = [
      { title: 'Access requests', value: pendingApplications, detail: 'new Hub applications', view: 'admin' },
      { title: 'Moderation queue', value: moderationQueue + pendingPosts + pendingReplies, detail: 'posts and replies awaiting review', view: 'admin' },
      { title: 'Project reviews', value: pendingProjects, detail: 'project submissions awaiting approval', view: 'admin' },
      { title: 'Member reviews', value: pendingReviews + pendingPhotos, detail: 'reviews and profile photos', view: 'admin' },
      { title: 'Unread messages', value: unread, detail: 'inbox items needing response', view: 'messages' }
    ];
    const metrics = [
      { icon: jpIcon('users'), label: 'Total members', value: totalMembers, detail: 'approved Hub/admin accounts', view: 'directory' },
      { icon: jpIcon('check'), label: 'New registrations', value: pendingApplications, detail: 'awaiting access decision', view: 'admin' },
      { icon: jpIcon('chart'), label: 'Website visits', value: 'Live', detail: 'open website metrics', view: 'metrics' },
      { icon: jpIcon('users'), label: 'Unique visitors', value: 'Live', detail: 'open website metrics', view: 'metrics' },
      { icon: jpIcon('project'), label: 'Active projects', value: activeProjects, detail: 'open project workspaces', view: 'projects' },
      { icon: jpIcon('quote'), label: 'Open quotes', value: openQuotes, detail: 'quote requests not closed', view: 'quotes' },
      { icon: jpIcon('check'), label: 'Pending approvals', value: moderationQueue + pendingApplications, detail: 'admin action required', view: 'admin' },
      { icon: jpIcon('event'), label: 'Upcoming events', value: upcomingEvents, detail: 'scheduled Hub items', view: 'events' }
    ];
    return '<div class="admin-dashboard-shell">' +
      '<section class="admin-overview-card"><div class="admin-overview-head"><div><p class="dashboard-date">' + escapeHtml(today) + '</p><h2>Admin overview</h2></div><button class="secondary-button dashboard-link" data-view-link="admin" type="button">Admin review</button></div>' +
      '<div class="admin-overview-grid">' + overview.map(function (item) { return '<button class="admin-overview-stat dashboard-link" data-view-link="' + escapeHtml(item.view) + '" type="button"><span aria-hidden="true">' + item.icon + '</span><strong>' + escapeHtml(item.value) + '</strong><small>' + escapeHtml(item.label) + '</small></button>'; }).join('') + '</div></section>' +
      '<section class="admin-panel-card"><div class="admin-section-head"><h2>Pending actions</h2><p>Items needing a decision first.</p></div><div class="admin-task-list">' + (pending.some(function (item) { return adminCount(item.value) > 0; }) ? pending.filter(function (item) { return adminCount(item.value) > 0; }).map(function (item) { return adminRow(item, 'warn'); }).join('') : '<div class="admin-empty-state"><strong>No urgent admin tasks</strong><small>Approvals, moderation and unread messages are clear.</small></div>') + '</div></section>' +
      '<section class="admin-panel-card"><div class="admin-section-head"><h2>Quick actions</h2><p>Common admin shortcuts.</p></div><div class="admin-quick-actions"><button class="dashboard-link" data-view-link="boards" type="button"><span>' + jpIcon('plus') + '</span>New Discussion</button><button class="dashboard-link" data-view-link="projects" type="button"><span>' + jpIcon('plus') + '</span>New Project</button><button class="dashboard-link" data-view-link="quotes" type="button"><span>' + jpIcon('plus') + '</span>Request Quote</button><button class="dashboard-link" data-view-link="events" type="button"><span>' + jpIcon('plus') + '</span>Create Event</button><button class="dashboard-link" data-view-link="admin" type="button"><span>' + jpIcon('users') + '</span>Manage Members</button></div></section>' +
      '<section class="admin-panel-card"><div class="admin-section-head"><h2>Website metrics</h2><p>Compact management view.</p></div><div class="admin-metrics-grid">' + metrics.map(adminMetric).join('') + '</div></section>' +
      '<section class="admin-panel-card"><div class="admin-section-head"><h2>Hub activity</h2><p>Current operating status.</p></div><div class="admin-task-list">' + adminRow({ title: 'Open quotes', value: openQuotes, detail: 'quote requests not yet closed', view: 'quotes' }) + adminRow({ title: 'Active projects', value: activeProjects, detail: 'project workspaces in progress', view: 'projects' }) + adminRow({ title: 'Upcoming events', value: upcomingEvents, detail: 'events and sessions scheduled', view: 'events' }) + '</div></section>' +
      '<section class="admin-panel-card"><div class="admin-section-head"><h2>Recent activity</h2><p>Latest Hub updates.</p></div><div class="admin-task-list">' + (activity.length ? activity.map(function (item) { return adminRow({ title: item.title, value: item.type || 'Hub', detail: item.detail + ' · ' + relativeDateLabel(item.when), view: item.view || 'notifications' }); }).join('') : '<div class="admin-empty-state"><strong>No recent activity</strong><small>Hub activity will appear here when members start using it.</small></div>') + '</div></section>' +
      '</div>';
  };

  if (originalRenderDashboard) {
    renderDashboard = function renderDashboard(user) {
      if (isClientPortalContext(user)) return renderClientDashboard(user);
      if (user && user.role === 'admin') return window.renderAdminDashboard(user);
      return originalRenderDashboard(user);
    };
  }

  bindAnalyticsResetButtons = function bindAnalyticsResetButtons() {
    document.querySelectorAll('.analytics-reset-button').forEach(function (button) {
      button.addEventListener('click', async function () {
        const scope = button.dataset.resetScope || 'all';
        const label = scope === 'today' ? "today's visitor metrics" : 'all visitor analytics history';
        const confirmed = await openConfirmDialog({
          title: 'Reset website metrics?',
          message: 'Are you sure you want to reset ' + label + '? This clears page-view analytics only. It will not delete members, posts, quotes or projects.',
          confirmLabel: scope === 'today' ? 'Reset today' : 'Reset all visits',
          cancelLabel: 'Cancel',
          danger: true
        });
        if (!confirmed) return;
        try {
          if (!portalBackend) throw new Error('Secure backend is unavailable.');
          const result = await portalBackend.rpc('admin_reset_site_analytics', { p_scope: scope });
          if (result.error) throw result.error;
          showSuccessToast('Metrics reset.', scope === 'today' ? "Today's visitor analytics were cleared." : 'Visitor analytics history was cleared.');
          await loadSiteAnalytics();
        } catch (error) {
          console.error('Analytics reset failed', error);
          (window.showErrorToast || cleanErrorToast)('Analytics could not be reset.', 'Please try again.');
        }
      });
    });
  };
})();

/* Load production core patch after the dashboard override without changing the main app bundle. */
(function () {
  if (document.querySelector('script[src*="production-core-override.js"]')) return;
  var script = document.createElement('script');
  script.src = 'production-core-override.js?v=production-core-20260718';
  script.defer = true;
  document.head.appendChild(script);
})();
