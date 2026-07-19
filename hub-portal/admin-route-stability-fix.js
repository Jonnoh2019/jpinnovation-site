/* JP Innovation: stable Admin Review route. Loaded last to avoid legacy admin renderer freezes. */
(() => {
  "use strict";

  const VERSION = "admin-route-stability-fix-20260719a";
  const arr = (value) => Array.isArray(value) ? value : [];
  const esc = (value) => typeof escapeHtml === "function"
    ? escapeHtml(value)
    : String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
  const clean = (value) => typeof cleanEmailValue === "function" ? cleanEmailValue(value || "") : String(value || "").trim().toLowerCase();

  function addStyles() {
    if (document.getElementById("adminRouteStabilityFixStyles")) return;
    const style = document.createElement("style");
    style.id = "adminRouteStabilityFixStyles";
    style.textContent = `
      .admin-stable-shell{display:grid;gap:12px}.admin-stable-card{border:1px solid rgba(255,255,255,.1);border-left:3px solid rgba(47,141,255,.85);border-radius:18px;background:linear-gradient(145deg,rgba(12,22,32,.94),rgba(4,8,13,.96));box-shadow:0 18px 36px rgba(0,0,0,.22);padding:14px}.admin-stable-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}.admin-stable-head h2{margin:0;font-size:20px;line-height:1.05;letter-spacing:-.03em}.admin-stable-head p{margin:4px 0 0;color:#aeb8c6;font-size:12px;line-height:1.35}.admin-stable-total{display:grid;place-items:center;min-width:42px;height:42px;padding:0 10px;border-radius:14px;background:rgba(47,141,255,.13);border:1px solid rgba(47,141,255,.28);color:#66b8ff;font-weight:950}.admin-stable-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.admin-stable-button,.admin-stable-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:9px;min-height:48px;padding:9px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.035);color:#fff;text-align:left}.admin-stable-button strong,.admin-stable-row strong{display:block;font-size:12px;line-height:1.15;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.admin-stable-button small,.admin-stable-row small{display:block;margin-top:2px;color:#aeb8c6;font-size:10px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.admin-stable-icon{display:grid;place-items:center;width:30px;height:30px;border-radius:10px;background:rgba(47,141,255,.13);color:#66b8ff;font-weight:950}.admin-stable-count{display:grid;place-items:center;min-width:28px;height:24px;border-radius:999px;background:rgba(255,255,255,.06);font-size:11px;font-weight:950}.admin-stable-button.needs-action .admin-stable-count{background:rgba(245,158,11,.16);color:#ffd37a}.admin-stable-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.admin-stable-actions button{min-height:34px;padding:7px 10px;border-radius:10px;font-size:11px}.admin-stable-details{border:1px solid rgba(255,255,255,.08);border-radius:16px;background:rgba(255,255,255,.025);overflow:hidden}.admin-stable-details>summary{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:44px;padding:10px 12px;cursor:pointer}.admin-stable-details>summary h2{margin:0;font-size:15px}.admin-stable-details>summary p{margin:2px 0 0;color:#aeb8c6;font-size:10.5px}.admin-stable-list{display:grid;gap:8px;padding:0 10px 10px}.admin-stable-empty{padding:10px;border-radius:12px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.16);color:#dffdea;font-size:12px}.admin-stable-profile{display:grid;gap:4px;min-width:0}.admin-stable-profile h3{margin:0;font-size:14px}.admin-stable-profile p{margin:0;color:#aeb8c6;font-size:11px;line-height:1.35;overflow-wrap:anywhere}@media(max-width:760px){.admin-stable-shell{gap:10px}.admin-stable-card{padding:12px;border-radius:16px}.admin-stable-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.admin-stable-button,.admin-stable-row{min-height:45px;padding:8px}.admin-stable-head h2{font-size:18px}.admin-stable-head p{display:none}.admin-stable-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.admin-stable-actions button{width:100%}}@media(max-width:370px){.admin-stable-grid,.admin-stable-actions{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function adminAccounts() {
    if (typeof adminProfilesStatus !== "undefined" && adminProfilesStatus === "ready" && typeof secureAdminProfiles !== "undefined") {
      return arr(secureAdminProfiles).map((profile) => {
        if (typeof secureProfileUser === "function") return secureProfileUser(profile);
        return { id: profile.user_id, email: clean(profile.email), name: profile.full_name || profile.email || "Account", business: profile.business || "", role: profile.account_type || "client", membershipStatus: profile.membership_status || "free", suspended: profile.membership_status === "suspended" || profile.status === "removed", verified: Boolean(profile.vetted_at) || profile.account_type === "admin", warning: Boolean(profile.warning) };
      });
    }
    return arr(state?.users);
  }

  function pendingApplications() {
    if (typeof adminProfilesStatus !== "undefined" && adminProfilesStatus === "ready" && typeof secureAdminProfiles !== "undefined") {
      return arr(secureAdminProfiles).filter((profile) => String(profile.membership_status || "").toLowerCase() === "pending").map((profile) => typeof secureProfileApplication === "function" ? secureProfileApplication(profile) : { id: profile.user_id, userId: profile.user_id, secure: true, status: "pending", fullName: profile.full_name || profile.email || "Applicant", business: profile.business || "", email: clean(profile.email), membershipType: "Innovation Hub" });
    }
    return arr(state?.applications).filter((item) => !item.example && item.created !== "Example" && item.status === "pending");
  }

  function moderationPosts() { return arr(state?.posts).filter((post) => post.moderationStatus === "pending" || post.flagged || Number(post.reports || 0) > 0); }
  function moderationReplies() { return arr(state?.posts).flatMap((post) => arr(post.responses).filter((reply) => reply.moderationStatus === "pending").map((reply) => ({ post, reply }))); }
  function pendingProjects() { return arr(state?.projects).filter((project) => project.moderationStatus === "pending"); }

  function counts(user) {
    const apps = pendingApplications().length, posts = moderationPosts().length, replies = moderationReplies().length, projects = pendingProjects().length;
    const reviews = arr(state?.memberReviews).filter((review) => review.moderationStatus === "pending").length;
    const photos = typeof pendingProfilePhotos === "function" ? pendingProfilePhotos().length : 0;
    const quotes = arr(state?.quotes).filter((quote) => quote.status === "jp-review").length;
    const messages = typeof unreadMessageCount === "function" ? unreadMessageCount(user) : 0;
    return { apps, posts, replies, projects, reviews, photos, quotes, messages, total: apps + posts + replies + projects + reviews + photos + quotes + messages };
  }

  function jumpButton(icon, title, detail, value, target, view = "") {
    const count = Number(value || 0);
    return `<button class="admin-stable-button ${count ? "needs-action" : ""}" type="button" data-admin-jump="${esc(target || "")}" data-view-link="${esc(view)}"><span class="admin-stable-icon" aria-hidden="true">${icon}</span><span><strong>${esc(title)}</strong><small>${esc(detail)}</small></span><span class="admin-stable-count">${esc(value)}</span></button>`;
  }

  function section(id, title, detail, count, body, open = false) {
    return `<details id="${esc(id)}" class="admin-stable-details section-card" ${open ? "open" : ""}><summary><span><h2>${esc(title)}</h2><p>${esc(detail)}</p></span><b class="pill ${Number(count || 0) ? "warn" : "good"}">${esc(count)}</b></summary><div class="admin-stable-list">${body || `<div class="admin-stable-empty">Nothing needs attention here.</div>`}</div></details>`;
  }

  function accountBucket(member) {
    const status = String(member.membershipStatus || member.membership_status || member.status || "").toLowerCase();
    if (member.suspended || status === "suspended" || status === "removed" || member.removedAt || member.removed_at) return "archived";
    if (status === "pending" || member.role === "pending") return "pending";
    return "active";
  }

  function accountRow(member) {
    const email = clean(member.email);
    const role = typeof roleLabel === "function" ? roleLabel(member) : (member.role === "admin" ? "JP Admin" : member.role === "member" ? "Hub Member" : "Client Portal");
    const archived = accountBucket(member) === "archived", isAdmin = member.role === "admin";
    return `<article class="admin-stable-row"><span class="admin-stable-icon" aria-hidden="true">${isAdmin ? "A" : member.role === "member" ? "H" : "C"}</span><span class="admin-stable-profile"><h3>${esc(member.name || "Account")}</h3><p>${esc(role)} · ${esc(member.business || "Independent")} · ${esc(email)}</p></span><span class="admin-stable-count">${member.warning ? "!" : archived ? "Off" : "On"}</span><div class="admin-stable-actions">${member.role === "client" && !archived ? `<button class="primary-button admin-action" data-admin-action="upgrade" data-email="${esc(email)}" type="button">Upgrade</button>` : ""}${member.role === "member" && !archived ? `<button class="secondary-button admin-action" data-admin-action="downgrade" data-email="${esc(email)}" type="button">Move to Client</button>` : ""}${!isAdmin ? `<button class="secondary-button admin-action" data-admin-action="verify" data-email="${esc(email)}" data-user-id="${esc(member.id || "")}" type="button">${member.verified ? "Re-verify" : "Verify"}</button><button class="secondary-button admin-action" data-admin-action="warn" data-email="${esc(email)}" type="button">${member.warning ? "Remove warning" : "Warn"}</button><button class="secondary-button admin-action" data-admin-action="${archived ? "restore" : "suspend"}" data-email="${esc(email)}" type="button">${archived ? "Restore" : "Suspend"}</button><button class="secondary-button danger-action admin-action" data-admin-action="remove" data-email="${esc(email)}" data-member-name="${esc(member.name || "Account")}" type="button">Remove</button>` : ""}</div></article>`;
  }

  function applicationRow(application) {
    return `<article class="admin-stable-row application-card"><span class="admin-stable-icon" aria-hidden="true">✓</span><span class="admin-stable-profile"><h3>${esc(application.fullName || "Unnamed applicant")}</h3><p>${esc(application.business || "Independent")} · ${esc(application.email || "No email")}</p></span><span class="admin-stable-count">New</span><div class="admin-stable-actions"><button class="primary-button application-action" data-application-action="approve" data-id="${esc(application.id)}" type="button">${application.secure ? "Approve Hub" : "Approve"}</button><button class="secondary-button danger-action application-action" data-application-action="reject" data-id="${esc(application.id)}" type="button">Reject</button></div></article>`;
  }

  function postRow(post) {
    return `<article class="admin-stable-row"><span class="admin-stable-icon" aria-hidden="true">P</span><span class="admin-stable-profile"><h3>${esc(post.title || "Post")}</h3><p>${esc(post.author || post.authorEmail || "Member")} · ${esc(post.category || "Discussion")}</p></span><span class="admin-stable-count">Post</span><div class="admin-stable-actions"><button class="primary-button post-moderation-action" data-post-action="approved" data-post-id="${esc(post.id)}" type="button">Approve</button><button class="secondary-button danger-action post-moderation-action" data-post-action="rejected" data-post-id="${esc(post.id)}" type="button">Reject</button></div></article>`;
  }

  function projectRow(project) {
    return `<article class="admin-stable-row"><span class="admin-stable-icon" aria-hidden="true">Pr</span><span class="admin-stable-profile"><h3>${esc(project.title || "Project")}</h3><p>${esc(project.author || project.authorEmail || "Member")} · ${esc(project.category || "Project")}</p></span><span class="admin-stable-count">Project</span><div class="admin-stable-actions"><button class="primary-button project-moderation-action" data-project-action="approved" data-project-id="${esc(project.id)}" type="button">Approve</button><button class="secondary-button danger-action project-moderation-action" data-project-action="rejected" data-project-id="${esc(project.id)}" type="button">Reject</button></div></article>`;
  }

  function renderStableAdmin(user) {
    addStyles();
    if (!user || user.role !== "admin") return `<section class="section-card"><h2>Not available</h2><p class="muted">Admin review is only visible to JP Innovation admins.</p></section>`;
    const c = counts(user), applications = pendingApplications(), accounts = adminAccounts(), posts = moderationPosts(), replies = moderationReplies(), projects = pendingProjects();
    const reviews = arr(state?.memberReviews).filter((review) => review.moderationStatus === "pending"), photos = typeof pendingProfilePhotos === "function" ? pendingProfilePhotos() : [];
    const pendingAccounts = accounts.filter((member) => accountBucket(member) === "pending"), activeAccounts = accounts.filter((member) => accountBucket(member) === "active"), archivedAccounts = accounts.filter((member) => accountBucket(member) === "archived");
    return `<div class="admin-stable-shell"><section class="admin-stable-card"><div class="admin-stable-head"><div><p class="eyebrow">Admin Review</p><h2>Moderation command centre</h2><p>Quick access to everything requiring attention.</p></div><span class="admin-stable-total">${c.total}</span></div><div class="admin-stable-grid">${jumpButton("✓", "Access", "Hub approvals", c.apps, "adminAccessRequests")}${jumpButton("P", "Posts", "Threads to review", c.posts, "adminPostModeration")}${jumpButton("R", "Replies", "Replies to approve", c.replies, "adminReplyModeration")}${jumpButton("Pr", "Projects", "Project reviews", c.projects, "adminProjectModeration")}${jumpButton("★", "Reviews", "Member reviews", c.reviews, "adminMemberReviews")}${jumpButton("◎", "Photos", "Profile photos", c.photos, "adminProfilePhotos")}${jumpButton("£", "Quotes", "Quote requests", c.quotes, "adminQuoteQueue")}${jumpButton("✉", "Messages", "Unread inbox", c.messages, "", "messages")}</div><div class="admin-stable-actions"><button id="refreshAdminProfiles" class="secondary-button" type="button">Refresh registrations</button><button class="secondary-button dashboard-link" data-view-link="metrics" type="button">Website metrics</button><button id="adminEnablePhoneAlerts" class="secondary-button" type="button">Enable phone alerts</button></div></section>${section("adminAccessRequests", "Access applications", "Approve or reject Hub access.", applications.length, applications.map(applicationRow).join(""), applications.length > 0)}${section("adminPostModeration", "Post moderation", "Approve or reject discussion threads.", posts.length, posts.map(postRow).join(""), posts.length > 0)}${section("adminReplyModeration", "Reply moderation", "Member replies awaiting approval.", replies.length, replies.map(({ post, reply }) => `<article class="admin-stable-row"><span class="admin-stable-icon">R</span><span class="admin-stable-profile"><h3>${esc(post.title || "Thread reply")}</h3><p>${esc(reply.author || reply.authorEmail || "Member")} · ${esc(reply.body || "").slice(0, 90)}</p></span><span class="admin-stable-count">Reply</span><div class="admin-stable-actions"><button class="primary-button reply-moderation-action" data-reply-action="approved" data-post-id="${esc(post.id)}" data-reply-id="${esc(reply.id)}" type="button">Approve</button><button class="secondary-button danger-action reply-moderation-action" data-reply-action="rejected" data-post-id="${esc(post.id)}" data-reply-id="${esc(reply.id)}" type="button">Reject</button></div></article>`).join(""), replies.length > 0)}${section("adminProjectModeration", "Project moderation", "Projects waiting for review.", projects.length, projects.map(projectRow).join(""), projects.length > 0)}${section("adminMemberReviews", "Member reviews", "Approve reputation reviews.", reviews.length, reviews.map((review) => `<article class="admin-stable-row"><span class="admin-stable-icon">★</span><span class="admin-stable-profile"><h3>${esc(review.reviewerName || "Review")}</h3><p>${esc(review.comment || "")}</p></span><span class="admin-stable-count">${esc(review.rating || "")}</span><div class="admin-stable-actions"><button class="primary-button review-moderation-action" data-review-action="approved" data-review-id="${esc(review.id)}" type="button">Approve</button><button class="secondary-button danger-action review-moderation-action" data-review-action="rejected" data-review-id="${esc(review.id)}" type="button">Reject</button></div></article>`).join(""), reviews.length > 0)}${section("adminProfilePhotos", "Profile photo approvals", "Photos waiting for approval.", photos.length, photos.map((member) => `<article class="admin-stable-row"><span class="admin-stable-icon">◎</span><span class="admin-stable-profile"><h3>${esc(member.name || "Member")}</h3><p>${esc(member.email || "")}</p></span><span class="admin-stable-count">Photo</span><div class="admin-stable-actions"><button class="primary-button profile-photo-action" data-photo-action="approve" data-email="${esc(member.email)}" type="button">Approve</button><button class="secondary-button danger-action profile-photo-action" data-photo-action="reject" data-email="${esc(member.email)}" type="button">Reject</button></div></article>`).join(""), photos.length > 0)}${section("adminAccountManagement", "Account management", "Pending, active and archived accounts.", accounts.length, `${section("adminPendingAccounts", "Pending accounts", "Waiting for approval.", pendingAccounts.length, pendingAccounts.map(accountRow).join(""), pendingAccounts.length > 0)}${section("adminActiveAccounts", "Active accounts", "Live accounts.", activeAccounts.length, activeAccounts.map(accountRow).join(""), true)}${section("adminArchivedAccounts", "Archived / suspended", "Suspended or removed accounts.", archivedAccounts.length, archivedAccounts.map(accountRow).join(""), archivedAccounts.length > 0)}`, true)}<section class="admin-stable-card"><div class="admin-stable-head"><div><p class="eyebrow">Admin metrics</p><h2>Website analytics</h2><p>Visitor analytics load here without blocking Admin Review.</p></div></div><div id="analyticsPanel"><p class="muted">Loading private site analytics...</p></div></section></div>`;
  }

  function install() {
    addStyles();
    renderAdmin = renderStableAdmin;
    document.documentElement.dataset.jpAdminRouteStabilityFix = VERSION;
    console.info(`[${VERSION}] installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
