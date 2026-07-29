export const ROLES = Object.freeze({
  PUBLIC: "public",
  CLIENT: "client",
  HUB_MEMBER: "hub_member",
  ADMIN: "admin"
});

export const ACCOUNT_STATUS = Object.freeze({
  PENDING: "pending",
  ACTIVE: "active",
  SUSPENDED: "suspended",
  ARCHIVED: "archived"
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.PUBLIC]: "Public",
  [ROLES.CLIENT]: "Client Portal",
  [ROLES.HUB_MEMBER]: "Hub Member",
  [ROLES.ADMIN]: "Admin"
});

const ACCESS = Object.freeze({
  public: [ROLES.PUBLIC, ROLES.CLIENT, ROLES.HUB_MEMBER, ROLES.ADMIN],
  authenticated: [ROLES.CLIENT, ROLES.HUB_MEMBER, ROLES.ADMIN],
  client: [ROLES.CLIENT, ROLES.HUB_MEMBER, ROLES.ADMIN],
  hub: [ROLES.HUB_MEMBER, ROLES.ADMIN],
  admin: [ROLES.ADMIN]
});

export function normalizeRole(profile = {}) {
  const raw = String(profile.role || profile.account_type || "").toLowerCase();
  if (raw === "admin") return ROLES.ADMIN;
  if (["hub_member", "hub", "member", "paid"].includes(raw)) return ROLES.HUB_MEMBER;
  if (["client", "portal", "free"].includes(raw)) return ROLES.CLIENT;
  return ROLES.PUBLIC;
}

export function canAccess(profile, requirement = "public") {
  if (profile?.account_status === ACCOUNT_STATUS.SUSPENDED) return false;
  return (ACCESS[requirement] || ACCESS.public).includes(normalizeRole(profile));
}

export function homeRouteFor(profile) {
  const role = normalizeRole(profile);
  if (role === ROLES.ADMIN) return "/app/admin";
  if (role === ROLES.HUB_MEMBER) return "/app/hub/dashboard";
  if (role === ROLES.CLIENT) return "/app/client/dashboard";
  return "/";
}

export function profileMenuItems(profile) {
  const role = normalizeRole(profile);
  const common = [
    { label: "My profile", icon: "user", route: "/app/profile" },
    { label: "Notifications", icon: "bell", route: "/app/notifications" },
    { label: "My messages", icon: "mail", route: role === ROLES.CLIENT ? "/app/client/messages" : "/app/hub/messages" },
    { label: "Account settings", icon: "settings", route: "/app/settings" }
  ];
  return role === ROLES.ADMIN
    ? [
        { label: "Admin review", icon: "shield", route: "/app/admin", priority: true },
        { label: "Website metrics", icon: "chart", route: "/app/admin/analytics", priority: true },
        ...common
      ]
    : common;
}
