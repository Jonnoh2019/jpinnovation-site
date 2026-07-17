/* JP Innovation Admin Review override: compact moderation shortcuts and safer admin navigation. */
(function () {
  function adminReviewStyle() {
    if (document.getElementById('adminReviewOverrideStyles')) return;
    const style = document.createElement('style');
    style.id = 'adminReviewOverrideStyles';
    style.textContent = `
      .view-mount[data-view="admin"] { gap: 12px; }
      .view-mount[data-view="admin"] .admin-control-hero { display: none !important; }
      .admin-priority-command { display: grid; gap: 12px; padding: 14px; border: 1px solid rgba(47,141,255,.22); border-left: 2px solid rgba(47,141,255,.85); border-radius: 18px; background: linear-gradient(145deg, rgba(47,141,255,.12), rgba(255,255,255,.035)); box-shadow: 0 16px 34px rgba(0,0,0,.22); }
      .admin-priority-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
      .admin-priority-head h2 { margin: 0; font-size: 20px; line-height: 1.08; letter-spacing: -.03em; }
      .admin-priority-head p { margin: 4px 0 0; color: var(--silver, #aeb8c6); font-size: 12px; line-height: 1.35; }
      .admin-priority-total { display: grid; place-items: center; min-width: 48px; height: 48px; padding: 0 10px; border-radius: 16px; border: 1px solid rgba(245,158,11,.32); background: rgba(245,158,11,.12); color: #ffd37a; font-size: 22px; font-weight: 900; }
      .admin-priority-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
      .admin-priority-button { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 8px; min-height: 54px; padding: 9px; border: 1px solid rgba(255,255,255,.085); border-radius: 14px; background: rgba(2,8,14,.32); color: #fff; text-align: left; transition: transform .18s ease, border-color .18s ease, background .18s ease; }
      .admin-priority-button:hover { transform: translateY(-1px); border-color: rgba(47,141,255,.34); background: rgba(47,141,255,.08); }
      .admin-priority-icon { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 11px; background: rgba(47,141,255,.13); color: #66b8ff; font-size: 15px; font-weight: 900; }
      .admin-priority-copy strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; line-height: 1.1; }
      .admin-priority-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px; color: var(--silver, #aeb8c6); font-size: 9.5px; line-height: 1.15; }
      .admin-priority-count { display: grid; place-items: center; min-width: 30px; height: 26px; padding: 0 7px; border-radius: 999px; background: rgba(255,255,255,.055); color: #eaf2ff; font-size: 12px; font-weight: 900; }
      .admin-priority-button.needs-action .admin-priority-count { background: rgba(245,158,11,.16); color: #ffd37a; }
      .admin-priority-button.needs-action { border-color: rgba(245,158,11,.24); }
      .admin-secondary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
      .admin-secondary-button { min-height: 38px; padding: 8px 10px; border: 1px solid rgba(255,255,255,.08); border-radius: 12px; background: rgba(255,255,255,.035); color: #dbe7f7; font-size: 11px; font-weight: 900; text-align: center; }
      .view-mount[data-view="admin"] .admin-fold { border-radius: 16px; }
      .view-mount[data-view="admin"] .admin-fold > summary { min-height: 48px; padding: 12px; }
      .view-mount[data-view="admin"] .admin-fold > summary h2 { font-size: 15px; }
      .view-mount[data-view="admin"] .admin-fold > summary p { font-size: 11px; }
      @media (max-width: 760px) {
        .admin-priority-command { padding: 12px; border-radius: 16px; gap: 10px; }
        .admin-priority-head h2 { font-size: 18px; }
        .admin-priority-head p { display: none; }
        .admin-priority-total { min-width: 42px; height: 42px; font-size: 19px; }
        .admin-priority-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
        .admin-priority-button { min-height: 48px; padding: 8px; gap: 7px; }
        .admin-priority-icon { width: 27px; height: 27px; border-radius: 10px; }
        .admin-priority-copy strong { font-size: 11px; }
        .admin-priority-copy small { font-size: 8.5px; }
        .admin-secondary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
        .admin-secondary-button { min-height: 36px; }
      }
      @media (max-width: 370px) {
        .admin-priority-grid, .admin-secondary-grid { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function countNumber(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number : 0;
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function adminReviewCounts(user) {
    const posts = safeArray(state && state.posts);
    const projects = safeArray(state && state.projects);
    const quotes = safeArray(state && state.quotes);
    const reviews = safeArray(state && state.memberReviews);
    const users = safeArray(state && state.users);
    const secureProfiles = typeof secureAdminProfiles !== 'undefined' ? safeArray(secureAdminProfiles) : [];
    const useSecure = typeof adminProfilesStatus !== 'undefined' && adminProfilesStatus === 'ready';
    const access = useSecure
      ? secureProfiles.filter(function (profile) { return profile.membership_status === 'pending'; }).length
      : safeArray(state && state.applications).filter(function (application) { return !application.example && application.created !== 'Example' && application.status === 'pending'; }).length;
    const postReviews = posts.filter(function (post) { return post.moderationStatus === 'pending' || post.flagged || countNumber(post.reports) > 0; }).length;
    const replyReviews = posts.flatMap(function (post) { return safeArray(post.responses); }).filter(function (reply) { return reply.moderationStatus === 'pending'; }).length;
    const projectReviews = projects.filter(function (project) { return project.moderationStatus === 'pending'; }).length;
    const memberReviews = reviews.filter(function (review) { return review.moderationStatus === 'pending'; }).length;
    const photoReviews = typeof pendingProfilePhotos === 'function' ? pendingProfilePhotos().length : users.filter(function (member) { return member.profilePhotoStatus === 'pending' && member.profilePhotoPendingUrl; }).length;
    const quoteReviews = quotes.filter(function (quote) { return quote.status === 'jp-review'; }).length;
    const moderationQueue = typeof adminModerationQueue !== 'undefined' ? safeArray(adminModerationQueue).filter(function (item) { return item.status === 'Pending Review'; }).length : 0;
    const unread = typeof unreadMessageCount === 'function' ? unreadMessageCount(user) : 0;
    return {
      access: access,
      posts: postReviews,
      replies: replyReviews,
      projects: projectReviews,
      reviews: memberReviews,
      photos: photoReviews,
      quotes: quoteReviews,
      queue: moderationQueue,
      messages: unread,
      total: access + postReviews + replyReviews + projectReviews + memberReviews + photoReviews + quoteReviews + moderationQueue + unread
    };
  }

  function priorityButton(options) {
    const count = countNumber(options.count);
    return '<button class="admin-priority-button ' + (count ? 'needs-action' : '') + '" type="button" data-admin-jump="' + escapeHtml(options.target || '') + '" data-view-link="' + escapeHtml(options.view || '') + '" data-section-title="' + escapeHtml(options.sectionTitle || '') + '">' +
      '<span class="admin-priority-icon" aria-hidden="true">' + options.icon + '</span>' +
      '<span class="admin-priority-copy"><strong>' + escapeHtml(options.title) + '</strong><small>' + escapeHtml(options.detail) + '</small></span>' +
      '<span class="admin-priority-count">' + escapeHtml(count) + '</span>' +
      '</button>';
  }

  function adminPriorityPanel(user) {
    const counts = adminReviewCounts(user);
    return '<section class="admin-priority-command" aria-label="Admin priority navigation">' +
      '<div class="admin-priority-head"><div><p class="eyebrow">Admin Review</p><h2>Moderation command centre</h2><p>Everything needing JP Innovation action is at the top. Tap a button to jump straight to the right queue.</p></div><span class="admin-priority-total" title="Total items needing attention">' + escapeHtml(counts.total) + '</span></div>' +
      '<div class="admin-priority-grid">' +
        priorityButton({ icon: '✓', title: 'Access requests', detail: 'Approve Hub access', count: counts.access, target: 'adminAccessRequests' }) +
        priorityButton({ icon: '✎', title: 'Posts', detail: 'Publish or reject threads', count: counts.posts, target: 'adminPostModeration' }) +
        priorityButton({ icon: '↩', title: 'Replies', detail: 'Approve member replies', count: counts.replies, target: 'adminReplyModeration' }) +
        priorityButton({ icon: '▣', title: 'Projects', detail: 'Review project posts', count: counts.projects, target: 'adminProjectModeration' }) +
        priorityButton({ icon: '★', title: 'Reviews', detail: 'Approve reputation reviews', count: counts.reviews, target: 'adminMemberReviews' }) +
        priorityButton({ icon: '◎', title: 'Profile photos', detail: 'Verify uploaded photos', count: counts.photos, target: 'adminProfilePhotos' }) +
        priorityButton({ icon: '£', title: 'Quotes', detail: 'Review quote requests', count: counts.quotes, target: 'adminQuoteQueue' }) +
        priorityButton({ icon: '✉', title: 'Messages', detail: 'Unread inbox items', count: counts.messages, view: 'messages' }) +
      '</div>' +
      '<div class="admin-secondary-grid">' +
        '<button class="admin-secondary-button" type="button" data-admin-jump="adminModerationQueue">Central queue</button>' +
        '<button class="admin-secondary-button" type="button" data-admin-jump="adminNotificationLog">Notification log</button>' +
        '<button class="admin-secondary-button" type="button" data-admin-jump="adminPresenceView">Online members</button>' +
        '<button class="admin-secondary-button" type="button" data-view-link="metrics">Website metrics</button>' +
        '<button class="admin-secondary-button" type="button" data-section-title="Account management">Manage accounts</button>' +
        '<button class="admin-secondary-button" type="button" data-section-title="Approved Posts">Approved posts</button>' +
      '</div>' +
    '</section>';
  }

  const originalRenderAdminReview = typeof renderAdmin === 'function' ? renderAdmin : null;
  if (originalRenderAdminReview) {
    renderAdmin = function renderAdmin(user) {
      adminReviewStyle();
      const base = originalRenderAdminReview(user);
      if (!user || user.role !== 'admin') return base;
      return adminPriorityPanel(user) + base;
    };
  }

  function openAdminTarget(targetId, sectionTitle) {
    if (sectionTitle) {
      const sections = Array.from(document.querySelectorAll('#viewMount details.admin-fold'));
      const match = sections.find(function (section) {
        const heading = section.querySelector('summary h2');
        return heading && heading.textContent.trim().toLowerCase() === sectionTitle.toLowerCase();
      });
      if (match) {
        match.open = true;
        match.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    if (!targetId) return;
    const target = document.getElementById(targetId);
    if (!target) return;
    if (target.matches('details')) target.open = true;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  document.addEventListener('click', function (event) {
    const shortcut = event.target.closest && event.target.closest('[data-admin-jump], .admin-secondary-button[data-view-link]');
    if (!shortcut) return;
    const view = shortcut.dataset.viewLink;
    if (view) {
      event.preventDefault();
      if (typeof renderView === 'function') renderView(view);
      return;
    }
    const target = shortcut.dataset.adminJump || '';
    const title = shortcut.dataset.sectionTitle || '';
    if (!target && !title) return;
    event.preventDefault();
    openAdminTarget(target, title);
  });

  window.addEventListener('load', function () {
    adminReviewStyle();
    if (typeof currentView !== 'undefined' && currentView === 'admin' && typeof currentUser === 'function' && currentUser() && currentUser().role === 'admin' && typeof renderView === 'function') {
      renderView('admin');
    }
  });
})();
