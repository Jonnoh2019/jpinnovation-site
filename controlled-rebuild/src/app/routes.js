export const ROUTES = Object.freeze([
  { path: "/", title: "JP Innovation", area: "public", access: "public" },
  { path: "/client", title: "Client Portal", area: "public", access: "public" },
  { path: "/hub", title: "Innovation Hub", area: "public", access: "public" },
  { path: "/app/client/dashboard", title: "Client Dashboard", area: "client", access: "client" },
  { path: "/app/client/quotes", title: "My Quotes", area: "client", access: "client" },
  { path: "/app/client/projects", title: "My Projects", area: "client", access: "client" },
  { path: "/app/client/messages", title: "Messages", area: "client", access: "client" },
  { path: "/app/hub/dashboard", title: "Dashboard", area: "hub", access: "hub" },
  { path: "/app/hub/discussions", title: "Engineering Discussions", area: "hub", access: "hub" },
  { path: "/app/hub/projects", title: "Projects", area: "hub", access: "hub" },
  { path: "/app/hub/quotes", title: "Quotes", area: "hub", access: "hub" },
  { path: "/app/hub/messages", title: "Messages", area: "hub", access: "hub" },
  { path: "/app/hub/directory", title: "Member Directory", area: "hub", access: "hub" },
  { path: "/app/hub/resources", title: "Resources & Tools", area: "hub", access: "hub" },
  { path: "/app/hub/events", title: "Events", area: "hub", access: "hub" },
  { path: "/app/admin", title: "Admin Review", area: "admin", access: "admin" },
  { path: "/app/admin/accounts", title: "Account Management", area: "admin", access: "admin" },
  { path: "/app/admin/approvals", title: "Approvals", area: "admin", access: "admin" },
  { path: "/app/admin/moderation", title: "Moderation", area: "admin", access: "admin" },
  { path: "/app/admin/analytics", title: "Website Metrics", area: "admin", access: "admin" },
  { path: "/app/admin/notifications", title: "Admin Notifications", area: "admin", access: "admin" },
  { path: "/app/profile", title: "My Profile", area: "shared", access: "authenticated" },
  { path: "/app/notifications", title: "Notifications", area: "shared", access: "authenticated" },
  { path: "/app/settings", title: "Account Settings", area: "shared", access: "authenticated" }
]);

export function findRoute(pathname) {
  return ROUTES.find((route) => route.path === pathname) || null;
}
