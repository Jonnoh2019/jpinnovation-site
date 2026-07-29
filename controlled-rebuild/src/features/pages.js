import { normalizeRole, ROLES } from "../auth/permissions.js";

const cards = {
  admin: [
    ["Pending approvals", "Review access, profile photos and moderated content.", "/app/admin/approvals"],
    ["Account management", "Manage active, pending and suspended accounts.", "/app/admin/accounts"],
    ["Website metrics", "Visits, registrations and Hub activity.", "/app/admin/analytics"],
    ["Moderation", "Posts, replies, reports and reviews.", "/app/admin/moderation"]
  ],
  hub: [
    ["Engineering discussions", "Open boards and recent threads.", "/app/hub/discussions"],
    ["Projects", "Active engineering workspaces.", "/app/hub/projects"],
    ["Member directory", "Find verified engineering members.", "/app/hub/directory"],
    ["Resources & tools", "Calculators, templates and shared files.", "/app/hub/resources"]
  ],
  client: [
    ["Quotes", "Request, review and respond to quotations.", "/app/client/quotes"],
    ["Projects", "Track progress and next actions.", "/app/client/projects"],
    ["Messages", "Keep project communication together.", "/app/client/messages"]
  ]
};

export function pageMarkup(route, profile) {
  if (route.area === "admin" && route.path === "/app/admin") return dashboard("Admin control centre", cards.admin);
  if (route.area === "hub" && route.path.endsWith("/dashboard")) return dashboard(`Welcome back, ${firstName(profile)}`, cards.hub);
  if (route.area === "client" && route.path.endsWith("/dashboard")) return dashboard(`Welcome back, ${firstName(profile)}`, cards.client);
  if (route.area === "public") return publicPage(route);
  return `
    <section class="content-card">
      <div class="content-card__heading">
        <span>${route.area === "admin" ? "Admin" : "Workspace"}</span>
        <h2>${route.title}</h2>
      </div>
      <div class="empty-state">
        <strong>${route.title}</strong>
        <p>This route is connected to the new shell and is ready for its feature migration.</p>
      </div>
    </section>`;
}

function dashboard(title, items) {
  return `
    <section class="overview-card">
      <span class="eyebrow">Secure workspace</span>
      <h2>${title}</h2>
      <p>One reliable view of the tasks and tools available to this account.</p>
    </section>
    <section class="action-grid">
      ${items.map(([label, description, route]) => `
        <a class="action-card" href="${route}" data-route="${route}">
          <strong>${label}</strong><span>${description}</span><b aria-hidden="true">›</b>
        </a>`).join("")}
    </section>`;
}

function publicPage(route) {
  const title = route.path === "/client" ? "Client Portal" : route.path === "/hub" ? "Innovation Hub" : "Engineering solutions";
  return `<section class="overview-card"><span class="eyebrow">JP Innovation</span><h2>${title}</h2><p>The public experience will be migrated after the authenticated foundation passes its navigation tests.</p></section>`;
}

function firstName(profile) {
  return String(profile.full_name || profile.name || "Member").trim().split(/\s+/)[0];
}
